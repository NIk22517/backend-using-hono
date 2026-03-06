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
  ChatGetMessagesSuccessSchema,
  chatIdParamSchema,
  chatListPaginationQuerySchema,
  ChatListSuccessResponseSchema,
  ChatMessagesParamsSchema,
  ChatMessagesQuerySchema,
  ChatPinUnpinSuccessResponseSchema,
  ChatSendMessageSuccessSchema,
  ChatSingleListSuccessResponseSchema,
  CreateChatSuccessResponseSchema,
  createNewChatSchema,
  PinUnpinPayload,
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
