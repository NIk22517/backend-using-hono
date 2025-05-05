import { ChatMessageType } from "@/db/chatSchema";

export type AppEvents = {
  messageSent: (payload: {
    message: ChatMessageType & { reply_data: ChatMessageType | null };
    sender_id: number;
  }) => void;
};
