import {
  createAuthenticatedRequest,
  createSuccessResponse,
} from "@/core/utils/createRouteUtils";
import { createRoute } from "@hono/zod-openapi";
import { PushPayload, PushSuccessResponse } from "./notifications.schema";

export const updatePushTokenRoute = createRoute({
  method: "post",
  path: "/push-token",
  tags: ["Notifications"],
  summary: "Update User Expo Notification Token",
  description: "This will update the notification token",
  request: createAuthenticatedRequest({
    body: {
      content: {
        "application/json": {
          schema: PushPayload,
        },
      },
    },
  }),
  responses: createSuccessResponse({
    schema: PushSuccessResponse,
    description: "Notification Token",
  }),
});
