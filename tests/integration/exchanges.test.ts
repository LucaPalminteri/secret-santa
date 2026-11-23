import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

const { sendEmail, jar, setCookie } = vi.hoisted(() => ({ sendEmail: vi.fn(), jar: new Map<string, string>(), setCookie: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => jar.has(name) ? { value: jar.get(name) } : undefined,
  set: (name: string, value: string, options: unknown) => { jar.set(name, value); setCookie(name, value, options); },
}) }));
vi.mock("../../src/server/mail", () => ({ sendEmail, DeliveryError: class DeliveryError extends Error { constructor(public uncertain: boolean) { super("SMTP failure"); } } }));

import { getDb } from "../../src/db";
import { assignments, exchanges, guestSessions, participants } from "../../src/db/schema";
import { finishExchange, prepareDraw, readExchange, saveDraft } from "../../src/server/exchanges";
import { deliverNext, MAX_DELIVERY_ATTEMPTS } from "../../src/server/delivery";
import { DeliveryError } from "../../src/server/mail";
import { getGuestSession, SESSION_COOKIE } from "../../src/server/session";
import { draftInput } from "../../src/server/validation";

if (!process.env.TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Isolated TEST_DATABASE_URL required.");
const owners: string[] = [];
async function owner() {
  const [row] = await getDb().insert(guestSessions).values({ tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) }).returning();
  owners.push(row.id); return row.id;
}
function input() {
  return draftInput({ id: randomUUID(), saveKey: randomUUID(), revision: 0, listName: "Test", giftAmount: 0,
    participants: ["A", "B", "C"].map((name) => ({ id: randomUUID(), name, email: `${name.toLowerCase()}@example.invalid` })) });
}
beforeEach(() => { sendEmail.mockReset().mockResolvedValue(undefined); jar.clear(); setCookie.mockClear(); });
afterAll(async () => {
  if (owners.length) await getDb().delete(guestSessions).where(inArray(guestSessions.id, owners));
  const databaseGlobal = globalThis as typeof globalThis & { secretSantaPool?: { end: () => Promise<void> } };
  await databaseGlobal.secretSantaPool?.end();
  delete databaseGlobal.secretSantaPool;
});

