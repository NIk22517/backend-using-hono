import {
  createErrorResponseSchema,
  createSuccessResponseSchema,
} from "@/core/utils/responseSchemas";
import { z } from "@hono/zod-openapi";

export const signInSchema = z.object({
  name: z.string().min(1).openapi({
    example: "John Doe",
    description: "User full name",
  }),
  email: z.string().email().openapi({
    example: "user@example.com",
    description: "User email address",
  }),
  password: z.string().min(1).openapi({
    example: "password123",
    description: "User password",
  }),
});

export const logInSchema = z.object({
  email: z.string().email().openapi({
    example: "user@example.com",
    description: "User email address",
  }),
  password: z.string().min(1).openapi({
    example: "password123",
    description: "User password",
  }),
});

// Request body wrappers
export const SignInRequestSchema = z.object({
  data: signInSchema,
});

export const LogInRequestSchema = z.object({
  data: logInSchema,
});

export const UserDataSchema = z.object({
  id: z.number().int().openapi({
    example: 1,
    description: "User unique identifier",
  }),
  name: z.string().openapi({
    example: "John Doe",
    description: "User full name",
  }),
  email: z.string().email().openapi({
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
  token: z.string().openapi({
    example:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0.xxx",
    description: "JWT authentication token (expires in 7 days)",
  }),
});

export const AuthSuccessResponseSchema =
  createSuccessResponseSchema(UserDataSchema);

export const AuthErrorResponseSchema = createErrorResponseSchema(
  z.object({
    reason: z.string(),
  })
);
