import { z } from "@hono/zod-openapi";

/* -------------------------------------------------------
 * Base metadata
 * ----------------------------------------------------- */

export const ServiceMetaSchema = z.object({
  service: z.string(),
  action: z.string(),
});

/* -------------------------------------------------------
 * Success response
 * ----------------------------------------------------- */

export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  ServiceMetaSchema.extend({
    status: z.literal("success"),
    message: z.string(),
    data,
  });

/* -------------------------------------------------------
 * Error response
 * ----------------------------------------------------- */

export const createErrorResponseSchema = <
  E extends z.ZodTypeAny = z.ZodUnknown,
>(
  errorSchema?: E,
) =>
  ServiceMetaSchema.extend({
    status: z.literal("error"),
    message: z.string(),
    error: errorSchema ?? z.unknown(),
  });

/* -------------------------------------------------------
 * Standard OpenAPI responses
 * ----------------------------------------------------- */

export const createStandardResponses = <
  T extends z.ZodTypeAny,
  E extends z.ZodTypeAny = z.ZodUnknown,
>(
  dataSchema: T,
  errorSchema?: E,
  config?: {
    successDescription?: string;
    errorDescriptions?: Partial<
      Record<400 | 401 | 403 | 404 | 409 | 422 | 500, string>
    >;
  },
) => {
  const errorResponseSchema = createErrorResponseSchema(errorSchema);

  return {
    200: {
      content: {
        "application/json": {
          schema: createSuccessResponseSchema(dataSchema),
        },
      },
      description: config?.successDescription ?? "Success",
    },

    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[400] ?? "Bad Request",
    },

    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[401] ?? "Unauthorized",
    },

    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[403] ?? "Forbidden",
    },

    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[404] ?? "Not Found",
    },

    409: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[409] ?? "Conflict",
    },

    422: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[422] ?? "Unprocessable Entity",
    },

    500: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: config?.errorDescriptions?.[500] ?? "Internal Server Error",
    },
  };
};
