import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { responseWrapper } from "@/core/http/responseWrapper";
import { Context } from "hono";
import { z } from "zod";

export class AiController extends BaseController {
  constructor(private readonly deps: Services) {
    super("AiService");
  }

  summary = async (ctx: Context) => {
    const { chat_id } = ctx.req.param();
    const parsed = z.coerce.number().safeParse(chat_id);
    if (!parsed.success) {
      ctx.status(400);
      return ctx.text("Invalid chat ID");
    }

    return this.deps.AiServices.chatSummary({ chat_id: parsed.data, c: ctx });
  };
}
