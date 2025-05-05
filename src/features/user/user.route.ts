import { authMiddleware } from "@/middleware/authMiddleware";
import { Hono } from "hono";
import { UserController } from "./UserController";
import { services } from "@/core/di/container";

const controller = new UserController(services);

const userRouter = new Hono().basePath("/user").use(authMiddleware);

userRouter.get("/", (c) => {
  const data = c.get("user");
  return c.json(data);
});

userRouter.post("/", async (c) => {
  const data = await controller.editUserDetails(c);
  return c.json(data);
});

userRouter.get("/:user_id", async (c) => {
  const data = await controller.getUserById(c);
  return c.json(data);
});

export default userRouter;
