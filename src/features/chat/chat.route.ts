import { authMiddleware } from "@/middleware/authMiddleware";
import { ChatController } from "./ChatController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  ChatCoversationContactsSuccessResponseSchema,
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
  scheduleSchema,
  ChatScheduleMessagesSuccessSchema,
  ChatGetScheduleSuccessSchema,
  updateScheduleSchema,
  ScheduleMessagesSuccessSchema,
  ChatMarkAsReadSuccessSchema,
  DeleteMessageSchema,
  ChatDeleteMessageSuccessSchema,
  ChatMessageStatusSuccessSchema,
  ChatSearchMessageSuccessSchema,
  chatListPaginationQuerySchema,
  chatIdParamSchema,
} from "./chat.schemas";
import { toAppError } from "@/core/errors";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import {
  createAuthenticatedRequest,
  createSuccessResponse,
  createJsonRequest,
  createMultipartRequest,
} from "../../core/utils/createRouteUtils";
import { chatMiddleware } from "@/middleware/chatMiddleware";

const controller = new ChatController(services);
const chatRouter = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const error = toAppError(result.error);
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
  request: createAuthenticatedRequest({
    query: chatListPaginationQuerySchema,
  }),
  responses: createSuccessResponse({
    schema: ChatListSuccessResponseSchema,
    description: "Chat list fetched successfully",
  }),
});

chatRouter.openapi(chatListRoute, controller.getChats);

const chatSingleListRoute = createRoute({
  method: "get",
  path: "/list/{chat_id}",
  tags: ["Chat"],
  description: "Get chat list",
  middleware: [chatMiddleware()] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
  }),
  responses: createSuccessResponse({
    schema: ChatSingleListSuccessResponseSchema,
    description: "Chat list fetched successfully",
  }),
});

chatRouter.openapi(chatSingleListRoute, controller.getSingleChatList);

const chatCoversationContactsRoute = createRoute({
  method: "get",
  path: "/conversation-contacts",
  tags: ["Chat"],
  description: "Get conversation-contacts list",
  request: createAuthenticatedRequest(),
  responses: createSuccessResponse({
    schema: ChatCoversationContactsSuccessResponseSchema,
    description: "Chat list fetched successfully",
  }),
});

chatRouter.openapi(
  chatCoversationContactsRoute,
  controller.getConversationContact,
);

const createChat = createRoute({
  method: "post",
  path: "/create",
  tags: ["Chat"],
  description: "Create a new chat",
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

chatRouter.openapi(createChat, controller.createChat);

const pinUnpinChatRoute = createRoute({
  method: "post",
  path: "/pin",
  tags: ["Chat"],
  description: "Pin/Unpin chat room",
  middleware: [
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

chatRouter.openapi(pinUnpinChatRoute, controller.pinUnpinChat);

const chatSendMsgRoute = createRoute({
  method: "post",
  path: "/send-message",
  tags: ["Chat"],
  middleware: [
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
          .array(
            z.file().openapi({
              type: "string",
              format: "binary",
            }),
          )
          .optional(),
      }),
    }),
  }),
  responses: createSuccessResponse({
    schema: ChatSendMessageSuccessSchema,
    description: "Message Send Successfully",
  }),
});

chatRouter.openapi(chatSendMsgRoute, controller.sendMessage);

const chatMessagesRoute = createRoute({
  method: "get",
  path: "/messages/{chat_id}",
  tags: ["Chat"],
  description: "Get All Chat Messages",
  middleware: [chatMiddleware()] as const,
  request: createAuthenticatedRequest({
    params: ChatMessagesParamsSchema,
    query: ChatMessagesQuerySchema,
  }),
  responses: createSuccessResponse({
    schema: ChatGetMessagesSuccessSchema,
    description: "Get Chat Messages Successfully",
  }),
});

chatRouter.openapi(chatMessagesRoute, controller.getChatMessages);

const chatScheduleMessage = createRoute({
  method: "post",
  path: "/messages/schedule",
  tags: ["Chat"],
  description: "Chat Messages Schedule",
  middleware: [
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

chatRouter.openapi(chatScheduleMessage, controller.scheduleMessages);

const getScheduleMessage = createRoute({
  method: "get",
  path: "/schedule/{chat_id}",
  tags: ["Chat"],
  description: "Get All Schedule Messages",
  middleware: [chatMiddleware()] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
  }),
  responses: createSuccessResponse({
    schema: ChatGetScheduleSuccessSchema,
    description: "Schedule Messages Get Successfully",
  }),
});

chatRouter.openapi(getScheduleMessage, controller.getScheduleMessage);

const deleteSchedule = createRoute({
  method: "delete",
  path: "/schedule/{schedule_id}",
  tags: ["Chat"],
  description: "Delete Schedule",
  request: createAuthenticatedRequest({
    params: z.object({
      schedule_id: z.string(),
    }),
  }),
  responses: createSuccessResponse({
    schema: ScheduleMessagesSuccessSchema,
    description: "Schedule Deleted Successfully",
  }),
});

chatRouter.openapi(deleteSchedule, controller.deleteScheduleMessage);

const updateSchedule = createRoute({
  method: "post",
  path: "/schedule",
  tags: ["Chat"],
  description: "Update Schedule Message",
  request: createAuthenticatedRequest({
    body: createJsonRequest({
      schema: updateScheduleSchema,
      description: "Update Schedule Message payload",
    }),
  }),
  responses: createSuccessResponse({
    schema: ScheduleMessagesSuccessSchema,
    description: "Schedule Updated Successfully",
  }),
});

chatRouter.openapi(updateSchedule, controller.updateScheduleMessages);

const chatMarkAsReadMessage = createRoute({
  method: "get",
  path: "/read/{chat_id}",
  tags: ["Chat"],
  description: "Mark Chat as read",
  middleware: [chatMiddleware()] as const,
  request: createAuthenticatedRequest({
    params: chatIdParamSchema,
  }),
  responses: createSuccessResponse({
    schema: ChatMarkAsReadSuccessSchema,
    description: "Mark Chat Messages as Read",
  }),
});

chatRouter.openapi(chatMarkAsReadMessage, controller.markAsReadMsg);

const chatDeleteMessageRoute = createRoute({
  method: "post",
  path: "/messages/delete",
  tags: ["Chat"],
  description: "Delete Chat Messages or clear chat",
  middleware: [
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

chatRouter.openapi(chatDeleteMessageRoute, controller.deleteMessages);

const chatMessageStatusRoute = createRoute({
  method: "get",
  path: "/read-status/{chat_id}/{message_id}",
  tags: ["Chat"],
  description: "Get Message Status who have read it or who have received it",
  middleware: [chatMiddleware()] as const,
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

chatRouter.openapi(chatMessageStatusRoute, controller.checkMessageStatus);

const chatSearchMessageRoute = createRoute({
  method: "get",
  path: "/messages-search/{chat_id}",
  tags: ["Chat"],
  description: "Search Messages with keywords",
  middleware: [chatMiddleware()] as const,
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

chatRouter.openapi(chatSearchMessageRoute, controller.messagesSearch);

export default chatRouter;
