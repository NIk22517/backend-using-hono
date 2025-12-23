import {
  chatMembers,
  chatMessageReadReceipts,
  chatReadSummary,
  chats,
} from "@/db/schema";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { AppEvents } from "../eventTypes";
import { socketService } from "@/index";

export const messageSentHandler = async ({
  message,
  sender_id,
}: Parameters<AppEvents["messageSent"]>[0]) => {
  const chat_id = message.chat_id;
  if (!chat_id) return;

  const members = await db
    .select({ user_id: chatMembers.user_id })
    .from(chatMembers)
    .where(eq(chatMembers.chat_id, chat_id));

  await db
    .insert(chatMessageReadReceipts)
    .values({
      message_id: message.id,
      chat_id,
      user_id: sender_id,
    })
    .onConflictDoNothing();

  await db
    .insert(chatReadSummary)
    .values(
      members.map((m) => ({
        chat_id,
        user_id: m.user_id,
        unread_count: m.user_id === sender_id ? 0 : 1,
        last_read_message_id: m.user_id === sender_id ? message.id : null,
      }))
    )
    .onConflictDoUpdate({
      target: [chatReadSummary.chat_id, chatReadSummary.user_id],
      set: {
        unread_count: sql`
          CASE
            WHEN ${chatReadSummary.user_id} = ${sender_id}
              THEN 0
            ELSE ${chatReadSummary.unread_count} + 1
          END
        `,
        last_read_message_id: sql`
          CASE
            WHEN ${chatReadSummary.user_id} = ${sender_id}
              THEN ${message.id}
            ELSE ${chatReadSummary.last_read_message_id}
          END
        `,
        updated_at: new Date(),
      },
    });

  members.forEach((member) => {
    socketService.sendToUser({
      userId: member.user_id,
      event: "sendMessage",
      args: [message],
    });

    if (member.user_id !== sender_id) {
      socketService.sendToUser({
        userId: member.user_id,
        event: "markReadMessage",
        args: [{ chat_id, seen_by: sender_id }],
      });
    }
  });

  await db
    .update(chats)
    .set({ updated_at: new Date() })
    .where(eq(chats.id, chat_id));
};
