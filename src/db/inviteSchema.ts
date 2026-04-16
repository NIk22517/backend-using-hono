import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./userSchema";
import { chats } from "./chatSchema";
import { InferSelectModel } from "drizzle-orm";

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
]);

export const inviteChannelEnum = pgEnum("invite_channel", [
  "email",
  "notification",
]);

export const chatInvites = pgTable(
  "chat_invites",
  {
    id: serial("id").primaryKey(),
    invited_by: integer("invited_by")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    invitee_user_id: integer("invitee_user_id").references(
      () => usersTable.id,
      { onDelete: "cascade" },
    ),
    invitee_email: varchar("invitee_email", { length: 255 }),
    chat_id: integer("chat_id").references(() => chats.id, {
      onDelete: "cascade",
    }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    channel: inviteChannelEnum("channel").notNull(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    expires_at: timestamp("expires_at").notNull(),
    accepted_at: timestamp("accepted_at"),
    declined_at: timestamp("declined_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique("unique_pending_user_chat").on(table.invitee_user_id, table.chat_id),
    unique("unique_pending_email_chat").on(table.invitee_email, table.chat_id),

    index("idx_invites_inviter").on(table.invited_by),
    index("idx_invites_invitee_user").on(table.invitee_user_id),
    index("idx_invites_email").on(table.invitee_email),
    index("idx_invites_token").on(table.token),
    index("idx_invites_status").on(table.status),
    index("idx_invites_expires").on(table.expires_at),
  ],
);

export type ChatInvite = InferSelectModel<typeof chatInvites>;
export type InviteStatus = (typeof inviteStatusEnum.enumValues)[number];
export type InviteChannel = (typeof inviteChannelEnum.enumValues)[number];
