import {
  boolean,
  foreignKey,
  index,
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

export const chatTypeEnum = pgEnum("chat_type", [
  "single",
  "group",
  "broadcast",
]);

export const chats = pgTable(
  "chats",
  {
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
  },
  (table) => [index("idx_chats_created_by").on(table.created_by)]
);

export const chatPins = pgTable(
  "chat_pins",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .references(() => chats.id)
      .notNull(),
    pinned_by: integer("pinned_by")
      .references(() => usersTable.id)
      .notNull(),
    pinned_at: timestamp("pinned_at").defaultNow(),
  },
  (table) => [unique().on(table.chat_id, table.pinned_by)]
);

export const chatMembers = pgTable(
  "chat_members",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .references(() => chats.id)
      .notNull(),
    user_id: integer("user_id")
      .references(() => usersTable.id)
      .notNull(),
    joined_at: timestamp("joined_at").defaultNow(),
  },
  (table) => [
    unique().on(table.chat_id, table.user_id),
    index("idx_chat_members_user").on(table.user_id),
    index("idx_chat_members_user_chat_id").on(table.chat_id),
  ]
);

export const broadcastRecipients = pgTable(
  "broadcast_recipients",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .references(() => chats.id)
      .notNull(),
    recipient_id: integer("recipient_id")
      .references(() => usersTable.id)
      .notNull(),
    joined_at: timestamp("joined_at").defaultNow(),
  },
  (table) => [
    unique("broadcast_recipients_chat_recipient").on(
      table.chat_id,
      table.recipient_id
    ),
    index("idx_broadcast_recipients_user").on(table.recipient_id),
    index("idx_broadcast_recipients_chat_id").on(table.chat_id),
  ]
);

export const messageTypeEnum = pgEnum("message_type", ["user", "system"]);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .references(() => chats.id)
      .notNull(),
    sender_id: integer("sender_id")
      .references(() => usersTable.id)
      .notNull(),
    message: text("message").default(""),
    message_type: messageTypeEnum("message_type").default("user"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").$onUpdateFn(() => new Date()),
    parent_message_id: integer("parent_message_id"),
  },
  (table) => [
    foreignKey({
      columns: [table.parent_message_id],
      foreignColumns: [table.id],
    }).onDelete("cascade"),
    index("idx_messages_chat_created").on(table.chat_id, table.created_at),
    index("idx_messages_sender").on(table.sender_id),
    index("idx_messages_parent").on(table.parent_message_id),
  ]
);

export const chatMessageAttachments = pgTable(
  "chat_message_attachments",
  {
    id: serial("id").primaryKey(),
    message_id: integer("message_id")
      .references(() => chatMessages.id)
      .notNull(),
    chat_id: integer("chat_id")
      .references(() => chats.id)
      .notNull(),
    added_by: integer("added_by")
      .references(() => usersTable.id)
      .notNull(),
    attachments: json("attachments").$type<UploadApiResponse[]>().default([]),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_attachments_message").on(table.message_id),
    index("idx_attachments_chat").on(table.chat_id),
  ]
);

export const systemEventEnum = pgEnum("system_event", [
  "group_created",
  "users_added",
  "user_removed",
  "user_left",
  "group_name_changed",
  "group_avatar_changed",
  "message_pinned",
]);

export const chatMessageSystemEvents = pgTable(
  "chat_message_system_events",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .references(() => chats.id, { onDelete: "cascade" })
      .notNull(),
    message_id: integer("message_id")
      .references(() => chatMessages.id, { onDelete: "cascade" })
      .notNull(),
    event: systemEventEnum("event").notNull(),
    metadata: json("metadata").$type<{
      actor_id: number;
      target_user_ids?: number[];
      old_value?: string;
      new_value?: string;
    }>(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.message_id),
    index("idx_sys_event_event").on(table.event),
    index("idx_sys_event_message_id").on(table.message_id),
    index("idx_sys_event_chat_id").on(table.chat_id),
  ]
);

