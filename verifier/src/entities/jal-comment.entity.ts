import { JalEntity } from "./jal.entity.js";
import { pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";

export const JalCommentEntity = pgTable("jal_comment", {
    comment: varchar("comment", { length: 400 }).notNull(),
    /** stringify ZCIP-2 identifier e.g. 'ethereum:address:0x123...345' */
    clientId: varchar("client_id", { length: 300 }).notNull(),
    jalId: varchar("jal_id", { length: 64 })
      .notNull()
      .references(() => JalEntity.id)
  }, (table) => {
    return {
      pk: primaryKey({
        columns: [table.clientId, table.jalId]
      })
    };
  }
);

export type JalCommentEntity = typeof JalCommentEntity.$inferSelect;
export type JalCommentEntityNew = typeof JalCommentEntity.$inferInsert;