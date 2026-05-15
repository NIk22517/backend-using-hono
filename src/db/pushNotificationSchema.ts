import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./userSchema";

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull(),
    device_id: text("device_id").notNull(),
    platform: text("platform", { enum: ["ios", "android"] }).notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("device_user_idx").on(table.user_id, table.device_id),
    index("index_user_id").on(table.user_id),
  ],
);
