import { services } from "@/core/di/container";
import { InviteController } from "./InviteController";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/authMiddleware";
import { sendInviteRoute } from "./invite.contract";

const controller = new InviteController(services);
const inviteRouter = new OpenAPIHono().basePath("/invite");

inviteRouter.use(authMiddleware);
inviteRouter.openapi(sendInviteRoute, controller.sendInvite);

export default inviteRouter;
