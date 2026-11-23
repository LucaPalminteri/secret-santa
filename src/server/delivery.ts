import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { assignments, participants } from "@/db/schema";
import { ownedExchange, prepareDraw, readExchange, STALE_DELIVERY_MS } from "./exchanges";
import { DeliveryError, sendEmail } from "./mail";
import { AppError } from "./errors";

export const MAX_DELIVERY_ATTEMPTS = 5;

// Deliver one email per request so slow SMTP cannot turn a large draw into a
// long-running request. Each attempt has a durable, exclusive claim.
export async function deliverNext(owner: string, id: string, revision: number, retry: "failed" | "unknown" | null = null) {
  await prepareDraw(owner, id, revision);
  const db = getDb();
  const claim = await db.transaction(async (tx) => {
    const exchange = await ownedExchange(tx, owner, id);
    if (exchange.completedAt) throw new AppError("Esta lista ya está finalizada.", 409);
    await tx.update(assignments).set({ deliveryStatus: "unknown" }).where(and(
      eq(assignments.exchangeId, id), eq(assignments.deliveryStatus, "sending"), lt(assignments.startedAt, new Date(Date.now() - STALE_DELIVERY_MS)),
    ));
    if (retry) await tx.update(assignments).set({ deliveryStatus: "pending", claimId: null }).where(and(
      eq(assignments.exchangeId, id), inArray(assignments.deliveryStatus, [retry]), lt(assignments.attempts, MAX_DELIVERY_ATTEMPTS),
    ));
    const [next] = await tx.select().from(assignments).where(and(eq(assignments.exchangeId, id), eq(assignments.deliveryStatus, "pending")))
      .orderBy(asc(assignments.id)).limit(1).for("update");
    if (!next) return null;
    const claimId = randomUUID();
    await tx.update(assignments).set({ deliveryStatus: "sending", claimId, startedAt: new Date(), attempts: sql`${assignments.attempts} + 1` }).where(eq(assignments.id, next.id));
    const people = await tx.select().from(participants).where(eq(participants.exchangeId, id)).orderBy(asc(participants.position));
    return { ...next, claimId, people, exchange };
  });
  if (claim) {
    const santa = claim.people.find((person) => person.id === claim.santaId)!;
    const recipient = claim.people.find((person) => person.id === claim.recipientId)!;
    let status: "sent" | "failed" | "unknown" = "sent";
    try {
      // A stable Message-ID helps providers recognize retries, but SMTP does not
      // guarantee exactly-once delivery. Unknown outcomes require explicit retry.
      await sendEmail(santa.email, santa.name, recipient.name, claim.people, claim.exchange.listName,
        claim.exchange.giftAmount === null ? undefined : Number(claim.exchange.giftAmount), `<${claim.id}@secret-santa.invalid>`);
    } catch (error) {
      status = error instanceof DeliveryError && !error.uncertain ? "failed" : "unknown";
    }
    // If this acknowledgment fails, leave 'sending' in the database. It becomes
    // 'unknown' after the lease expires; never automatically resend it.
    await db.update(assignments).set({ deliveryStatus: status, sentAt: status === "sent" ? new Date() : null })
      .where(and(eq(assignments.id, claim.id), eq(assignments.claimId, claim.claimId), eq(assignments.deliveryStatus, "sending")));
  }
  return readExchange(owner, id);
}
