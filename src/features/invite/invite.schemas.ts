import { z } from "@hono/zod-openapi";

export const sendInviteSchema = z.object({
  data: z.object({
    invitee_email: z.email("Invalid email address"),
    message: z.string().max(500).optional(),
  }),
});

const tokenSchema = z.object({
  token: z.string().length(64, "Invalid token"),
});
