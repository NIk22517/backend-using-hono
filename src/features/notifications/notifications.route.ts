import { services } from "@/core/di/container";
import { NotificationsController } from "./NotificationsController";
import { OpenAPIHono } from "@hono/zod-openapi";
import { AppEnv } from "@/types/env";
import { updatePushTokenRoute } from "./notifications.contract";
import { authMiddleware } from "@/middleware/authMiddleware";

const controller = new NotificationsController(services);
const notificationRouter = new OpenAPIHono<AppEnv>().basePath("/notification");
notificationRouter.use(authMiddleware);

notificationRouter.openapi(updatePushTokenRoute, controller.updatePushToken);

export default notificationRouter;
