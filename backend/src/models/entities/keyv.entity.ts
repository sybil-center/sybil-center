import { pgTable, text, varchar } from "drizzle-orm/pg-core";

export const KeyvEntity = pgTable("keyv", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value")
});
