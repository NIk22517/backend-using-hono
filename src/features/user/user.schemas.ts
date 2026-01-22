import {
  createErrorResponseSchema,
  createSuccessResponseSchema,
} from "@/core/http/responseSchemas";
import { z } from "@hono/zod-openapi";

export const UserSchema = z.object({
  id: z.number().int().openapi({
    example: 1,
    description: "User unique identifier",
  }),
  name: z.string().openapi({
    example: "John Doe",
    description: "User full name",
  }),
  email: z.email().openapi({
    example: "user@example.com",
    description: "User email address",
  }),
  avatar_url: z.string().nullable().openapi({
    example: "https://example.com/avatar.jpg",
    description: "URL to user's avatar image",
  }),
  created_at: z.union([z.date(), z.string(), z.null()]).openapi({
    type: "string",
    format: "date-time",
    example: "2024-01-07T10:30:00.000Z",
    description: "Account creation timestamp",
  }),
});

export const UserSuccessResponseSchema =
  createSuccessResponseSchema(UserSchema);

export const UserErrorResponseSchema = createErrorResponseSchema(z.string());
