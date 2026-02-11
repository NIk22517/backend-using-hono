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
import { redisCache } from "@/core/cache/redis.cache";

export const messageSentHandler = async ({
  message,
  sender_id,
}: Parameters<AppEvents["messageSent"]>[0]) => {
  const chat_id = message.chat_id;
  if (!chat_id) return;

  const chat_info = await redisCache.getOrSetMapChat(chat_id);
  const members = chat_info ? [...chat_info.members] : [];

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
        user_id: m,
        unread_count: m === sender_id ? 0 : 1,
        last_read_message_id: m === sender_id ? message.id : null,
      })),
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
      userId: member,
      event: "sendMessage",
      args: [message],
    });

    if (member !== sender_id) {
      socketService.sendToUser({
        userId: member,
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
