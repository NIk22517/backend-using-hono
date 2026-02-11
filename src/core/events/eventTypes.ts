import { ChatMessageType } from "@/db/chatSchema";
import { UploadApiResponse } from "cloudinary";

export type AppEvents = {
  messageSent: (payload: {
    message: ChatMessageType & { reply_data: ChatMessageType | null } & {
      attachments: UploadApiResponse[];
    };
    sender_id: number;
  }) => void;
};
