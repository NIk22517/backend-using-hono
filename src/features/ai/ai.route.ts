import { Hono } from "hono";
import { AiController } from "./AiController";
import { services } from "@/core/di/container";

const controller = new AiController(services);

const aiRouter = new Hono().basePath("/ai");

aiRouter.get("/summary/:chat_id", controller.summary);

export default aiRouter;
