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

chatRouter.get("/list/:chat_id", async (c) => {
  const data = await controller.getSingleChatList(c);
  return c.json(data);
});

chatRouter.get("/conversation-contacts", async (c) => {
  const data = await controller.getConversationContact(c);
  return c.json(data);
});

chatRouter.post("/create", async (c) => {
  const data = await controller.createChat(c);
  return c.json(data);
});

chatRouter.post("/pin", async (c) => {
  const data = await controller.pinUnpinChat(c);
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

chatRouter.post("/messages/schedule", async (c) => {
  const data = await controller.scheduleMessages(c);
  return c.json(data);
});

chatRouter.get("/schedule/:chat_id", async (c) => {
  const data = await controller.getScheduleMessage(c);
  return c.json(data);
});

chatRouter.delete("/schedule/:schedule_id", async (c) => {
  const data = await controller.deleteScheduleMessage(c);
  return c.json(data);
});

chatRouter.post("/schedule", async (c) => {
  const data = await controller.updateScheduleMessages(c);
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

chatRouter.get("/read-status/:chat_id/:message_id", async (c) => {
  const data = await controller.checkMessageStatus(c);
  return c.json(data);
});

export default chatRouter;
