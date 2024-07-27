import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { JalEntity } from "./jal.entity.js";
import { Identifier, JsonZcredException } from "@zcredjs/core";

type ProvingResult = {
  message: string;
  signature: string;
  proof: string;
  publicInput?: Record<string, any>
  publicOutput?: Record<string, any>
  verificationKey?: string;
}

type VerificationResultData = {
  provingResult?: ProvingResult;
  session: {
    subject: {
      id: Identifier;
    }
    client: {
      session: string;
      siwe: {
        signature: string;
        message: string;
      }
    }
    webhookURL?: string;
    redirectURL: string;
    issuer: {
      type: string;
      uri: string;
      accessToken?: string;
    }
  } & { [key: string]: unknown };
  exception?: JsonZcredException;
}

export const VerificationResultEntity = pgTable("verification_result", {
  id: uuid("id").defaultRandom().primaryKey(),
  data: jsonb("data").$type<VerificationResultData>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  jalId: varchar("jal_id", { length: 64 })
    .notNull()
    .references(() => JalEntity.id)
});

export type VerificationResultEntity = typeof VerificationResultEntity.$inferSelect;
export type VerificationResultEntityNew = typeof VerificationResultEntity.$inferSelect;