// auth.routes.ts
import { Hono } from "hono";
import { AuthController } from "./AuthController";
import { services } from "@/core/di/container";

const controller = new AuthController(services);

const authRoutes = new Hono().basePath("/auth");
authRoutes.post("/sign-in", async (c) => {
  const data = await controller.signIn(c);
  return c.json(data);
});

authRoutes.post("/log-in", async (c) => {
  const data = await controller.logIn(c);
  return c.json(data);
});

export default authRoutes;
