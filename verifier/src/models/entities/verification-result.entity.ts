import { jsonb, pgTable, timestamp, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";
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

export type VerificationResult = {
  provingResult?: ProvingResult;
  exception?: JsonZcredException;
  session: {
    id: string;
    subject: {
      id: Identifier;
    };
    client: {
      id: Identifier;
    }
    webhookURL?: string;
    redirectURL: string;
    issuer: {
      type: string;
      uri: string;
      accessToken?: string;
    };
    jalId: string;
  };
}

export const VerificationStatus = pgEnum('verification_result_status_enum', ["success", "exception"])

export const VerificationResultEntity = pgTable("verification_result", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: VerificationStatus("status").notNull(),
  data: jsonb("data").$type<VerificationResult>().notNull(),
  // owner stringify ZCIP-2 identifier
  clientId: varchar("client_id", { length: 256 }).notNull(),
  // stringify ZCIP-2 identifier
  subjectId: varchar("subject_id", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .defaultNow()
    .notNull(),
  jalId: varchar("jal_id", { length: 64 })
    .notNull()
    .references(() => JalEntity.id)
});

export type VerificationResultEntity = typeof VerificationResultEntity.$inferSelect;
export type VerificationResultEntityNew = typeof VerificationResultEntity.$inferInsert;