import { z } from "zod";

export const ErrorCodes = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export type HttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

export class AppError<E = unknown> extends Error {
  readonly status: HttpStatus;
  readonly code: ErrorCode;
  readonly error?: E;
  readonly details?: unknown;

  constructor(
    message: string,
    status: HttpStatus,
    code: ErrorCode,
    error?: E,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.error = error;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(
      message,
      422,
      ErrorCodes.VALIDATION_FAILED,
      undefined,
      details,
    );
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, 404, ErrorCodes.NOT_FOUND);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, ErrorCodes.CONFLICT);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(
      message,
      400,
      ErrorCodes.BAD_REQUEST,
      undefined,
      details,
    );
  }

  static internal(
    message = "Internal server error",
    error?: unknown,
  ): AppError {
    return new AppError(message, 500, ErrorCodes.INTERNAL_ERROR, error);
  }
}

/**
 * Converts any error to AppError
 */
export const toAppError = (err: unknown): AppError => {
  // Already an AppError
  if (err instanceof AppError) {
    return err;
  }

  // Zod validation error
  if (err instanceof z.ZodError) {
    return new AppError(
      "Validation failed",
      422,
      ErrorCodes.VALIDATION_FAILED,
      undefined,
      err,
    );
  }

  // Standard Error with message
  if (err instanceof Error) {
    // Check if it's a specific known error type
    if (err.message.toLowerCase().includes("not found")) {
      return AppError.notFound(err.message);
    }
    if (err.message.toLowerCase().includes("unauthorized")) {
      return AppError.unauthorized(err.message);
    }
    if (err.message.toLowerCase().includes("forbidden")) {
      return AppError.forbidden(err.message);
    }

    return AppError.internal(err.message, err);
  }

  // Unknown error type
  return AppError.internal("An unexpected error occurred", err);
};
