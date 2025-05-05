import { authMiddleware } from "@/middleware/authMiddleware";
import { Hono } from "hono";
import { ChatController } from "./ChatController";
import { services } from "@/core/di/container";

const controller = new ChatController(services);
const chatRouter = new Hono().basePath("/chat").use(authMiddleware);

chatRouter.get("/", async (c) => {
  const data = await controller.getChats(c);
  return c.json(data);
});

chatRouter.post("/create", async (c) => {
  const data = await controller.createChat(c);
  return c.json(data);
});

chatRouter.post("/send-message", async (c) => {
  const data = await controller.sendMessage(c);
  return c.json(data);
});

chatRouter.get("/messages/:chat_id", async (c) => {
  const data = await controller.getChatMessages(c);
  return c.json(data);
});

chatRouter.get("/read/:chat_id", async (c) => {
  const data = await controller.markAsReadMsg(c);
  return c.json(data);
});

chatRouter.post("/messages/delete", async (c) => {
  const data = await controller.deleteMessages(c);
  return c.json(data);
});

export default chatRouter;
