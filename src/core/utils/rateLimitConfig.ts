import type { RateLimitOptions } from "@/middleware/rateLimitMiddleware";

type RateLimitGroup<T extends Record<string, RateLimitOptions>> = {
  readonly [K in keyof T]: Readonly<T[K]>;
};

const defineGroup = <T extends Record<string, RateLimitOptions>>(
  group: T,
): RateLimitGroup<T> => group;

type Hours = `${number}h`;
type Minutes = `${number}m`;

type Duration = Hours | Minutes | `${number}h${number}m`;

const durationToSeconds = (duration: Duration): number => {
  const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?/);

  if (!match) {
    throw new Error("Invalid duration format");
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);

  return hours * 3600 + minutes * 60;
};

const window = (d: Duration) => durationToSeconds(d);

export const rateLimitConfig = {
  global: defineGroup({
    perIP: {
      route: "api",
      mode: "ip",
      windowSeconds: window("5m"),
      maxRequests: 1000,
    },
  }),

  auth: defineGroup({
    common: {
      route: "auth",
      mode: "ip",
      windowSeconds: window("1m"),
      maxRequests: 3,
    },
  }),

  user: defineGroup({
    common: {
      route: "user",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 2,
    },
  }),

  chat: defineGroup({
    list: {
      route: "chat",
      customKey: "list",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 10,
    },
    singleList: {
      route: "chat",
      customKey: "list:single",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 20,
    },
    coversationContact: {
      route: "chat",
      customKey: "contact",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 5,
    },
    createChat: {
      route: "chat",
      mode: "user",
      customKey: "create",
      windowSeconds: window("1m"),
      maxRequests: 1,
    },
    pinChat: {
      route: "chat",
      mode: "user",
      customKey: "pin",
      windowSeconds: window("1m"),
      maxRequests: 5,
    },

    sendMessage: {
      route: "chat",
      mode: "user",
      customKey: "send",
      windowSeconds: window("1m"),
      maxRequests: 50,
    },

    getMessages: {
      route: "chat",
      mode: "user",
      customKey: "message",
      windowSeconds: window("1m"),
      maxRequests: 10,
    },

    scheduleMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 20,
      customKey: "schedule",
    },

    getscheduleMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 20,
      customKey: "schedule:message",
    },

    deleteSchedule: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 10,
      customKey: "schedule:delete",
    },
    updateSchedule: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 5,
      customKey: "schedule:update",
    },

    markMessageRead: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 10,
      customKey: "message:read",
    },

    deleteMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 20,
      customKey: "message:delete",
    },
    messageStatus: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 20,
      customKey: "message:status",
    },
    searchMessage: {
      route: "chat",
      mode: "user",
      windowSeconds: window("1m"),
      maxRequests: 25,
      customKey: "message:search",
    },
  }),
} as const;

export type RateLimitConfig = typeof rateLimitConfig;
