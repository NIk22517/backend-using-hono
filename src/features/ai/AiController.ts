import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { responseWrapper } from "@/core/http/responseWrapper";
import { z } from "zod";

export class AiController extends BaseController {
  constructor(private readonly deps: Services) {
    super("AiService");
  }

  summary = responseWrapper({
    action: "summary_of_chat",
    builder: this.builder,
    errorMsg: "Something went wrong while doing summary",
    successMsg: "Summarized Successfully",
    handler: async (ctx) => {
      const { chat_id } = ctx.req.param();
      const parsed = z.coerce.number().safeParse(chat_id);
      if (!parsed.success) {
        throw parsed.error;
      }
      return this.deps.AiServices.chatSummary({ chat_id: parsed.data });
    },
  });
}