export const chatMessageReadReceipts = pgTable(
  "chat_message_read_receipts",
  {
    id: serial("id").primaryKey(),
    message_id: integer("message_id")
      .references(() => chatMessages.id, { onDelete: "cascade" })
      .notNull(),
    chat_id: integer("chat_id")
      .references(() => chats.id, { onDelete: "cascade" })
      .notNull(),
    user_id: integer("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    read_at: timestamp("read_at").defaultNow().notNull(),
  },
  (table) => [
    unique("unique_message_user_read").on(table.message_id, table.user_id),
    index("idx_msg_read_message_id").on(table.message_id),
    index("idx_msg_read_user_id").on(table.user_id),
    index("idx_msg_read_chat_user").on(table.chat_id, table.user_id),
    index("idx_msg_read_read_at").on(table.read_at),
  ]
);

export const chatReadSummary = pgTable(
  "chat_read_summary",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .references(() => chats.id, { onDelete: "cascade" })
      .notNull(),
    user_id: integer("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    last_read_message_id: integer("last_read_message_id").references(
      () => chatMessages.id,
      { onDelete: "set null" }
    ),
    last_read_at: timestamp("last_read_at").defaultNow(),
    unread_count: integer("unread_count").default(0),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique("unique_chat_user_summary").on(table.chat_id, table.user_id),
    index("idx_read_summary_chat").on(table.chat_id),
    index("idx_read_summary_user").on(table.user_id),
    index("idx_read_summary_unread").on(table.unread_count),
  ]
);

export const messageDeleteActionEnum = pgEnum("message_delete_action", [
  "self",
  "everyone",
]);

export const chatMessageDeletes = pgTable(
  "chat_message_deletes",
  {
    id: serial("id").primaryKey(),

    message_id: integer("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),

    chat_id: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),

    user_id: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    delete_action: messageDeleteActionEnum("delete_action").notNull(),

    deleted_by: integer("deleted_by")
      .notNull()
      .references(() => usersTable.id),

    deleted_at: timestamp("deleted_at").defaultNow(),
  },
  (table) => [
    unique().on(table.message_id, table.user_id),
    index("idx_msg_delete_chat_user").on(table.chat_id, table.user_id),
    index("idx_msg_delete_message").on(table.message_id),
  ]
);

export const chatClearStates = pgTable(
  "chat_clear_states",
  {
    id: serial("id").primaryKey(),
    chat_id: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    user_id: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    cleared_at: timestamp("cleared_at").notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.chat_id, table.user_id),
    index("idx_clear_chat_user").on(table.chat_id, table.user_id),
  ]
);

export const chatMessagesReply = pgTable(
  "chat_messages_reply",
  {
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
  },
  (table) => [
    index("idx_reply_message").on(table.reply_message_id),
    index("idx_reply_message_chat").on(table.chat_id),
  ]
);

export const chatScheduleMessages = pgTable("chat_message_schedules", {
  id: serial("id").primaryKey(),
  chat_id: integer("chat_id")
    .references(() => chats.id)
    .notNull(),
  sender_id: integer("sender_id")
    .references(() => usersTable.id)
    .notNull(),
  message: text("message").default(""),
  scheduled_at: timestamp("scheduled_at").notNull(),
  timezone: text("timezone").default("UTC"),
  active: boolean("active").default(true),
  status: text("status").default("pending"),
  retry_count: integer("retry_count").default(0),
  last_attempt_at: timestamp("last_attempt_at"),
  completed_at: timestamp("completed_at"),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow(),
});

export type ChatMessageType = InferSelectModel<typeof chatMessages>;
export type ChatMessageReadReceiptType = InferSelectModel<
  typeof chatMessageReadReceipts
>;
export type ChatReadSummaryType = InferSelectModel<typeof chatReadSummary>;
export type MessageDeleteAction =
  (typeof messageDeleteActionEnum.enumValues)[number];
export type ChatScheduleMessagesType = InferSelectModel<
  typeof chatScheduleMessages
>;
export type ChatTypeEnum = (typeof chatTypeEnum.enumValues)[number];
export type MessageTypeEnum = (typeof messageTypeEnum.enumValues)[number];
export type SystemEventType = (typeof systemEventEnum.enumValues)[number];
