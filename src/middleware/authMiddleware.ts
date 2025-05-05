import { JWT_SECRET } from "@/core/utils/EnvValidator";
import { MiddlewareHandler } from "hono";
import {
  verify,
  JsonWebTokenError,
  TokenExpiredError,
  JwtPayload,
} from "jsonwebtoken";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ message: "Missing or malformed token" }, 401);
  }

  try {
    const decoded = verify(authHeader, JWT_SECRET);

    if (typeof decoded !== "object" || !("id" in decoded)) {
      return c.json({ message: "Invalid token payload" }, 401);
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
      return c.json({ message: "Token has expired" }, 401);
    }
    if (err instanceof JsonWebTokenError) {
      return c.json({ message: "Invalid token" }, 401);
    }

    console.error("Unexpected JWT error:", err);
    return c.json({ message: "Authentication error" }, 500);
  }
};
