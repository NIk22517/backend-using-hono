import { authMiddleware } from "@/middleware/authMiddleware";
import { UserController } from "./UserController";
import { services } from "@/core/di/container";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { UserSuccessResponseSchema } from "./user.schemas";
import {
  createAuthenticatedRequest,
  createSuccessResponse,
  createMultipartRequest,
} from "../../core/utils/createRouteUtils";

const controller = new UserController(services);

const userRouter = new OpenAPIHono().basePath("/user");

userRouter.use(authMiddleware);

const getCurrentUserRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Retrieve the authenticated user's profile information",
  request: createAuthenticatedRequest(),
  responses: createSuccessResponse({
    schema: UserSuccessResponseSchema,
    description: "Authenticated user profile",
  }),
});

userRouter.openapi(getCurrentUserRoute, controller.getTokenUser);

const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{user_id}",
  tags: ["Users"],
  summary: "Get user by ID",
  description: "Retrieve a user's profile information by their ID",
  request: createAuthenticatedRequest({
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
  }),
  responses: createSuccessResponse({
    schema: UserSuccessResponseSchema,
    description: "Authenticated user profile",
  }),
});

userRouter.openapi(getUserByIdRoute, controller.getUserById);

const updateUserRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Update user profile",
  description: "Update the authenticated user's profile information",
  request: createAuthenticatedRequest({
    body: createMultipartRequest({
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
    }),
  }),
  responses: createSuccessResponse({
    schema: UserSuccessResponseSchema,
    description: "Updated Data Successfully",
  }),
});

userRouter.openapi(updateUserRoute, controller.editUserDetails);

export default userRouter;
