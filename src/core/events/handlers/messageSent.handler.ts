import { chatMembers, chatReadReceipts } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { ChatReadReceiptsType, chats } from "@/db/chatSchema";
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

  const receipts: ChatReadReceiptsType[] = members.map((member) => {
    socketService.sendToUser({
      userId: member.user_id,
      event: "sendMessage",
      args: [message],
    });
    return {
      message_id: message.id,
      user_id: member.user_id,
      chat_id,
      status: member.user_id === sender_id ? "read" : "unread",
    };
  });

  await db.insert(chatReadReceipts).values(receipts);

  await db
    .update(chats)
    .set({ updated_at: new Date() })
    .where(eq(chats.id, chat_id));
};
