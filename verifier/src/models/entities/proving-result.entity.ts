import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { JalEntity } from "./jal.entity.js";

type Json = string | boolean | number | null | { [key: string]: Json }

export const ProvingResultEntity = pgTable("proving_result", {
  id: uuid("id").defaultRandom().primaryKey(),
  result: jsonb("result").$type<Json>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  jalId:  varchar("jal_id", { length: 64 })
    .notNull()
    .references(() => JalEntity.id)
});

export type ProvingResultEntity = typeof ProvingResultEntity.$inferSelect;
export type ProvingResultNew = typeof ProvingResultEntity.$inferInsert;