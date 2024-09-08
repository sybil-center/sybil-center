import { jsonb, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { type JalProgram } from "@jaljs/core";

export const JalEntity = pgTable("jal", {
  id: varchar("id", { length: 64 }).primaryKey(),
  program: jsonb("program").$type<JalProgram>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
});

export type JalEntity = typeof JalEntity.$inferSelect;
export type JalEntityNew = typeof JalEntity.$inferInsert;