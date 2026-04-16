import {
  createAuthenticatedRequest,
  createMultipartRequest,
  createSuccessResponse,
} from "@/core/utils/createRouteUtils";
import { createRoute, z } from "@hono/zod-openapi";
import { UserSuccessResponseSchema } from "./user.schemas";

export const getCurrentUserRoute = createRoute({
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

export const getUserByIdRoute = createRoute({
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

export const updateUserRoute = createRoute({
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
