import {
  createAuthenticatedRequest,
  createJsonRequest,
  createMultipartRequest,
  createSuccessResponse,
} from "@/core/utils/createRouteUtils";
import { rateLimitConfig } from "@/core/utils/rateLimitConfig";
import { rateLimitMiddleware } from "@/middleware/rateLimitMiddleware";
import { createRoute, z } from "@hono/zod-openapi";
import {
  ChatCoversationContactsSuccessResponseSchema,
  ChatDeleteMessageSuccessSchema,
  ChatGetMessagesSuccessSchema,
  ChatGetScheduleSuccessSchema,
  chatIdParamSchema,
  chatListPaginationQuerySchema,
  ChatListSuccessResponseSchema,
  ChatMarkAsReadSuccessSchema,
  ChatMessagesParamsSchema,
  ChatMessagesQuerySchema,
  ChatMessageStatusSuccessSchema,
  ChatPinUnpinSuccessResponseSchema,
  ChatScheduleMessagesSuccessSchema,
  ChatSearchMessageSuccessSchema,
  ChatSendMessageSuccessSchema,
  ChatSingleListSuccessResponseSchema,
  CreateChatSuccessResponseSchema,
  createNewChatSchema,
  DeleteMessageSchema,
  PinUnpinPayload,
  ScheduleMessagesSuccessSchema,
  scheduleSchema,
  updateScheduleSchema,
} from "./chat.schemas";
import { chatMiddleware } from "@/middleware/chatMiddleware";

export const createChat = createRoute({
  method: "post",
  path: "/create",
  tags: ["Chat"],
  description: "Create a new chat",
  middleware: [rateLimitMiddleware(rateLimitConfig.chat.createChat)],
  request: createAuthenticatedRequest({
    body: createJsonRequest({
      schema: createNewChatSchema,
      description: "Creating new chat data",
    }),
  }),
  responses: createSuccessResponse({
    schema: CreateChatSuccessResponseSchema,
    description: "Chat Created Successfully",
  }),
});

export const chatListRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Chat"],
  description: "Get chat list",
  middleware: [rateLimitMiddleware(rateLimitConfig.chat.list)],
  request: createAuthenticatedRequest({
    query: chatListPaginationQuerySchema,
  }),
  responses: createSuccessResponse({
    schema: ChatListSuccessResponseSchema,
    description: "Chat list fetched successfully",
  }),
});

export const chatSingleListRoute = createRoute({
  method: "get",
  path: "/list/{chat_id}",
  tags: ["Chat"],
  description: "Get chat list",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.singleList),
    chatMiddleware(),
  ] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
  }),
  responses: createSuccessResponse({
    schema: ChatSingleListSuccessResponseSchema,
    description: "Chat list fetched successfully",
  }),
});

export const chatCoversationContactsRoute = createRoute({
  method: "get",
  path: "/conversation-contacts",
  tags: ["Chat"],
  description: "Get conversation-contacts list",
  middleware: [rateLimitMiddleware(rateLimitConfig.chat.coversationContact)],
  request: createAuthenticatedRequest(),
  responses: createSuccessResponse({
    schema: ChatCoversationContactsSuccessResponseSchema,
    description: "Chat list fetched successfully",
  }),
});

export const pinUnpinChatRoute = createRoute({
  method: "post",
  path: "/pin",
  tags: ["Chat"],
  description: "Pin/Unpin chat room",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.pinChat),
    chatMiddleware({
      source: "body",
    }),
  ] as const,
  request: createAuthenticatedRequest({
    body: createJsonRequest({
      schema: PinUnpinPayload,
      description: "Payload for the chat pin/unpin",
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatPinUnpinSuccessResponseSchema,
    description: "Chat Pin/Unpin Successfully",
  }),
});

export const chatSendMsgRoute = createRoute({
  method: "post",
  path: "/send-message",
  tags: ["Chat"],
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.sendMessage),
    chatMiddleware({
      source: "form_data",
      broadcastCreatorOnly: true,
    }),
  ] as const,
  description: "Send Chat Messages",
  request: createAuthenticatedRequest({
    body: createMultipartRequest({
      schema: z.object({
        message: z.string().optional(),
        chat_id: z.string(),
        reply_message_id: z.string().optional(),
        files: z
          .union([
            z.any().openapi({
              type: "string",
              format: "binary",
            }),
            z.array(
              z.any().openapi({
                type: "string",
                format: "binary",
              }),
            ),
          ])
          .transform((v) => (Array.isArray(v) ? v : [v]))
          .optional(),
      }),
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatSendMessageSuccessSchema,
    description: "Message Send Successfully",
  }),
});

