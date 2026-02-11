import { scheduledMessageQueue } from "./queues/ScheduledMessageQueue";
import type { BaseQueueManager } from "./base/BaseQueueManager";
import type { QueueHealth } from "./base/BaseQueueManager";

export class QueueManager {
  private queues: Map<string, BaseQueueManager> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.registerQueue(scheduledMessageQueue);
  }

  private registerQueue(queue: BaseQueueManager): void {
    const name = queue.getName();
    this.queues.set(name, queue);
    console.log(`[QueueManager] Registered queue: ${name}`);
  }

  getQueue<T extends BaseQueueManager>(name: string): T | undefined {
    return this.queues.get(name) as T | undefined;
  }

  getAllQueues(): BaseQueueManager[] {
    return Array.from(this.queues.values());
  }

  async initialize(): Promise<void> {
    console.log("[QueueManager] 🚀 Initializing queues...");

    try {
      await scheduledMessageQueue.bootstrap();
      this.startPeriodicCleanup();

      console.log("[QueueManager] ✅ All queues initialized");
    } catch (error) {
      console.error("[QueueManager] ❌ Initialization failed:", error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log("[QueueManager] 🛑 Shutting down queues...");

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close(),
    );

    await Promise.all(closePromises);

    console.log("[QueueManager] ✅ All queues shut down");
  }

  async getHealth(): Promise<Record<string, QueueHealth>> {
    const health: Record<string, QueueHealth> = {};

    for (const [name, queue] of this.queues) {
      health[name] = await queue.getHealth();
    }

    return health;
  }

  async getSystemHealth(): Promise<{
    healthy: boolean;
    queues: Record<string, QueueHealth>;
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
  }> {
    const queues = await this.getHealth();
    const queueList = Object.values(queues);

    const healthy = queueList.filter((q) => q.healthy).length;
    const unhealthy = queueList.length - healthy;

    return {
      healthy: unhealthy === 0,
      queues,
      summary: {
        total: queueList.length,
        healthy,
        unhealthy,
      },
    };
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(
      async () => {
        console.log("[QueueManager] 🧹 Running periodic cleanup...");
        await this.cleanupAllQueues();
      },
      6 * 3600 * 1000,
    );
  }

  async cleanupAllQueues(): Promise<void> {
    const cleanupPromises = Array.from(this.queues.values()).map((queue) =>
      queue.cleanAll(),
    );

    await Promise.all(cleanupPromises);
    console.log("[QueueManager] ✅ Cleanup complete");
  }

  async pauseAll(): Promise<void> {
    const pausePromises = Array.from(this.queues.values()).map((queue) =>
      queue.pause(),
    );

    await Promise.all(pausePromises);
    console.log("[QueueManager] ⏸️ All queues paused");
  }

  async resumeAll(): Promise<void> {
    const resumePromises = Array.from(this.queues.values()).map((queue) =>
      queue.resume(),
    );

    await Promise.all(resumePromises);
    console.log("[QueueManager] ▶️ All queues resumed");
  }

  async drainAll(): Promise<void> {
    const drainPromises = Array.from(this.queues.values()).map((queue) =>
      queue.drain(),
    );

    await Promise.all(drainPromises);
    console.log("[QueueManager] 🗑️ All queues drained");
  }
}

export const queueManager = new QueueManager();
