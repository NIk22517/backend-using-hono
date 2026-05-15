import { createSuccessResponseSchema } from "@/core/http/responseSchemas";
import { pushTokens } from "@/db/pushNotificationSchema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "@hono/zod-openapi";

export const PushInsertSchema = createInsertSchema(pushTokens);
export const PushSelectSchema = createSelectSchema(pushTokens);

export const PushPayload = z.object({
  data: PushInsertSchema.pick({
    device_id: true,
    platform: true,
    token: true,
  }),
});

export const PushTokenServiceToken = z.object({
  data: PushInsertSchema.pick({
    device_id: true,
    platform: true,
    token: true,
    user_id: true,
  }),
});

export const PushSuccessResponse =
  createSuccessResponseSchema(PushSelectSchema);

export type PushTokenServiceTokenType = z.infer<typeof PushTokenServiceToken>;
