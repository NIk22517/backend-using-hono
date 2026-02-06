import { z } from "@hono/zod-openapi";

const ServiceMetaSchema = z.object({
  service: z.string(),
  action: z.string(),
});

export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  ServiceMetaSchema.extend({
    status: z.literal("success"),
    message: z.string(),
    data,
  }).openapi("SuccessResponse");

export const createErrorResponseSchema = <
  E extends z.ZodTypeAny = z.ZodTypeAny
>(
  error?: E
) =>
  ServiceMetaSchema.extend({
    status: z.literal("error"),
    message: z.string(),
    error: error ?? z.any(),
  }).openapi("ErrorResponse");
