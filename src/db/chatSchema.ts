import {
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./userSchema";
import type { UploadApiResponse } from "cloudinary";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const chatTypeEnum = pgEnum("chat_type", ["single", "group"]);

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }),
  chat_type: chatTypeEnum("chat_type").notNull(),
  created_by: integer()
    .references(() => usersTable.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const chatMembers = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  chat_id: integer("chat_id")
    .references(() => chats.id)
    .notNull(),
  user_id: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  joined_at: timestamp("joined_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chat_id: integer("chat_id")
    .references(() => chats.id)
    .notNull(),
  sender_id: integer("sender_id")
    .references(() => usersTable.id)
    .notNull(),
  message: text("message").default(""),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").$onUpdateFn(() => new Date()),
  attachments: json("attachments").$type<UploadApiResponse[]>().default([]),
});

export const chatReadStatus = pgEnum("chat_read_status", ["read", "unread"]);

export const chatReadReceipts = pgTable("chat_read_receipts", {
  id: serial("id").primaryKey(),
  message_id: integer("message_id")
    .references(() => chatMessages.id)
    .notNull(),
  user_id: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  status: chatReadStatus("status").default("unread"),
  read_at: timestamp("read_at").defaultNow(),
  chat_id: integer("chat_id").references(() => chats.id),
});
export const deleteActionEnum = pgEnum("delete_action", [
  "delete_for_me",
  "delete_for_everyone",
  "clear_all_chat",
  "permanently_delete",
  "recover",
  "recover_all_chat",
]);

export const chatMessagesDeletes = pgTable(
  "chat_messages_delete",
  {
    id: serial("id").primaryKey(),
    message_id: integer("message_id")
      .references(() => chatMessages.id)
      .notNull(),
    user_id: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    chat_id: integer("chat_id")
      .references(() => chats.id)
      .notNull(),
    deleted_at: timestamp("deleted_at").defaultNow(),
    delete_action: deleteActionEnum("delete_action")
      .notNull()
      .default("recover"),
    deleted_by: integer()
      .notNull()
      .references(() => usersTable.id),
  },
  (table) => [unique().on(table.message_id, table.user_id)]
);

export const chatMessagesReply = pgTable("chat_messages_reply", {
  id: serial("id").primaryKey(),
  message_id: integer("message_id")
    .references(() => chatMessages.id)
    .notNull(),
  chat_id: integer("chat_id")
    .references(() => chats.id)
    .notNull(),
  reply_message_id: integer("reply_message_id")
    .references(() => chatMessages.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

//types

export type ChatMessageType = InferSelectModel<typeof chatMessages>;
export type ChatReadReceiptsType = InferInsertModel<typeof chatReadReceipts>;
export type DeleteAction = (typeof deleteActionEnum.enumValues)[number];
