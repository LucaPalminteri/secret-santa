import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { assignments, exchanges, guestSessions, participants } from "@/db/schema";
import { AppError } from "./errors";
import { createAssignments } from "./draw";
import type { DeliverySummary, DraftInput, ExchangeData } from "./validation";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export const STALE_DELIVERY_MS = 2 * 60 * 1000;

export async function ownedExchange(tx: Transaction, owner: string, id: string) {
  const [exchange] = await tx.select().from(exchanges).where(and(eq(exchanges.id, id), eq(exchanges.guestSessionId, owner))).for("update");
  if (!exchange) throw new AppError("No se encontró la lista.", 404);
  return exchange;
}

export async function readExchange(owner: string, id?: string): Promise<ExchangeData | null> {
  const db = getDb();
  const [exchange] = await db.select().from(exchanges).where(and(
    eq(exchanges.guestSessionId, owner), id ? eq(exchanges.id, id) : isNull(exchanges.completedAt),
  )).limit(1);
  if (!exchange) return null;
  const people = await db.select({ id: participants.id, name: participants.name, email: participants.email })
    .from(participants).where(eq(participants.exchangeId, exchange.id)).orderBy(asc(participants.position));
  const deliveries = await db.select().from(assignments).where(eq(assignments.exchangeId, exchange.id));
  const delivery: DeliverySummary = { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 };
  for (const item of deliveries) {
    const stale = item.deliveryStatus === "sending" && item.startedAt && item.startedAt.getTime() < Date.now() - STALE_DELIVERY_MS;
    delivery[stale ? "unknown" : item.deliveryStatus]++;
  }
  return { id: exchange.id, revision: exchange.revision, status: exchange.status, listName: exchange.listName,
    giftAmount: exchange.giftAmount === null ? undefined : Number(exchange.giftAmount), participants: people, delivery };
}

export async function saveDraft(owner: string, input: DraftInput) {
  const db = getDb();
  await db.transaction(async (tx) => {
    // Serialize initial creation so parallel tabs cannot create competing active lists.
    await tx.select().from(guestSessions).where(eq(guestSessions.id, owner)).for("update");
    const [active] = await tx.select().from(exchanges).where(and(eq(exchanges.guestSessionId, owner), isNull(exchanges.completedAt))).for("update");
    if (active && active.id !== input.id) throw new AppError("Ya tienes una lista activa. Recarga para abrirla.", 409);
    if (active) {
      if (active.status !== "draft") throw new AppError("El sorteo ya está guardado y no se puede editar.", 409);
      // A retry after a lost response must not create a second save or bump revision.
      if (active.lastSaveKey === input.saveKey) return;
      if (active.revision !== input.revision) throw new AppError("La lista cambió en otra pestaña. Recarga antes de editar.", 409);
      await tx.update(exchanges).set({ listName: input.listName, giftAmount: input.giftAmount, revision: sql`${exchanges.revision} + 1`, lastSaveKey: input.saveKey }).where(eq(exchanges.id, input.id));
      await tx.delete(participants).where(eq(participants.exchangeId, input.id));
    } else {
      if (input.revision !== 0) throw new AppError("No se encontró la lista. Recarga para continuar.", 404);
      // Ignore no conflicts silently: reused IDs must never update someone else's data.
      const inserted = await tx.insert(exchanges).values({ id: input.id, guestSessionId: owner, listName: input.listName, giftAmount: input.giftAmount, revision: 1, lastSaveKey: input.saveKey }).onConflictDoNothing().returning();
      if (!inserted.length) throw new AppError("No se encontró la lista.", 404);
    }
    if (input.participants.length) await tx.insert(participants).values(input.participants.map((person, position) => ({ ...person, exchangeId: input.id, position })));
  });
  return readExchange(owner, input.id);
}

export async function prepareDraw(owner: string, id: string, revision: number) {
  await getDb().transaction(async (tx) => {
    const exchange = await ownedExchange(tx, owner, id);
    if (exchange.completedAt) throw new AppError("Esta lista ya está finalizada.", 409);
    if (exchange.status === "drawn") return;
    if (exchange.revision !== revision) throw new AppError("La lista cambió. Recarga antes de sortear.", 409);
    const people = await tx.select().from(participants).where(eq(participants.exchangeId, id)).orderBy(asc(participants.position));
    if (people.length < 3) throw new AppError("Se necesitan al menos 3 participantes para hacer el sorteo.");
    const pairs = createAssignments(people);
    await tx.insert(assignments).values(pairs.map(({ santa, recipient }) => ({ exchangeId: id, santaId: santa.id, recipientId: recipient.id })));
    await tx.update(exchanges).set({ status: "drawn", revision: sql`${exchanges.revision} + 1` }).where(eq(exchanges.id, id));
  });
}

export async function finishExchange(owner: string, id: string, discard = false, archive = false) {
  await getDb().transaction(async (tx) => {
    const exchange = await ownedExchange(tx, owner, id);
    if (discard) {
      if (exchange.status !== "draft") throw new AppError("Un sorteo guardado no se puede descartar.", 409);
      await tx.delete(exchanges).where(eq(exchanges.id, id));
      return;
    }
    if (archive) {
      if (exchange.status !== "drawn") throw new AppError("Todavía no se realizó el sorteo.", 409);
      // Preserve the draw and delivery history while allowing a new exchange.
      await tx.update(exchanges).set({ completedAt: new Date() }).where(eq(exchanges.id, id));
      return;
    }
    const rows = await tx.select().from(assignments).where(eq(assignments.exchangeId, id));
    if (!rows.length || rows.some((row) => row.deliveryStatus !== "sent")) throw new AppError("Todavía hay correos pendientes.", 409);
    await tx.update(exchanges).set({ completedAt: new Date() }).where(eq(exchanges.id, id));
  });
}
