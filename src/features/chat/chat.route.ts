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
import { rateLimitMiddleware } from "@/middleware/rateLimitMiddleware";
import { rateLimitConfig } from "@/core/utils/rateLimitConfig";
import {
  chatCoversationContactsRoute,
  chatListRoute,
  chatMessagesRoute,
  chatSendMsgRoute,
  chatSingleListRoute,
  createChat,
  pinUnpinChatRoute,
} from "./chat.contract";

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

chatRouter.openapi(createChat, controller.createChat);
chatRouter.openapi(chatListRoute, controller.getChats);
chatRouter.openapi(chatSingleListRoute, controller.getSingleChatList);
chatRouter.openapi(
  chatCoversationContactsRoute,
  controller.getConversationContact,
);
chatRouter.openapi(pinUnpinChatRoute, controller.pinUnpinChat);
chatRouter.openapi(chatSendMsgRoute, controller.sendMessage);
chatRouter.openapi(chatMessagesRoute, controller.getChatMessages);

const chatScheduleMessage = createRoute({
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

chatRouter.openapi(chatScheduleMessage, controller.scheduleMessages);

const getScheduleMessage = createRoute({
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

chatRouter.openapi(getScheduleMessage, controller.getScheduleMessage);

const deleteSchedule = createRoute({
  method: "delete",
  path: "/schedule/{schedule_id}",
  tags: ["Chat"],
  description: "Delete Schedule",
  middleware: [rateLimitMiddleware(rateLimitConfig.chat.deleteSchedule)],
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

chatRouter.openapi(updateSchedule, controller.updateScheduleMessages);

const chatMarkAsReadMessage = createRoute({
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

chatRouter.openapi(chatMarkAsReadMessage, controller.markAsReadMsg);

const chatDeleteMessageRoute = createRoute({
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

chatRouter.openapi(chatDeleteMessageRoute, controller.deleteMessages);

const chatMessageStatusRoute = createRoute({
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

chatRouter.openapi(chatMessageStatusRoute, controller.checkMessageStatus);

const chatSearchMessageRoute = createRoute({
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

chatRouter.openapi(chatSearchMessageRoute, controller.messagesSearch);

export default chatRouter;
