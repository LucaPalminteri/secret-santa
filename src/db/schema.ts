import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const guestSessions = pgTable("guest_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Store a SHA-256 hash, never the raw session secret from the browser cookie.
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("guest_sessions_expires_at_idx").on(table.expiresAt),
]);

export const exchanges = pgTable("exchanges", {
  id: uuid("id").defaultRandom().primaryKey(),
  guestSessionId: uuid("guest_session_id").notNull()
    .references(() => guestSessions.id, { onDelete: "cascade" }),
  listName: text("list_name").notNull().default(""),
  // PostgreSQL numeric is returned as a string to preserve decimal precision.
  giftAmount: numeric("gift_amount", { precision: 12, scale: 2 }),
  status: text("status").$type<"draft" | "drawn">().notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("exchanges_guest_session_id_idx").on(table.guestSessionId),
  check("exchanges_gift_amount_nonnegative", sql`${table.giftAmount} >= 0`),
  check("exchanges_status_valid", sql`${table.status} in ('draft', 'drawn')`),
]);

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  exchangeId: uuid("exchange_id").notNull()
    .references(() => exchanges.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("participants_exchange_email_idx").on(table.exchangeId, sql`lower(${table.email})`),
  check("participants_name_not_blank", sql`length(trim(${table.name})) > 0`),
  check("participants_email_not_blank", sql`length(trim(${table.email})) > 0`),
]);
