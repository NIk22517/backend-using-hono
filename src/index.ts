import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { authRoutes } from "@/features/auth";
import { userRouter } from "@/features/user";
import { chatRouter } from "@/features/chat";
import SocketService from "./config/socket";
import { cors } from "hono/cors";

const port = parseInt(process.env.PORT ?? "8080", 10);

const app = new Hono().use(
  cors({
    origin: ["http://localhost:3001"],
  })
);

app.route("/", authRoutes);
app.route("/", userRouter);
app.route("/", chatRouter);

const server = serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  }
);

export const socketService = new SocketService(server);
