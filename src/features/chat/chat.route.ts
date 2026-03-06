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
import { AppEnv } from "@/types/env";

const controller = new ChatController(services);
const chatRouter = new OpenAPIHono<AppEnv>({
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
chatRouter.openapi(chatScheduleMessage, controller.scheduleMessages);



chatRouter.openapi(getScheduleMessage, controller.getScheduleMessage);



chatRouter.openapi(deleteSchedule, controller.deleteScheduleMessage);



chatRouter.openapi(updateSchedule, controller.updateScheduleMessages);



chatRouter.openapi(chatMarkAsReadMessage, controller.markAsReadMsg);



chatRouter.openapi(chatDeleteMessageRoute, controller.deleteMessages);



chatRouter.openapi(chatMessageStatusRoute, controller.checkMessageStatus);



chatRouter.openapi(chatSearchMessageRoute, controller.messagesSearch);

export default chatRouter;
