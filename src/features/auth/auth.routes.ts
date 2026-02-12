// auth.routes.ts
import { AuthController } from "./AuthController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { LogInRequestSchema, SignInRequestSchema } from "./auth.schemas";
import { toAppError } from "@/core/errors";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import { UserSuccessResponseSchema } from "../user/user.schemas";
import { standardErrorResponses } from "@/core/utils/createRouteUtils";
import { rateLimitMiddleware } from "@/middleware/rateLimitMiddleware";
import { rateLimitConfig } from "@/core/utils/rateLimitConfig";

const controller = new AuthController(services);

const authRoutes = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const error = toAppError(result.error);
      const errRes = {
        ...new ResponseBuilder("auth").failure({
          action: "auth_actions",
          error: error,
          message: error.message,
        }),
        errorCode: error.code,
      };
      return c.json(errRes, error.status);
    }
  },
}).basePath("/auth");

authRoutes.use(rateLimitMiddleware(rateLimitConfig.auth.common));

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
          schema: UserSuccessResponseSchema,
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
    ...standardErrorResponses,
  },
});

authRoutes.openapi(signInRoute, controller.signIn);

const logInRoute = createRoute({
  method: "post",
  path: "/log-in",
  tags: ["Authentication"],
  summary: "Authenticate user",
  description:
    "Log in with email and password to receive an authentication token",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LogInRequestSchema,
        },
      },
      description: "User login credentials",
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserSuccessResponseSchema,
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
      description: "Login successful",
    },
    ...standardErrorResponses,
  },
});

authRoutes.openapi(logInRoute, controller.logIn);

export default authRoutes;
