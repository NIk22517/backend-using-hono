import type { RateLimitOptions } from "@/middleware/rateLimitMiddleware";

type RateLimitGroup<T extends Record<string, RateLimitOptions>> = {
  readonly [K in keyof T]: Readonly<T[K]>;
};

const defineGroup = <T extends Record<string, RateLimitOptions>>(
  group: T,
): RateLimitGroup<T> => group;

export const rateLimitConfig = {
  global: defineGroup({
    perIP: {
      route: "api",
      mode: "ip",
      windowSeconds: 60 * 60,
      maxRequests: 1000,
    },
  }),

  auth: defineGroup({
    common: {
      route: "auth",
      mode: "ip",
      windowSeconds: 300,
      maxRequests: 3,
    },
  }),

  chat: defineGroup({
    sendMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: 60,
      maxRequests: 60,
    },

    createChat: {
      route: "chat",
      mode: "user",
      windowSeconds: 3600,
      maxRequests: 10,
    },

    scheduleMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: 300,
      maxRequests: 20,
      customKey: "schedule",
    },

    deleteMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: 60,
      maxRequests: 30,
    },
  }),

  user: defineGroup({
    updateProfile: {
      route: "user",
      mode: "user",
      windowSeconds: 300,
      maxRequests: 10,
    },

    uploadAvatar: {
      route: "user",
      mode: "user",
      windowSeconds: 3600,
      maxRequests: 5,
    },

    searchUsers: {
      route: "user",
      mode: "user",
      windowSeconds: 60,
      maxRequests: 30,
    },
  }),
} as const;

export type RateLimitConfig = typeof rateLimitConfig;
