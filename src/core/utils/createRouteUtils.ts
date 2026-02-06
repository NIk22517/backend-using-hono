import { z } from "@hono/zod-openapi";
import type { RouteConfig } from "@hono/zod-openapi";
import { ChatErrorResponseSchema } from "../../features/chat/chat.schemas";

//headers
export const authHeaderSchema = z.object({
  authorization: z.string().openapi({
    example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    description: "JWT token for authentication",
  }),
});

//errors
export const standardErrorResponses = {
  400: {
    description: "Bad Request - Invalid request parameters or body",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
  401: {
    description: "Unauthorized - Missing or invalid authentication token",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
  403: {
    description: "Forbidden - Insufficient permissions",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
  404: {
    description: "Not Found - Requested resource does not exist",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
  409: {
    description: "Conflict - Resource already exists or conflicting state",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
  422: {
    description: "Validation Error - Request validation failed",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
  500: {
    description: "Internal Server Error - Unexpected server error",
    content: { "application/json": { schema: ChatErrorResponseSchema } },
  },
} as const;

export const createSuccessResponse = <T extends z.ZodTypeAny>({
  schema,
  description,
}: {
  schema: T;
  description: string;
}) => {
  return {
    ...standardErrorResponses,
    200: {
      description,
      content: {
        "application/json": {
          schema,
        },
      },
    } as const,
  };
};

export const createAuthenticatedRequest = <
  T extends RouteConfig["request"] = RouteConfig["request"],
>(
  additional?: Partial<T>,
) =>
  ({
    headers: authHeaderSchema,
    ...additional,
  }) as const;

export const createMultipartRequest = <T extends z.ZodTypeAny>({
  schema,
}: {
  schema: T;
}) =>
  ({
    content: {
      "application/x-www-form-urlencoded": { schema },
      "multipart/form-data": { schema },
    },
  }) as const;

export const createJsonRequest = <T extends z.ZodTypeAny>({
  schema,
  description,
  required = true,
}: {
  schema: T;
  description?: string;
  required?: boolean;
}) =>
  ({
    content: {
      "application/json": { schema },
    },
    description,
    required,
  }) as const;
