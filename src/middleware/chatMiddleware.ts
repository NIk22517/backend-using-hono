import { redisCache } from "@/core/cache/redis.cache";
import { HttpStatus } from "@/core/errors";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import { Context, MiddlewareHandler } from "hono";

export type ChatIdSource = "param" | "query" | "body" | "form_data";

export interface ChatAuthMiddlewareOptions {
  source?: ChatIdSource;
  fieldName?: string;
  requireMembership?: boolean;
  broadcastCreatorOnly?: boolean;
}

const extractChatId = async ({
  c,
  fieldName,
  source,
}: {
  c: Context;
  source: ChatIdSource;
  fieldName: string;
}) => {
  let chatIdValue: string | undefined;
  switch (source) {
    case "param":
      chatIdValue = c.req.param(fieldName);
      break;
    case "query":
      chatIdValue = c.req.query(fieldName);
      break;
    case "body":
      try {
        const body = await c.req.json();
        chatIdValue = body?.data?.[fieldName];
      } catch {
        return null;
      }
      break;
    case "form_data":
      try {
        const body = await c.req.formData();
        chatIdValue = body.get(fieldName) as string;
      } catch {
        return null;
      }
      break;
  }
  if (!chatIdValue) return null;
  const chatId = Number(chatIdValue);
  return isNaN(chatId) ? null : chatId;
};

export const chatMiddleware = (
  options: ChatAuthMiddlewareOptions = {},
): MiddlewareHandler => {
  const {
    source = "param",
    fieldName = "chat_id",
    requireMembership = true,
    broadcastCreatorOnly = false,
  } = options;

  return async (c, next) => {
    const fail = (message: string, status: HttpStatus) => {
      const res = new ResponseBuilder("middleware").failure({
        action: "chat_middleware",
        error: message,
        message,
      });
      return c.json(res, status);
    };

    const user = c.get("user");
    if (!user) {
      return fail("Authentication required", 401);
    }
    const chatId = await extractChatId({ c, source, fieldName });
    if (!chatId) {
      return fail(`Missing or invalid ${fieldName}`, 400);
    }
    const chatInfo = await redisCache.getOrSetMapChat(chatId);
    if (!chatInfo) {
      return fail(`Chat ${chatId} not found`, 404);
    }
    if (requireMembership) {
      const userIsMember = chatInfo.members.has(user.id);
      if (!userIsMember) {
        return fail(`You do not have access to chat ${chatId}`, 403);
      }
    }
    if (broadcastCreatorOnly && chatInfo.chat_type === "broadcast") {
      const creatorCheck = chatInfo.created_by === user.id;
      if (!creatorCheck) {
        return fail("Only the broadcast creator can perform this action", 403);
      }
    }
    c.set("chat_info", chatInfo);
    next();
  };
};
