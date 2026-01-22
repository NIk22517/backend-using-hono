import { authMiddleware } from "@/middleware/authMiddleware";
import { UserController } from "./UserController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  UserErrorResponseSchema,
  UserSuccessResponseSchema,
} from "./user.schemas";

const controller = new UserController(services);

const userRouter = new OpenAPIHono().basePath("/user");

userRouter.use(authMiddleware);

const getCurrentUserRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Retrieve the authenticated user's profile information",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
  },
  responses: {
    200: {
      description: "Authenticated user profile",
      content: {
        "application/json": {
          schema: UserSuccessResponseSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
      description: "Bad Request",
    },
    401: {
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
    },
  },
});

userRouter.openapi(getCurrentUserRoute, controller.getTokenUser);

const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{user_id}",
  tags: ["Users"],
  summary: "Get user by ID",
  description: "Retrieve a user's profile information by their ID",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    params: z.object({
      user_id: z.coerce.number().openapi({
        param: {
          name: "user_id",
          in: "path",
        },
        example: "1",
        description: "User ID",
      }),
    }),
  },
  responses: {
    200: {
      description: "Authenticated user profile",
      content: {
        "application/json": {
          schema: UserSuccessResponseSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
      description: "Bad Request",
    },
    401: {
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
    },
  },
});

userRouter.openapi(getUserByIdRoute, controller.getUserById);

const updateUserRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Update user profile",
  description: "Update the authenticated user's profile information",
  request: {
    headers: z.object({
      authorization: z.string().openapi({
        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      }),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            name: z.string().optional(),
            file: z
              .file()
              .openapi({
                type: "string",
                format: "binary",
              })
              .optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authenticated user profile",
      content: {
        "application/json": {
          schema: UserSuccessResponseSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
      description: "Bad Request",
    },
    401: {
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: UserErrorResponseSchema,
        },
      },
    },
  },
});

userRouter.openapi(updateUserRoute, controller.editUserDetails);

export default userRouter;
