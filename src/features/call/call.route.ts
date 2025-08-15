import { authMiddleware } from "@/middleware/authMiddleware";
import { Hono } from "hono";
import { CallController } from "./CallController";
import { services } from "@/core/di/container";

const controller = new CallController(services);
const callRouter = new Hono().basePath("/call").use(authMiddleware);

callRouter.get("/:call_id", async (c) => {
  const data = await controller.getParticipants(c);
  return c.json(data);
});

callRouter.post("/create/:chat_id", async (c) => {
  const data = await controller.createCall(c);
  return c.json(data);
});

callRouter.post("/control", async (c) => {
  const data = await controller.callControl(c);
  return c.json(data);
});

export default callRouter;
