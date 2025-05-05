import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: text().notNull(),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow(),
});
