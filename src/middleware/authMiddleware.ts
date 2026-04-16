import { HttpStatus } from "@/core/errors";
import { Environment } from "@/core/utils/EnvValidator";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import { MiddlewareHandler } from "hono";
import {
  verify,
  JsonWebTokenError,
  TokenExpiredError,
  JwtPayload,
} from "jsonwebtoken";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const fail = (message: string, status: HttpStatus) => {
    const res = new ResponseBuilder("middleware").failure({
      action: "auth_middleware",
      error: message,
      message,
    });
    return c.json(res, status);
  };
  if (!authHeader) {
    return fail("Missing or malformed token", 401);
  }

  try {
    const decoded = verify(authHeader, Environment.JWT_SECRET);

    if (typeof decoded !== "object" || !("id" in decoded)) {
      return fail("Invalid token payload", 401);
    }

    const payload = decoded as JwtPayload & {
      id: number;
      name: string;
      email: string;
    };

    c.set("user", {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      password: "",
      avatar_url: null,
      created_at: payload.created_at,
    });

    await next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return fail("Token has expired", 401);
    }
    if (err instanceof JsonWebTokenError) {
      return fail("Invalid token", 401);
    }

    console.error("Unexpected JWT error:", err);
    return fail("Authentication error", 500);
  }
};
