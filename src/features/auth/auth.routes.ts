// auth.routes.ts
import { AuthController } from "./AuthController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { AuthErrorResponseSchema, AuthSuccessResponseSchema, SignInRequestSchema } from "./auth.schemas";

const controller = new AuthController(services);

const authRoutes = new OpenAPIHono().basePath("/auth");

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
            success: true,
            action: "auth_sign_in",
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
    204: {
      description: "No content - operation successful but no data returned",
    },
    400: {
      content: {
        "application/json": {
          schema: AuthErrorResponseSchema,
          example: {
            success: false,
            action: "auth_sign_in",
            message: "Not able to create new user",
            error: {
              issues: [
                {
                  path: ["email"],
                  message: "Provide a valid email",
                },
              ],
            },
          },
        },
      },
      description: "Bad request - validation error or duplicate user",
    },
    500: {
      content: {
        "application/json": {
          schema: AuthErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

authRoutes.openapi(signInRoute, async (c) => {
  const data = await controller.signIn(c);
  return c.json(data);
});

authRoutes.post("/log-in", async (c) => {
  const data = await controller.logIn(c);
  return c.json(data);
});

export default authRoutes;