export const chatMessagesRoute = createRoute({
  method: "get",
  path: "/messages/{chat_id}",
  tags: ["Chat"],
  description: "Get All Chat Messages",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.getMessages),
    chatMiddleware(),
  ] as const,
  request: createAuthenticatedRequest({
    params: ChatMessagesParamsSchema,
    query: ChatMessagesQuerySchema,
  }),
  responses: createSuccessResponse({
    schema: ChatGetMessagesSuccessSchema,
    description: "Get Chat Messages Successfully",
  }),
});

export const chatScheduleMessage = createRoute({
  method: "post",
  path: "/messages/schedule",
  tags: ["Chat"],
  description: "Chat Messages Schedule",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.scheduleMessage),
    chatMiddleware({
      source: "form_data",
    }),
  ] as const,
  request: createAuthenticatedRequest({
    body: createMultipartRequest({
      schema: scheduleSchema,
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatScheduleMessagesSuccessSchema,
    description: "Successfully Schedule Messages",
  }),
});

export const getScheduleMessage = createRoute({
  method: "get",
  path: "/schedule/{chat_id}",
  tags: ["Chat"],
  description: "Get All Schedule Messages",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.getscheduleMessage),
    chatMiddleware(),
  ] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
  }),
  responses: createSuccessResponse({
    schema: ChatGetScheduleSuccessSchema,
    description: "Schedule Messages Get Successfully",
  }),
});

export const deleteSchedule = createRoute({
  method: "delete",
  path: "/schedule/{schedule_id}",
  tags: ["Chat"],
  description: "Delete Schedule",
  middleware: [rateLimitMiddleware(rateLimitConfig.chat.deleteSchedule)],
  request: createAuthenticatedRequest({
    params: z.object({
      schedule_id: z.coerce.number(),
    }),
  }),
  responses: createSuccessResponse({
    schema: ScheduleMessagesSuccessSchema,
    description: "Schedule Deleted Successfully",
  }),
});

export const updateSchedule = createRoute({
  method: "post",
  path: "/schedule",
  tags: ["Chat"],
  description: "Update Schedule Message",
  middleware: [rateLimitMiddleware(rateLimitConfig.chat.updateSchedule)],
  request: createAuthenticatedRequest({
    body: createJsonRequest({
      schema: updateScheduleSchema,
      description: "Update Schedule Message payload",
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatScheduleMessagesSuccessSchema,
    description: "Schedule Updated Successfully",
  }),
});

export const chatMarkAsReadMessage = createRoute({
  method: "get",
  path: "/read/{chat_id}",
  tags: ["Chat"],
  description: "Mark Chat as read",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.markMessageRead),
    chatMiddleware(),
  ] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
  }),
  responses: createSuccessResponse({
    schema: ChatMarkAsReadSuccessSchema,
    description: "Mark Chat Messages as Read",
  }),
});

export const chatDeleteMessageRoute = createRoute({
  method: "post",
  path: "/messages/delete",
  tags: ["Chat"],
  description: "Delete Chat Messages or clear chat",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.deleteMessage),
    chatMiddleware({
      source: "body",
    }),
  ] as const,
  request: createAuthenticatedRequest({
    body: createJsonRequest({
      schema: DeleteMessageSchema,
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatDeleteMessageSuccessSchema,
    description: "Delete Messages Successfully",
  }),
});

export const chatMessageStatusRoute = createRoute({
  method: "get",
  path: "/read-status/{chat_id}/{message_id}",
  tags: ["Chat"],
  description: "Get Message Status who have read it or who have received it",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.messageStatus),
    chatMiddleware(),
  ] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema.extend({
      message_id: z.coerce.number().openapi({
        param: { name: "message_id", in: "path" },
        example: 10,
        description: "Message ID",
      }),
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatMessageStatusSuccessSchema,
    description: "Success",
  }),
});

export const chatSearchMessageRoute = createRoute({
  method: "get",
  path: "/messages-search/{chat_id}",
  tags: ["Chat"],
  description: "Search Messages with keywords",
  middleware: [
    rateLimitMiddleware(rateLimitConfig.chat.searchMessage),
    chatMiddleware(),
  ] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
    query: z.object({
      search_text: z.string().min(2),
      limit: z.coerce
        .number()
        .min(1, {
          message: "Limit should be greater then zero",
        })
        .max(20)
        .optional(),
      cursor: z.string().optional(),
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatSearchMessageSuccessSchema,
    description: "Messages Search Successfully",
  }),
});
