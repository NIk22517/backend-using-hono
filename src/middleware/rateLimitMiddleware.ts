import { redisClient } from "@/config/redis.client";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import { Context, MiddlewareHandler } from "hono";

export type RateLimitMode = "ip" | "user" | "both";

export type RateLimitRoute =
  | "auth"
  | "user"
  | "chat"
  | "api"
  | "upload"
  | "custom";

export interface RateLimitOptions {
  route?: RateLimitRoute;
  mode?: RateLimitMode;
  windowSeconds?: number;
  maxRequests?: number;
  customKey?: string;
  skip?: (c: Context) => boolean | Promise<boolean>;
  includeHeaders?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: number;
}

const RATE_LIMIT_LUA_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local current_time = tonumber(ARGV[3])
  
  -- Remove old entries outside the window
  redis.call("ZREMRANGEBYSCORE", key, 0, current_time - window)
  
  -- Count current requests in window
  local current = redis.call("ZCARD", key)
  
  if current < limit then
    -- Add new request
    redis.call("ZADD", key, current_time, current_time)
    redis.call("EXPIRE", key, window)
    return {1, current + 1, limit - current - 1}
  else
    -- Get oldest request time to calculate reset
    local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
    local reset_at = 0
    if #oldest > 0 then
      reset_at = tonumber(oldest[2]) + window
    end
    return {0, current, 0, reset_at}
  end
`;

const checkRateLimit = async ({
  maxRequests,
  windowSeconds,
  key,
}: Required<Pick<RateLimitOptions, "windowSeconds" | "maxRequests">> & {
  key: string;
}): Promise<RateLimitResult> => {
  const redis = redisClient.getClient();
  const currentTime = Math.floor(Date.now() / 1000);
  try {
    const result = (await redis.eval(RATE_LIMIT_LUA_SCRIPT, {
      keys: [key],
      arguments: [
        maxRequests.toString(),
        windowSeconds.toString(),
        currentTime.toString(),
      ],
    })) as number[];

    const allowed = result[0] === 1;
    const current = result[1];
    const remaining = result[2];
    const resetAt = result[3] || currentTime + windowSeconds;

    return {
      allowed,
      current,
      limit: maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error("[RateLimit] Redis error:", error);
    return {
      allowed: false,
      current: 0,
      limit: maxRequests,
      remaining: maxRequests,
      resetAt: currentTime + windowSeconds,
    };
  }
};

const getIdentifier = ({ c, mode }: { c: Context; mode: RateLimitMode }) => {
  const identifiers: string[] = [];
  if (mode === "user" || mode === "both") {
    const user = c.get("user") as { id: number } | undefined;
    if (user) {
      identifiers.push(`user:${user.id}`);
    }
  }
  if (mode === "ip" || mode === "both") {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-real-ip");

    if (ip) {
      identifiers.push(`ip:${ip}`);
    }
    if (!ip) {
      const userAgent = c.req.header("user-agent") || "unknown";
      const acceptLang = c.req.header("accept-language") || "unknown";
      const fingerprint = Buffer.from(`${userAgent}:${acceptLang}`)
        .toString("base64")
        .slice(0, 32);

      identifiers.push(`fingerprint:${fingerprint}`);
      return identifiers;
    }
  }
  return identifiers;
};

const setRateLimitHeaders = ({
  c,
  limitResult,
}: {
  c: Context;
  limitResult: RateLimitResult;
}) => {
  c.header("X-RateLimit-Limit", limitResult.limit.toString());
  c.header("X-RateLimit-Remaining", limitResult.remaining.toString());
  c.header("X-RateLimit-Reset", limitResult.resetAt.toString());

  if (!limitResult.allowed) {
    const retryAfter = limitResult.resetAt - Math.floor(Date.now() / 1000);
    c.header("Retry-After", Math.max(0, retryAfter).toString());
  }
};

export const rateLimitMiddleware = (
  options: RateLimitOptions = {},
): MiddlewareHandler => {
  const {
    route = "api",
    mode = "both",
    windowSeconds = 60,
    maxRequests = 100,
    customKey,
    skip,
    includeHeaders = true,
  } = options;

  return async (c, next) => {
    if (skip && (await skip(c))) {
      return await next();
    }
    const identifiers = getIdentifier({ c, mode });
    if (identifiers.length === 0) {
      if (mode === "user") {
        const res = new ResponseBuilder("middleware").failure({
          action: "rate_limit_middleware",
          error: "Unauthorized",
          message: "Authentication required",
        });
        return c.json(res, 401);
      }
      identifiers.push("ip:unknown");
    }

    let blocked = false;
    let limitResult: RateLimitResult | null = null;

    for (const identifier of identifiers) {
      const key = customKey
        ? `rate_limit:${route}:${customKey}:${identifier}`
        : `rate_limit:${route}:${identifier}`;

      const result = await checkRateLimit({ key, maxRequests, windowSeconds });
      if (!result.allowed) {
        blocked = true;
        limitResult = result;
        break;
      }
      if (!limitResult || result.remaining < limitResult.remaining) {
        limitResult = result;
      }
    }

    if (includeHeaders && limitResult) {
      setRateLimitHeaders({ c, limitResult });
    }
    if (blocked && limitResult) {
      const message = `Too many requests. Please try again in ${limitResult.resetAt - Math.floor(Date.now() / 1000)} seconds.`;
      const res = new ResponseBuilder("middleware").failure({
        action: "rate_limit_middleware",
        error: "Too Many Requests",
        message,
      });

      return c.json(res, 429);
    }

    await next();
  };
};
