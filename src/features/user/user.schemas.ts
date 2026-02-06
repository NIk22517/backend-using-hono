import { createSuccessResponseSchema } from "@/core/http/responseSchemas";
import { usersTable } from "@/db/userSchema";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";

export const UserSelectSchema = createSelectSchema(usersTable);

export const UserSchema = UserSelectSchema.pick({
  id: true,
  name: true,
  email: true,
  avatar_url: true,
  created_at: true,
}).extend({
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
});

export const UserSuccessResponseSchema =
  createSuccessResponseSchema(UserSchema);

export type User = z.infer<typeof UserSchema>;
export type UserSelect = z.infer<typeof UserSelectSchema>;
