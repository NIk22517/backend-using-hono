import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { authRoutes } from "@/features/auth";
import { userRouter } from "@/features/user";
import { chatRouter } from "@/features/chat";
import SocketService from "./config/socket";
import { cors } from "hono/cors";
import { aiRouter } from "./features/ai";
import { startMessageScheduler } from "./core/schedule/MessageSchedule";
import { callRouter } from "./features/call";

const port = parseInt(process.env.PORT ?? "8080", 10);

const app = new Hono().use(
  cors({
    origin: ["http://localhost:3001"],
  })
);

app.route("/", authRoutes);
app.route("/", userRouter);
app.route("/", chatRouter);
app.route("/", aiRouter);
app.route("/", callRouter);

const server = serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  }
);

startMessageScheduler();

export const socketService = new SocketService(server);
