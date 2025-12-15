import { chatMembers, chatReadReceipts, chats } from "@/db/schema";
import { db } from "@/db";
import { eq, or } from "drizzle-orm";
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
    .insert(chatReadReceipts)
    .values({
      chat_id,
      user_id: sender_id,
      last_read_message_id: message.id,
    })
    .onConflictDoUpdate({
      target: [chatReadReceipts.chat_id, chatReadReceipts.user_id],
      set: {
        last_read_message_id: message.id,
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
