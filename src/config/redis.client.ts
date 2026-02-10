import { REDIS_URL } from "@/core/utils/EnvValidator";
import { createClient } from "redis";
import type { RedisClientOptions } from "redis";

export type RedisStatus = "ready" | "connecting" | "disconnected" | "error";

const defaultRedisConfig: RedisClientOptions = {
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number): number | Error => {
      if (retries > 5) {
        return new Error("Max retries reached");
      }
      return Math.min(retries * 50, 2000);
    },
  },
};

class RedisClient {
  private client: ReturnType<typeof createClient>;

  constructor(config?: Partial<RedisClientOptions>) {
    const redisConfig: RedisClientOptions = {
      ...defaultRedisConfig,
      ...config,
    };

    this.client = createClient(redisConfig);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on("connect", () => {
      console.log("[Redis] Connecting...");
    });

    this.client.on("ready", () => {
      console.log("[Redis] Ready");
    });

    this.client.on("error", (err: Error) => {
      console.error("[Redis] Error:", err.message);
    });

    this.client.on("end", () => {
      console.log("[Redis] Connection closed");
    });

    this.client.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  getClient(): ReturnType<typeof createClient> {
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}

export const redisClient = new RedisClient();
