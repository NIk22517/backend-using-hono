import { OpenAPIHono } from "@hono/zod-openapi";
import { serve } from "@hono/node-server";
import { authRoutes } from "@/features/auth";
import { userRouter } from "@/features/user";
import { chatRouter } from "@/features/chat";
import SocketService from "./config/socket";
import { cors } from "hono/cors";
import { aiRouter } from "./features/ai";
import { startMessageScheduler } from "./core/schedule/MessageSchedule";
import { callRouter } from "./features/call";
import { swaggerUI } from "@hono/swagger-ui";
import { Scalar } from "@scalar/hono-api-reference";
import { redisClient } from "./config/redis.client";
import { queueManager } from "./core/queue/QueueManager";
import { rateLimitMiddleware } from "./middleware/rateLimitMiddleware";
import { rateLimitConfig } from "./core/utils/rateLimitConfig";
import { pool } from "./db";

const port = parseInt(process.env.PORT ?? "8080", 10);

const app = new OpenAPIHono();

app
  .use(
    cors({
      origin: ["http://localhost:3001"],
    }),
  )
  .use(rateLimitMiddleware(rateLimitConfig.global.perIP));

app.route("/", authRoutes);
app.route("/", userRouter);
app.route("/", chatRouter);
app.route("/", aiRouter);
app.route("/", callRouter);

// OpenAPI documentation endpoint
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "API Documentation",
    description:
      "Complete API documentation with authentication, chat, and AI features",
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: "Development server",
    },
  ],
  tags: [
    { name: "Authentication", description: "User authentication endpoints" },
    { name: "Users", description: "User management endpoints" },
    { name: "Chat", description: "Chat and messaging endpoints" },
    { name: "AI", description: "AI-powered features" },
    { name: "Calls", description: "Voice/video call endpoints" },
  ],
});

// Swagger UI endpoint
app.get("/ui", swaggerUI({ url: "/doc" }));

// Scalar API Reference (modern alternative to Swagger UI)
app.get(
  "/reference",
  Scalar({
    spec: {
      url: "/doc",
    },
  }),
);

export let socketService: SocketService;

export const initialize = async () => {
  try {
    console.log("Starting application...");
    console.log("[DB] Connecting...");
    await pool.query("SELECT 1");
    console.log("[DB] Connected successfully ✅");

    if (!redisClient.getClient().isOpen) {
      await redisClient.connect();
      console.log("[Redis] Connected");
    }

    await queueManager.initialize();

    const server = serve(
      {
        fetch: app.fetch,
        port: port,
      },
      (info) => {
        console.log(`Server listening on http://localhost:${info.port}`);
        console.log(`API Documentation: http://localhost:${info.port}/ui`);
        console.log(`API Reference: http://localhost:${info.port}/reference`);
      },
    );

    // startMessageScheduler();
    socketService = new SocketService(server);
    console.log("Application started successfully 🚀");
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

initialize();

const gracefulShutdown = async () => {
  console.log("Shutting down...");
  await pool.end();
  console.log("[DB] Disconnected");
  await redisClient.disconnect();
  await queueManager.shutdown();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
