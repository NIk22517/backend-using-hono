import { UploadApiResponse } from "cloudinary";

export interface ReplyData {
  id: number;
  message: string | null;
  attachments: UploadApiResponse[] | null;
  sender_id: number;
  created_at: Date;
  sender_name: string | null;
}

interface SystemData {
  event: string;
  actor: {
    user_id: number;
    name: string;
  };
  targets?: {
    user_id: number;
    name: string;
  }[];
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  message_type: "user" | "system" | null;
  message: string | null;
  attachments: UploadApiResponse[] | null;
  sender_id: number;
  created_at: Date | null;
  sender_name: string | null;
  reply_message_id: number | null;
  delete_action: "self" | "everyone" | null;
  delete_text: string | null;
  reply_data: ReplyData | null;
  system_data: SystemData | null;
  read_by: string[];
  unread_by: string[];
  read_status: "read" | "unread";
  seen_all: boolean;
}

export interface PagingInfo {
  has_older: boolean;
  has_newer: boolean;
  oldest_id: number | null;
  newest_id: number | null;
  limit: number;
}

export interface ChatMessagesResponse {
  data: ChatMessage[];
  paging: PagingInfo;
}
