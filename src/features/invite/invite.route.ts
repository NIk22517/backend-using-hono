import { services } from "@/core/di/container";
import { InviteController } from "./InviteController";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/authMiddleware";
import {
  createAuthenticatedRequest,
  createSuccessResponse,
} from "@/core/utils/createRouteUtils";
import { sendInviteSchema } from "./invite.schemas";

const controller = new InviteController(services);

const inviteRouter = new OpenAPIHono().basePath("/invite");

inviteRouter.use(authMiddleware);

const sendInviteRoute = createRoute({
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

inviteRouter.openapi(sendInviteRoute, controller.sendInvite);

export default inviteRouter;
