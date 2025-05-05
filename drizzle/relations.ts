import { relations } from "drizzle-orm/relations";
import { chats, chatMembers, users, chatMessages, chatReadReceipts, chatMessagesDelete } from "./schema";

export const chatMembersRelations = relations(chatMembers, ({one}) => ({
	chat: one(chats, {
		fields: [chatMembers.chatId],
		references: [chats.id]
	}),
	user: one(users, {
		fields: [chatMembers.userId],
		references: [users.id]
	}),
}));

export const chatsRelations = relations(chats, ({one, many}) => ({
	chatMembers: many(chatMembers),
	user: one(users, {
		fields: [chats.createdBy],
		references: [users.id]
	}),
	chatMessages: many(chatMessages),
	chatReadReceipts: many(chatReadReceipts),
	chatMessagesDeletes: many(chatMessagesDelete),
}));

export const usersRelations = relations(users, ({many}) => ({
	chatMembers: many(chatMembers),
	chats: many(chats),
	chatMessages: many(chatMessages),
	chatReadReceipts: many(chatReadReceipts),
	chatMessagesDeletes: many(chatMessagesDelete),
}));

export const chatMessagesRelations = relations(chatMessages, ({one, many}) => ({
	chat: one(chats, {
		fields: [chatMessages.chatId],
		references: [chats.id]
	}),
	user: one(users, {
		fields: [chatMessages.senderId],
		references: [users.id]
	}),
	chatReadReceipts: many(chatReadReceipts),
	chatMessagesDeletes: many(chatMessagesDelete),
}));

export const chatReadReceiptsRelations = relations(chatReadReceipts, ({one}) => ({
	chatMessage: one(chatMessages, {
		fields: [chatReadReceipts.messageId],
		references: [chatMessages.id]
	}),
	user: one(users, {
		fields: [chatReadReceipts.userId],
		references: [users.id]
	}),
	chat: one(chats, {
		fields: [chatReadReceipts.chatId],
		references: [chats.id]
	}),
}));

export const chatMessagesDeleteRelations = relations(chatMessagesDelete, ({one}) => ({
	chatMessage: one(chatMessages, {
		fields: [chatMessagesDelete.messageId],
		references: [chatMessages.id]
	}),
	user: one(users, {
		fields: [chatMessagesDelete.userId],
		references: [users.id]
	}),
	chat: one(chats, {
		fields: [chatMessagesDelete.chatId],
		references: [chats.id]
	}),
}));