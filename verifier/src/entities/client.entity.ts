import { jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const ClientEntity = pgTable("client", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Client subject id according ZCIP-2 */
  subjectId: varchar("subject_id", { length: 300 }).unique().notNull(),
  /** Map [AccessToken => URL for redirection]*/
  tokenMap: jsonb("token_map")
    .$type<{ [key: string]: string | undefined }>()
    .notNull()
    .default({})
});

export type ClientEntity = typeof ClientEntity.$inferSelect;
export type ClientEntityNew = typeof ClientEntity.$inferInsert;