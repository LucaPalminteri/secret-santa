import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { guestSessions } from "@/db/schema";
import { AppError } from "./errors";

export const SESSION_COOKIE = "secret-santa-session";
const LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

export async function getGuestSession(create = false) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new AppError("La sesión venció. Vuelve a empezar.", 401);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [session] = await getDb().select().from(guestSessions).where(and(
      eq(guestSessions.tokenHash, tokenHash), gt(guestSessions.expiresAt, new Date()),
    ));
    if (!session) throw new AppError("La sesión venció. Vuelve a empezar.", 401);
    return session;
  }
  if (!create) return null;
  const secret = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + LIFETIME_MS);
  const [session] = await getDb().insert(guestSessions).values({
    tokenHash: createHash("sha256").update(secret).digest("hex"), expiresAt,
  }).returning();
  store.set(SESSION_COOKIE, secret, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
  return session;
}
