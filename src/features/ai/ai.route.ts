import { Hono } from "hono";
import { AiController } from "./AiController";
import { services } from "@/core/di/container";
import { authMiddleware } from "@/middleware/authMiddleware";

const controller = new AiController(services);

const aiRouter = new Hono().basePath("/ai").use(authMiddleware);

aiRouter.get("/summary/:chat_id", controller.summary);
aiRouter.get("/summary/v2/:chat_id", controller.summaryV2);

aiRouter.get("/suggestion/:chat_id", controller.suggestion);

export default aiRouter;
