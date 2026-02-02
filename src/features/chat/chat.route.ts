import { authMiddleware } from "@/middleware/authMiddleware";
import { ChatController } from "./ChatController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  ChatCoversationContactsSuccessResponseSchema,
  ChatErrorResponseSchema,
  ChatGetMessagesSuccessSchema,
  ChatListSuccessResponseSchema,
  ChatMessagesQuerySchema,
  ChatMessagesParamsSchema,
  ChatPinUnpinSuccessResponseSchema,
  ChatSendMessageSuccessSchema,
  ChatSingleListSuccessResponseSchema,
  CreateChatSuccessResponseSchema,
  createNewChatSchema,
  PinUnpinPayload,
} from "./chat.schemas";
import { toAppError } from "@/core/errors";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";

const controller = new ChatController(services);
const chatRouter = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const error = toAppError(result.error);
      console.log(error, "error");
      const errRes = {
        ...new ResponseBuilder("chat").failure({
          action: "chat_actions",
          error: error,
          message: error.message,
        }),
        errorCode: error.code,
      };
      return c.json(errRes, error.status);
    }
  },
}).basePath("/chat");
chatRouter.use(authMiddleware);

const chatListRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Chat"],
  description: "Get chat list",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    query: z.object({
      limit: z.coerce.number().optional().openapi({
        example: 10,
        description: "Number of chats to return",
      }),
      offset: z.coerce.number().optional().openapi({
        example: 0,
        description: "Number of chats to skip",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChatListSuccessResponseSchema,
        },
      },
      description: "Chat list fetched successfully",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(chatListRoute, controller.getChats);

const chatSingleListRoute = createRoute({
  method: "get",
  path: "/list/{chat_id}",
  tags: ["Chat"],
  description: "Get chat list",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    params: z.object({
      chat_id: z.coerce.number().openapi({
        param: {
          name: "chat_id",
          in: "path",
        },
        example: "1",
        description: "Chat Room ID",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChatSingleListSuccessResponseSchema,
        },
      },
      description: "Chat list fetched successfully",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(chatSingleListRoute, controller.getSingleChatList);

const chatCoversationContactsRoute = createRoute({
  method: "get",
  path: "/conversation-contacts",
  tags: ["Chat"],
  description: "Get conversation-contacts list",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChatCoversationContactsSuccessResponseSchema,
        },
      },
      description: "Chat list fetched successfully",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(
  chatCoversationContactsRoute,
  controller.getConversationContact,
);

const createChatRoute = createRoute({
  method: "post",
  path: "/create",
  tags: ["Chat"],
  description: "Create a new chat",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: createNewChatSchema,
        },
      },
      description: "Creating new chat data",
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: CreateChatSuccessResponseSchema,
        },
      },
      description: "Chat Created success response",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(createChatRoute, controller.createChat);

const pinUnpinChatRoute = createRoute({
  method: "post",
  path: "/pin",
  tags: ["Chat"],
  description: "Pin/Unpin chat room",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: PinUnpinPayload,
        },
      },
      description: "Payload for the chat pin/unpin",
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChatPinUnpinSuccessResponseSchema,
        },
      },
      description: "",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(pinUnpinChatRoute, controller.pinUnpinChat);

const chatSendMsgRoute = createRoute({
  method: "post",
  path: "/send-message",
  tags: ["Chat"],
  description: "",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    body: {
      content: {
        "application/x-www-form-urlencoded": {
          schema: z.object({
            message: z.string().optional(),
            chat_id: z.string(),
            reply_message_id: z.string().optional(),
            files: z
              .array(
                z.file().openapi({
                  type: "string",
                  format: "binary",
                }),
              )
              .optional(),
          }),
        },
        "multipart/form-data": {
          schema: z.object({
            message: z.string().optional(),
            chat_id: z.string(),
            reply_message_id: z.string().optional(),
            files: z
              .array(
                z.file().openapi({
                  type: "string",
                  format: "binary",
                }),
              )
              .optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChatSendMessageSuccessSchema,
        },
      },
      description: "",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(chatSendMsgRoute, controller.sendMessage);

const chatMessagesRoute = createRoute({
  method: "get",
  path: "/messages/{chat_id}",
  tags: ["Chat"],
  description: "Get All Chat Messages",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    params: ChatMessagesParamsSchema,
    query: ChatMessagesQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChatGetMessagesSuccessSchema,
        },
      },
      description: "Get Chat Messages",
    },
    400: {
      description: "Bad Request",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ChatErrorResponseSchema,
        },
      },
    },
  },
});

chatRouter.openapi(chatMessagesRoute, controller.getChatMessages);

chatRouter.post("/messages/schedule", async (c) => {
  const data = await controller.scheduleMessages(c);
  return c.json(data);
});

chatRouter.get("/schedule/:chat_id", async (c) => {
  const data = await controller.getScheduleMessage(c);
  return c.json(data);
});

chatRouter.delete("/schedule/:schedule_id", async (c) => {
  const data = await controller.deleteScheduleMessage(c);
  return c.json(data);
});

chatRouter.post("/schedule", async (c) => {
  const data = await controller.updateScheduleMessages(c);
  return c.json(data);
});

chatRouter.get("/read/:chat_id", async (c) => {
  const data = await controller.markAsReadMsg(c);
  return c.json(data);
});

chatRouter.post("/messages/delete", async (c) => {
  const data = await controller.deleteMessages(c);
  return c.json(data);
});

chatRouter.get("/read-status/:chat_id/:message_id", async (c) => {
  const data = await controller.checkMessageStatus(c);
  return c.json(data);
});

chatRouter.get("/messages-search/:chat_id", async (c) => {
  const data = await controller.messagesSearch(c);
  return c.json(data);
});

export default chatRouter;
