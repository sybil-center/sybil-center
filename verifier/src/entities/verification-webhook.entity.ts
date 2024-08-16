import { boolean, pgEnum, pgTable, smallint, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { VerificationResultEntity } from "./verification-result.entity.js";

export const VERIFICATION_WEBHOOK_STATUS_ENUM = pgEnum("webhook_status_enum", ["success", "fail", "process"]);

export const VerificationWebhookEntity = pgTable("verification_webhook", {
  id: uuid("id").defaultRandom().primaryKey(),
  verificationResultId: uuid("verification_result_id")
    .notNull()
    .references(() => VerificationResultEntity.id),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  url: varchar("url", { length: 400 }).notNull(),
  isLock: boolean("is_lock").default(false).notNull(),
  clientId: varchar("client_id", { length: 400 }).notNull(),
  status: VERIFICATION_WEBHOOK_STATUS_ENUM("status"),
  attempt: smallint("attempt").default(0).notNull()
});

export type VerificationWebhookEntity = typeof VerificationWebhookEntity.$inferSelect;
export type VerificationWebhookEntityNew = typeof VerificationWebhookEntity.$inferInsert;