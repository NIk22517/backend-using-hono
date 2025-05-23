import { Hono } from "hono";
import { AiController } from "./AiController";
import { services } from "@/core/di/container";

const controller = new AiController(services);

const aiRouter = new Hono().basePath("/ai");

aiRouter.get("/summary/:chat_id", controller.summary);
aiRouter.get("/summary/v2/:chat_id", controller.summaryV2);

export default aiRouter;
