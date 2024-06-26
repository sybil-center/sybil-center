import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const EthSybilEntity = pgTable("sybil", {
  id: uuid("id").defaultRandom().primaryKey(),
  sybilId: varchar("sybil_id", { length: 42 }).notNull(),
  address: varchar("address", { length: 42 }).notNull().unique(),
  signature: varchar("signature", { length: 132 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
});

export type EthSybilEntity = typeof EthSybilEntity.$inferSelect;
export type EthSybilEntityNew = typeof EthSybilEntity.$inferInsert;