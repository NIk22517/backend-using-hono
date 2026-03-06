import { z } from "zod";

import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { openApiResponseWrapper } from "@/core/http/openApiResponseWrapper";
import { createNewChatSchema, GetChatMessagesSchema } from "./chat.schemas";
import { AppError } from "@/core/errors";
import {
  chatCoversationContactsRoute,
  chatListRoute,
  chatMessagesRoute,
  chatSendMsgRoute,
  chatSingleListRoute,
  createChat,
  pinUnpinChatRoute,
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
      const payload = GetChatMessagesSchema.safeParse({
        chat_id,
        user_id: user.id,
        chat_type: chat_info.chat_type,
        ...query,
      });

      if (!payload.success) {
        throw payload.error;
      }

      return await this.deps.chatServices.getChatMessages({
        ...payload.data,
      });
    },
  });

  markAsReadMsg = openApiResponseWrapper({
    action: "mark_as_read_all_chat_messages",
    builder: this.builder,
    successMsg: "Success change status to read",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User Not Found");
      }
      const { chat_id: Id } = ctx.req.param();

      const chat_id = Number(Id);

      if (!chat_id) {
        throw new Error("Chat id is required");
      }

      return await this.deps.chatServices.markAsReadMsg({
        chat_id,
        user_id: user.id,
      });
    },
  });

  deleteMessages = openApiResponseWrapper({
    action: "delete_user_messages",
    builder: this.builder,
    successMsg: "Message Deleted Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { data } = await ctx.req.json();
      if (!data) {
        throw new Error("Data is not provided");
      }

      return await this.deps.chatServices.deleteMessages({
        action: data.action,
        chat_id: Number(data.chat_id),
        user_id: user.id,
        message_ids: data?.message_ids,
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
    action: "schedule message",
    successMsg: "Successfully Schedule Message",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const data = await ctx.req.formData();
      const message = data.get("message");
      const chat_id = data.get("chat_id");
      const scheduled_at = data.get("scheduled_at");

      const check = z.object({
        chat_id: z.coerce.number(),
        message: z.string().default(""),
        scheduled_at: z.preprocess((arg) => {
          if (typeof arg === "string" || arg instanceof Date)
            return new Date(arg);
        }, z.date()),
      });

      const parseData = check.safeParse({
        chat_id,
        message,
        scheduled_at,
      });

      if (!parseData.success) {
        throw parseData.error;
      }

      return this.deps.chatServices.scheduleMessage({
        ...parseData.data,
        sender_id: user.id,
      });
    },
  });

  getScheduleMessage = openApiResponseWrapper({
    action: "get schedule messages",
    successMsg: "Successfully get schedule messages",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      const { chat_id } = ctx.req.param();
      if (!user) {
        throw new Error("User not found");
      }
      const check = z.object({
        chat_id: z.coerce.number(),
      });

      const parseData = check.safeParse({
        chat_id,
      });
      if (!parseData.success) {
        throw parseData.error;
      }
      return this.deps.chatServices.getScheduleMessages({
        user_id: user.id,
        chat_id: parseData.data.chat_id,
      });
    },
  });

  deleteScheduleMessage = openApiResponseWrapper({
    action: "delete_schedule_message",
    successMsg: "Deleted Successfully",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { schedule_id } = ctx.req.param();
      const check = z.object({
        schedule_id: z.coerce.number(),
        user_id: z.number(),
      });
      const parse = check.safeParse({
        user_id: user.id,
        schedule_id: schedule_id,
      });

      if (!parse.success) {
        throw parse.error;
      }

      return this.deps.chatServices.deleteScheduleMessage({ ...parse.data });
    },
  });

  updateScheduleMessages = openApiResponseWrapper({
    action: "update_schedule_message",
    successMsg: "Updated Successfully",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const { data } = await ctx.req.json();
      const check = z.object({
        schedule_id: z.coerce.number(),
        user_id: z.number(),
        message: z.string().default(""),
        scheduled_at: z
          .preprocess((arg) => {
            if (typeof arg === "string" || arg instanceof Date)
              return new Date(arg);
          }, z.date())
          .optional(),
      });
      const parse = check.safeParse({
        user_id: user.id,
        ...data,
      });

      if (!parse.success) {
        throw parse.error;
      }

      return this.deps.chatServices.updateScheduleMessages({ ...parse.data });
    },
  });

  checkMessageStatus = openApiResponseWrapper({
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
      const { chat_id, message_id } = ctx.req.param();
      const schema = z
        .object({
          chat_id: z.coerce.number(),
          message_id: z.coerce.number(),
        })
        .safeParse({
          chat_id,
          message_id,
        });
      if (!schema.success) {
        throw schema.error;
      }

      return this.deps.chatServices.checkStatus({
        ...schema.data,
        user_id: user.id,
        chat_type: chat_info.chat_type,
      });
    },
  });

  messagesSearch = openApiResponseWrapper({
    action: "search_messages",
    builder: this.builder,
    successMsg: "Successfully found messages",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User Not found");
      }
      const { chat_id } = ctx.req.param();
      const query = ctx.req.query();
      const schema = z
        .object({
          user_id: z.number().positive(),
          chat_id: z.coerce.number().positive(),
          search_text: z.string().min(2),
          limit: z.coerce
            .number()
            .min(1, {
              message: "Limit should be greater then zero",
            })
            .max(20)
            .optional(),
          cursor: z.string().optional(),
        })
        .safeParse({
          user_id: user.id,
          chat_id,
          ...query,
        });

      if (!schema.success) {
        throw schema.error;
      }

      return this.deps.chatServices.searchMessages({ ...schema.data });
    },
  });
}