describe("anonymous sessions and draft persistence", () => {
  it("does not create a session on a first visit; stores only a hash when creating", async () => {
    expect(await getGuestSession()).toBeNull();
    const session = (await getGuestSession(true))!; owners.push(session.id);
    const secret = jar.get(SESSION_COOKIE)!;
    expect(session.tokenHash).toBe(createHash("sha256").update(secret).digest("hex"));
    expect(session.tokenHash).not.toBe(secret);
    expect(setCookie).toHaveBeenCalledWith(SESSION_COOKIE, secret, expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
    expect((await getGuestSession())?.id).toBe(session.id);
    await getDb().update(guestSessions).set({ expiresAt: new Date(0) }).where(eq(guestSessions.id, session.id));
    await expect(getGuestSession()).rejects.toMatchObject({ status: 401 });
  });
  it("rejects fabricated cookies", async () => {
    jar.set(SESSION_COOKIE, "f".repeat(64));
    await expect(getGuestSession(true)).rejects.toMatchObject({ status: 401 });
  });
  it("saves ordered participants and zero budget; retries the same save once", async () => {
    const user = await owner(); const data = input();
    const saved = await saveDraft(user, data);
    expect(saved).toMatchObject({ revision: 1, giftAmount: 0, participants: data.participants });
    expect(await saveDraft(user, data)).toEqual(saved);
    expect(await readExchange(await owner(), data.id)).toBeNull();
  });
  it("rejects stale saves and competing tabs without deleting the latest data", async () => {
    const user = await owner(); const data = input();
    await saveDraft(user, data);
    await expect(saveDraft(user, { ...data, saveKey: randomUUID(), listName: "Stale" })).rejects.toMatchObject({ status: 409 });
    await expect(saveDraft(user, input())).rejects.toMatchObject({ status: 409 });
    expect((await readExchange(user))?.listName).toBe("Test");
  });
  it("prevents cross-owner mutation, drawing, and deletion", async () => {
    const first = await owner(); const other = await owner(); const data = input();
    await saveDraft(first, data);
    await expect(saveDraft(other, { ...data, revision: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(prepareDraw(other, data.id, 1)).rejects.toMatchObject({ status: 404 });
    await expect(finishExchange(other, data.id, true)).rejects.toMatchObject({ status: 404 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("discards only the owned draft and its participants", async () => {
    const user = await owner(); const data = input(); await saveDraft(user, data);
    await finishExchange(user, data.id, true);
    expect(await readExchange(user)).toBeNull();
    expect(await getDb().select().from(participants).where(eq(participants.exchangeId, data.id))).toHaveLength(0);
  });
});

describe("persistent draws and email retries", () => {
  it("can close an undeliverable draw without deleting history or sending more mail", async () => {
    const user = await owner(); const data = input(); await saveDraft(user, data);
    await prepareDraw(user, data.id, 1);
    await finishExchange(user, data.id, false, true);
    expect(await readExchange(user)).toBeNull();
    expect(await getDb().select().from(assignments).where(eq(assignments.exchangeId, data.id))).toHaveLength(3);
    await expect(deliverNext(user, data.id, 1)).rejects.toMatchObject({ status: 409 });
    expect(sendEmail).not.toHaveBeenCalled();
    await expect(saveDraft(user, input())).resolves.not.toBeNull();
  });
  it("freezes one draw across parallel requests and retries only rejected emails", async () => {
    const user = await owner(); const data = input(); await saveDraft(user, data);
    await Promise.all([prepareDraw(user, data.id, 1), prepareDraw(user, data.id, 1)]);
    const original = await getDb().select().from(assignments).where(eq(assignments.exchangeId, data.id));
    expect(original).toHaveLength(3);
    sendEmail.mockRejectedValueOnce(new DeliveryError(false));
    for (let i = 0; i < 3; i++) await deliverNext(user, data.id, 1);
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect((await readExchange(user))?.delivery).toMatchObject({ sent: 2, failed: 1 });
    await expect(saveDraft(user, { ...data, revision: 2, saveKey: randomUUID() })).rejects.toMatchObject({ status: 409 });
    await expect(finishExchange(user, data.id)).rejects.toMatchObject({ status: 409 });
    const sent = await deliverNext(user, data.id, 1, "failed");
    expect(sent?.delivery.sent).toBe(3);
    expect(sendEmail).toHaveBeenCalledTimes(4);
    expect(sendEmail.mock.calls[3]).toEqual(sendEmail.mock.calls[0]);
    await deliverNext(user, data.id, 1);
    expect(sendEmail).toHaveBeenCalledTimes(4);
    const after = await getDb().select().from(assignments).where(eq(assignments.exchangeId, data.id));
    expect(after.map((a) => [a.id, a.santaId, a.recipientId])).toEqual(original.map((a) => [a.id, a.santaId, a.recipientId]));
    await finishExchange(user, data.id);
    expect(await readExchange(user)).toBeNull();
    expect((await getDb().select().from(exchanges).where(eq(exchanges.id, data.id)))[0].completedAt).not.toBeNull();
  });
  it("claims each pending email once under concurrent sends", async () => {
    const user = await owner(); const data = input(); await saveDraft(user, data);
    await Promise.all(Array.from({ length: 5 }, () => deliverNext(user, data.id, 1)));
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect(new Set(sendEmail.mock.calls.map((call) => call[0])).size).toBe(3);
  });
  it("does not automatically retry uncertain outcomes or stale in-flight sends", async () => {
    const user = await owner(); const data = input(); await saveDraft(user, data);
    sendEmail.mockRejectedValueOnce(new DeliveryError(true));
    for (let i = 0; i < 3; i++) await deliverNext(user, data.id, 1);
    await deliverNext(user, data.id, 1, "failed");
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect((await readExchange(user))?.delivery.unknown).toBe(1);
    const [row] = await getDb().select().from(assignments).where(and(eq(assignments.exchangeId, data.id), eq(assignments.deliveryStatus, "unknown")));
    await getDb().update(assignments).set({ deliveryStatus: "sending", startedAt: new Date(0) }).where(eq(assignments.id, row.id));
    await deliverNext(user, data.id, 1);
    expect(sendEmail).toHaveBeenCalledTimes(3);
    await deliverNext(user, data.id, 1, "unknown");
    expect(sendEmail).toHaveBeenCalledTimes(4);
  });
  it("caps repeated delivery attempts", async () => {
    const user = await owner(); const data = input(); await saveDraft(user, data);
    sendEmail.mockRejectedValue(new DeliveryError(false));
    for (let i = 0; i < 3; i++) await deliverNext(user, data.id, 1);
    for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
      await deliverNext(user, data.id, 1, "failed");
      await deliverNext(user, data.id, 1); await deliverNext(user, data.id, 1);
    }
    expect(sendEmail).toHaveBeenCalledTimes(3 * MAX_DELIVERY_ATTEMPTS);
  });
});
