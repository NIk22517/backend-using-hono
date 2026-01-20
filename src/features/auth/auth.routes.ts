// auth.routes.ts
import { AuthController } from "./AuthController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  AuthErrorResponseSchema,
  AuthSuccessResponseSchema,
  SignInRequestSchema,
} from "./auth.schemas";

const controller = new AuthController(services);

const authRoutes = new OpenAPIHono().basePath("/auth");

const commonErrorResponses = {
  400: {
    description: "Bad Request",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
  404: {
    description: "Not Found",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
  409: {
    description: "Conflict",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
  422: {
    description: "Validation Error",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
  500: {
    description: "Internal Server Error",
    content: {
      "application/json": {
        schema: AuthErrorResponseSchema,
      },
    },
  },
} as const;

const signInRoute = createRoute({
  method: "post",
  path: "/sign-in",
  tags: ["Authentication"],
  summary: "Create a new user account",
  description: "Register a new user with name, email, and password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SignInRequestSchema,
        },
      },
      description: "User registration data",
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AuthSuccessResponseSchema,
          example: {
            service: "auth",
            action: "auth_sign_in",
            status: "success",
            message: "User Created Successfully",
            data: {
              id: 1,
              email: "user@example.com",
              name: "John Doe",
              avatar_url: null,
              created_at: "2024-01-07T10:30:00.000Z",
              token:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIn0.xxx",
            },
          },
        },
      },
      description: "User created successfully",
    },
    ...commonErrorResponses,
  },
});

authRoutes.openapi(signInRoute, controller.signIn);

authRoutes.post("/log-in", async (c) => {
  const data = await controller.logIn(c);
  return c.json(data);
});

export default authRoutes;
