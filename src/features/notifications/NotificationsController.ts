import { Services } from "@/core/di/types";
import { BaseController } from "@/core/http/BaseController";
import { openApiResponseWrapper } from "@/core/http/openApiResponseWrapper";
import { updatePushTokenRoute } from "./notifications.contract";
import { AppError } from "@/core/errors";

export class NotificationsController extends BaseController {
  constructor(private readonly deps: Services) {
    super("NotificationService");
  }

  updatePushToken = openApiResponseWrapper({
    action: "update_user_push_token",
    builder: this.builder,
    successMsg: "Updated Successfully",
    route: updatePushTokenRoute,
    handler: async (ctx) => {
      const user = ctx.get("user");
      console.log(user, "user");
      if (!user.id) throw AppError.unauthorized();
      const { data } = ctx.req.valid("json");
      return this.deps.notificationServices.updatePushToken({
        data: {
          ...data,
          user_id: user.id,
        },
      });
    },
  });
}
