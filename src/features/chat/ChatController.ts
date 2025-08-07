import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { responseWrapper } from "@/core/http/responseWrapper";
import { z } from "zod";

const createSchema = z.object({
  user_ids: z.array(z.coerce.number()),
  name: z.string(),
});

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

  createChat = responseWrapper({
    action: "create_chat",
    builder: this.builder,
    errorMsg: "",
    successMsg: "",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not exist");
      }

      const { data } = await ctx.req.json();

      const parseData = createSchema.safeParse(data);
      if (!parseData.success) {
        throw parseData.error;
      }

      const payload = {
        user_id: [...parseData.data.user_ids, user.id],
        name: parseData.data.name,
      };

      return await this.deps.chatServices.createSingleChat(payload);
    },
  });

  getChats = responseWrapper({
    action: "get_all_chats",
    builder: this.builder,
    successMsg: "Successfull",
    errorMsg: "Error geting chats",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User Not Found");
      }

      const query = ctx.req.query();

      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;

      return await this.deps.chatServices.getAllChats({
        id: user.id,
        limit,
        offset,
      });
    },
  });

  sendMessage = responseWrapper({
    action: "send_message",
    builder: this.builder,
    errorMsg: "Error sending message",
    successMsg: "Message sent Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not found");
      }
      const data = await ctx.req.formData();
      const message = data.get("message");
      const chat_id = data.get("chat_id");
      const reply_message_id = data.get("reply_message_id") as string;
      const files = data
        .getAll("files")
        .filter((f): f is File => f instanceof File);

      const check = z.object({
        chat_id: z.string(),
        message: z.string().default(""),
      });

      const parseData = check.safeParse({
        chat_id,
        message,
      });

      if (!parseData.success) {
        throw parseData.error;
      }

      return await this.deps.chatServices.sendMessage({
        ...parseData.data,
        files,
        sender_id: user.id,
        reply_message_id,
      });
    },
  });

  getChatMessages = responseWrapper({
    action: "get_chat_id_messages",
    builder: this.builder,
    errorMsg: "Not able to get messages",
    successMsg: "Messages Get Successfully",
    handler: async (ctx) => {
      const user = ctx.get("user");
      const { chat_id } = ctx.req.param();
      if (!chat_id) {
        throw new Error("Chat id is required");
      }
      const query = ctx.req.query();

      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;

      return await this.deps.chatServices.getChatMessages({
        chat_id,
        limit,
        offset,
        user_id: user.id,
      });
    },
  });

  markAsReadMsg = responseWrapper({
    action: "mark_as_read_all_chat_messages",
    builder: this.builder,
    errorMsg: "Not able to read the msg",
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

  deleteMessages = responseWrapper({
    action: "delete_user_messages",
    builder: this.builder,
    successMsg: "Message Deleted Successfully",
    errorMsg: "Error Deleting Messages",
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

  getSingleChatList = responseWrapper({
    action: "single_chat_list",
    builder: this.builder,
    successMsg: "Single Chat List Fetched Successfully",
    errorMsg: "Not able to get list",
    handler: async (ctx) => {
      const { chat_id } = ctx.req.param();
      const schema = z.coerce.number().safeParse(chat_id);

      if (!schema.success) {
        throw schema.error;
      }

      return this.deps.chatServices.getSingleChatList({ chat_id: schema.data });
    },
  });

  pinUnpinChat = responseWrapper({
    action: "pin/unpin chat",
    successMsg: "Pin/Unpin Successfully",
    errorMsg: "Error pin/unpin chat",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) {
        throw new Error("User not exist");
      }

      const { data } = await ctx.req.json();

      const parse = pinSchema.safeParse({ ...data, pinned_by: user.id });

      if (!parse.success) {
        throw parse.error;
      }

      return this.deps.chatServices.pinUnpinChat(parse.data);
    },
  });

  scheduleMessages = responseWrapper({
    action: "schedule message",
    errorMsg: "Something went wrong while schedule message",
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

  getScheduleMessage = responseWrapper({
    action: "get schedule messages",
    errorMsg: "Something went wrong while getting schedule messages",
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

  deleteScheduleMessage = responseWrapper({
    action: "delete_schedule_message",
    successMsg: "Deleted Successfully",
    errorMsg: "Something went wrong while deleting schedule message",
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

  updateScheduleMessages = responseWrapper({
    action: "update_schedule_message",
    successMsg: "Updated Successfully",
    errorMsg: "Something went wrong while updating schedule message",
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
}
