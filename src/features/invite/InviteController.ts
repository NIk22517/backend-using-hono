import { Services } from "@/core/di/types";
import { AppError } from "@/core/errors";
import { BaseController } from "@/core/http/BaseController";
import { openApiResponseWrapper } from "@/core/http/openApiResponseWrapper";
import { sendInviteSchema } from "./invite.schemas";

export class InviteController extends BaseController {
  constructor(private readonly deps: Services) {
    super("InviteService");
  }

  sendInvite = openApiResponseWrapper({
    action: "send_invite",
    successMsg: "Invite Sent Successfully",
    builder: this.builder,
    handler: async (ctx) => {
      const user = ctx.get("user");
      if (!user) throw AppError.unauthorized();
      const body = await ctx.req.json();

      const parsed = sendInviteSchema.safeParse(body);
      if (!parsed.success) throw parsed.error;
      return this.deps.inviteServices.sendInvite({
        ...parsed.data.data,
        invited_by: user.id,
      });
    },
  });
}
