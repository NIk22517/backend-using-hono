import { Hono } from "hono";
import { AiController } from "./AiController";
import { services } from "@/core/di/container";

const controller = new AiController(services);

const aiRouter = new Hono().basePath("/ai");

aiRouter.get("/summary/:chat_id", async (c) => {
  const data = await controller.summary(c);
  return c.json(data);
});

export default aiRouter;
