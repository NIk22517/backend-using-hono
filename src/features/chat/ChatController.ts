import { z } from "zod";

import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { openApiResponseWrapper } from "@/core/http/openApiResponseWrapper";
import { createNewChatSchema, GetChatMessagesSchema } from "./chat.schemas";
import { AppError } from "@/core/errors";
import {
  chatCoversationContactsRoute,
  chatDeleteMessageRoute,
  chatListRoute,
  chatMarkAsReadMessage,
  chatMessagesRoute,
  chatMessageStatusRoute,
  chatScheduleMessage,
  chatSearchMessageRoute,
  chatSendMsgRoute,
  chatSingleListRoute,
  createChat,
  deleteSchedule,
  getScheduleMessage,
  pinUnpinChatRoute,
  updateSchedule,
} from "./chat.contract";

const pinSchema = z.object({
  chat_id: z.coerce.number(),
  pinned_by: z.number(),
  pinned: z.boolean(),
});

export type PinType = z.infer<typeof pinSchema>;

export class ChatController extends BaseController {
  constructor(private readonly deps: Services) {
    super("ChatService");
  }

  createChat = openApiResponseWrapper({
    route: createChat,
    action: "create_chat",
    builder: this.builder,
    successMsg: "Chat Room Created Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not exist");
      }
      const body = ctx.req.valid("json");
      return await this.deps.chatServices.createChat({
        creator_id: user.id,
        member_ids: body.data.user_ids,
        type: body.data.type,
        name: body.data.name,
      });
    },
  });

  getChats = openApiResponseWrapper({
    route: chatListRoute,
    action: "get_all_chats",
    builder: this.builder,
    successMsg: "Chat list fetched successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User Not Found");
      }

      const query = ctx.req.valid("query");

      const limit = query?.limit ?? 10;
      const offset = query?.offset ?? 0;

      return await this.deps.chatServices.getAllChats({
        id: user.id,
        limit,
        offset,
      });
    },
  });

  getConversationContact = openApiResponseWrapper({
    route: chatCoversationContactsRoute,
    action: "conversation_contact",
    builder: this.builder,
    successMsg: "Successfully get conversation contact",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      return await this.deps.chatServices.getConversationalContacts({
        user_id: user.id,
      });
    },
  });
  sendMessage = openApiResponseWrapper({
    route: chatSendMsgRoute,
    action: "send_message",
    builder: this.builder,
    successMsg: "Message sent Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw AppError.notFound("User not found");
      }
      const {
        chat_id,
        message = "",
        reply_message_id,
        files = [],
      } = ctx.req.valid("form");
      const fileList = files.filter((f): f is File => f instanceof File);
      return await this.deps.chatServices.sendMessage({
        chat_id,
        message,
        files: fileList,
        sender_id: user.id,
        reply_message_id,
      });
    },
  });

  getChatMessages = openApiResponseWrapper({
    route: chatMessagesRoute,
    action: "get_chat_id_messages",
    builder: this.builder,
    successMsg: "Messages Get Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw AppError.notFound("User not found");
      }
      const chat_info = ctx.get("chat_info");
      if (!chat_info) {
        throw AppError.notFound("Chat Not Found");
      }
      const { chat_id } = ctx.req.valid("param");
      const query = ctx.req.valid("query");
      return await this.deps.chatServices.getChatMessages({
        chat_id,
        chat_type: chat_info.chat_type,
        user_id: user.id,
        ...query,
      });
    },
  });

  markAsReadMsg = openApiResponseWrapper({
    route: chatMarkAsReadMessage,
    action: "mark_as_read_all_chat_messages",
    builder: this.builder,
    successMsg: "Success change status to read",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User Not Found");
      }
      const { chat_id } = ctx.req.valid("param");
      return await this.deps.chatServices.markAsReadMsg({
        chat_id,
        user_id: user.id,
      });
    },
  });

  deleteMessages = openApiResponseWrapper({
    route: chatDeleteMessageRoute,
    action: "delete_user_messages",
    builder: this.builder,
    successMsg: "Message Deleted Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { data } = ctx.req.valid("json");

      return await this.deps.chatServices.deleteMessages({
        action: data.action,
        chat_id: Number(data.chat_id),
        user_id: user.id,
        message_ids: data.action !== "clear_chat" ? data?.message_ids : [],
      });
    },
  });

  getSingleChatList = openApiResponseWrapper({
    route: chatSingleListRoute,
    action: "single_chat_list",
    builder: this.builder,
    successMsg: "Single Chat List Fetched Successfully",
    handler: async (ctx) => {
      const { chat_id } = ctx.req.valid("param");
      return this.deps.chatServices.getSingleChatList({ chat_id });
    },
  });

  pinUnpinChat = openApiResponseWrapper({
    route: pinUnpinChatRoute,
    action: "pin/unpin chat",
    successMsg: "Pin/Unpin Successfully",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not exist");
      }
      const { data } = ctx.req.valid("json");
      return this.deps.chatServices.pinUnpinChat({
        ...data,
        pinned_by: user.id,
      });
    },
  });

  scheduleMessages = openApiResponseWrapper({
    route: chatScheduleMessage,
    action: "schedule message",
    successMsg: "Successfully Schedule Message",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { chat_id, message, scheduled_at, files } = ctx.req.valid("form");
      const fileList = files?.filter((f): f is File => f instanceof File);
      return this.deps.chatServices.scheduleMessage({
        chat_id,
        message,
        scheduled_at,
        sender_id: user.id,
        fileList,
      });
    },
  });

  getScheduleMessage = openApiResponseWrapper({
    route: getScheduleMessage,
    action: "get schedule messages",
    successMsg: "Successfully get schedule messages",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { chat_id } = ctx.req.valid("param");
      return this.deps.chatServices.getScheduleMessages({
        user_id: user.id,
        chat_id,
      });
    },
  });

  deleteScheduleMessage = openApiResponseWrapper({
    route: deleteSchedule,
    action: "delete_schedule_message",
    successMsg: "Deleted Successfully",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { schedule_id } = ctx.req.valid("param");
      return this.deps.chatServices.deleteScheduleMessage({
        schedule_id,
        user_id: user.id,
      });
    },
  });

  updateScheduleMessages = openApiResponseWrapper({
    route: updateSchedule,
    action: "update_schedule_message",
    successMsg: "Updated Successfully",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { data } = ctx.req.valid("json");
      return this.deps.chatServices.updateScheduleMessages({
        user_id: user.id,
        ...data,
      });
    },
  });

  checkMessageStatus = openApiResponseWrapper({
    route: chatMessageStatusRoute,
    action: "check_messages_status",
    builder: this.builder,
    successMsg: "Successfully get messages status",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw AppError.notFound("User Not Found");
      }
      const chat_info = ctx.get("chat_info");
      if (!chat_info) {
        throw AppError.notFound("Chat Not found");
      }
      const { chat_id, message_id } = ctx.req.valid("param");
      return this.deps.chatServices.checkStatus({
        user_id: user.id,
        chat_type: chat_info.chat_type,
        chat_id,
        message_id,
      });
    },
  });

  messagesSearch = openApiResponseWrapper({
    route: chatSearchMessageRoute,
    action: "search_messages",
    builder: this.builder,
    successMsg: "Successfully found messages",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User Not found");
      }
      const { chat_id } = ctx.req.valid("param");
      const query = ctx.req.valid("query");

      return this.deps.chatServices.searchMessages({
        chat_id,
        user_id: user.id,
        ...query,
      });
    },
  });
}
