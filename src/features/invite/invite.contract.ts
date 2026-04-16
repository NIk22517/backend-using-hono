import {
  createAuthenticatedRequest,
  createSuccessResponse,
} from "@/core/utils/createRouteUtils";
import { createRoute, z } from "@hono/zod-openapi";
import { sendInviteSchema } from "./invite.schemas";

export const sendInviteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Retrieve the authenticated user's profile information",
  request: createAuthenticatedRequest({
    body: {
      content: {
        "application/json": {
          schema: sendInviteSchema,
        },
      },
    },
  }),
  responses: createSuccessResponse({
    schema: z.string(),
    description: "Invite Send Successfully",
  }),
});
