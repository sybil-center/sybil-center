import { JalEntity } from "./jal.entity.js";
import { pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";

export const JalCommentEntity = pgTable("jal_comment", {
  comment: varchar("comment", { length: 400 }).notNull(),
  subjectId: varchar("subject_id", { length: 300 }).notNull(),
  jalId: varchar("jal_id", { length: 64 })
    .notNull()
    .references(() => JalEntity.id)
}, (table) => {
  return {
    pk: primaryKey({
      columns: [table.subjectId, table.jalId]
    })
  };
});

export type JalCommentEntity = typeof JalCommentEntity.$inferSelect;
export type JalCommentEntityNew = typeof JalCommentEntity.$inferInsert;