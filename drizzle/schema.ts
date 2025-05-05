import { pgTable, unique, integer, text, varchar, timestamp, foreignKey, serial, json, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const chatReadStatus = pgEnum("chat_read_status", ['read', 'unread'])
export const chatType = pgEnum("chat_type", ['single', 'group'])
export const deleteAction = pgEnum("delete_action", ['delete_for_me', 'delete_for_everyone', 'clear_all_chat', 'permanently_delete', 'recover'])


export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: text().notNull(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const chatMembers = pgTable("chat_members", {
	id: serial().primaryKey().notNull(),
	chatId: integer("chat_id").notNull(),
	userId: integer("user_id").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "chat_members_chat_id_chats_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_members_user_id_users_id_fk"
		}),
]);

export const chats = pgTable("chats", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }),
	chatType: chatType("chat_type").notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "chats_created_by_users_id_fk"
		}),
]);

export const chatMessages = pgTable("chat_messages", {
	id: serial().primaryKey().notNull(),
	chatId: integer("chat_id").notNull(),
	senderId: integer("sender_id").notNull(),
	message: text().default(''),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	attachments: json().default([]),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "chat_messages_chat_id_chats_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "chat_messages_sender_id_users_id_fk"
		}),
]);

export const chatReadReceipts = pgTable("chat_read_receipts", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	userId: integer("user_id").notNull(),
	status: chatReadStatus().default('unread'),
	readAt: timestamp("read_at", { mode: 'string' }).defaultNow(),
	chatId: integer("chat_id"),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [chatMessages.id],
			name: "chat_read_receipts_message_id_chat_messages_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_read_receipts_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "chat_read_receipts_chat_id_chats_id_fk"
		}),
]);

export const chatMessagesDelete = pgTable("chat_messages_delete", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	userId: integer("user_id").notNull(),
	chatId: integer("chat_id").notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }).defaultNow(),
	deleteAction: deleteAction("delete_action").default('recover').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [chatMessages.id],
			name: "chat_messages_delete_message_id_chat_messages_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_messages_delete_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "chat_messages_delete_chat_id_chats_id_fk"
		}),
]);
