import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { responseWrapper } from "@/core/http/responseWrapper";
import { PARTICIPANT_STATUSES } from "@/db/callSchema";
import { z } from "zod";

export class CallController extends BaseController {
  constructor(private readonly deps: Services) {
    super("CallService");
  }

  createCall = responseWrapper({
    action: "create new call",
    successMsg: "Initiated call Successfully",
    errorMsg: "Something went wrong while calling",
    builder: this.builder,
    handler: async (ctx) => {
      const { id } = ctx.get("user");
      if (!id) {
        throw new Error("User not found");
      }
      const { chat_id } = ctx.req.param();
      const parse = z
        .object({
          chat_id: z.coerce.number(),
          user_id: z.number(),
        })
        .safeParse({
          chat_id,
          user_id: id,
        });

      if (!parse.success) {
        throw parse.error;
      }
      return this.deps.CallServices.createCall({ ...parse.data });
    },
  });

  callControl = responseWrapper({
    action: "control call",
    successMsg: "Updated Successfully",
    errorMsg: "Something went wrong while updating",
    builder: this.builder,
    handler: async (ctx) => {
      const { id } = ctx.get("user");
      if (!id) {
        throw new Error("User not found");
      }
      const {
        data: { call_id, status },
      } = await ctx.req?.json();
      const parse = z
        .object({
          call_id: z.coerce.number(),
          user_id: z.number(),
          status: z.enum(PARTICIPANT_STATUSES),
        })
        .safeParse({
          call_id,
          user_id: id,
          status,
        });

      if (!parse.success) {
        throw parse.error;
      }

      return this.deps.CallServices.callControl({
        ...parse.data,
      });
    },
  });

  getParticipants = responseWrapper({
    action: "getParticipants",
    errorMsg: "something went wrong while getting participants",
    successMsg: "Successfully get Participants",
    builder: this.builder,
    handler: async (ctx) => {
      const { call_id } = ctx.req.param();
      const parse = z
        .object({ call_id: z.coerce.number() })
        .safeParse({ call_id });
      if (!parse.success) {
        throw parse.error;
      }
      return this.deps.CallServices.getParticipants({ ...parse.data });
    },
  });
}
