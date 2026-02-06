import {
  createErrorResponseSchema,
  createSuccessResponseSchema,
} from "@/core/http/responseSchemas";
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

export const AuthErrorResponseSchema = createErrorResponseSchema(
  z.object({
    reason: z.string(),
  }),
);
