import { Queue, Job, Worker, QueueEvents } from "bullmq";
import type { QueueOptions, WorkerOptions, JobsOptions } from "bullmq";
import {
  getQueueOptions,
  getWorkerOptions,
  type QueueName,
} from "../config/queue.config";

export type JobProcessor<T = any, R = any> = (job: Job<T>) => Promise<R>;

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}
export interface QueueHealth {
  queueName: string;
  healthy: boolean;
  workerRunning: boolean;
  stats: QueueStats;
  connection: boolean;
}

export abstract class BaseQueueManager<TData = any, TResult = any> {
  protected queue: Queue<TData, TResult>;
  protected worker: Worker<TData, TResult>;
  protected queueEvents: QueueEvents;
  protected queueName: QueueName;

  constructor({
    queueName,
    processor,
    customQueueOptions,
    customWorkerOptions,
  }: {
    queueName: QueueName;
    processor: JobProcessor<TData, TResult>;
    customQueueOptions?: Partial<QueueOptions>;
    customWorkerOptions?: Partial<WorkerOptions>;
  }) {
    this.queueName = queueName;
    // Initialize queue
    this.queue = new Queue<TData, TResult>(
      queueName,
      getQueueOptions(queueName, customQueueOptions),
    );
    // Initialize worker
    this.worker = new Worker<TData, TResult>(
      queueName,
      processor,
      getWorkerOptions(queueName, customWorkerOptions),
    );
    // Initialize events
    this.queueEvents = new QueueEvents(queueName, {
      connection: getQueueOptions(queueName).connection,
    });
    this.setupEventListeners();
  }

  protected setupEventListeners(): void {
    // Worker events
    this.worker.on("completed", (job: Job<TData, TResult>) => {
      this.onCompleted(job);
    });
    this.worker.on(
      "failed",
      (job: Job<TData, TResult> | undefined, err: Error) => {
        this.onFailed(job, err);
      },
    );

    this.worker.on("error", (err: Error) => {
      this.onError(err);
    });

    this.worker.on("active", (job: Job<TData, TResult>) => {
      this.onActive(job);
    });

    // Queue events
    this.queue.on("error", (err: Error) => {
      this.onError(err);
    });

    // Queue events (via QueueEvents)
    this.queueEvents.on("completed", ({ jobId }) => {
      console.log(`[${this.queueName}] Job ${jobId} completed`);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`[${this.queueName}] Job ${jobId} failed: ${failedReason}`);
    });
  }

  /**
   * Override these methods in child class for custom behavior
   */
  protected onCompleted(job: Job<TData, TResult>): void {
    console.log(`[${this.queueName}] ✅ Job ${job.id} completed`);
  }
  protected onFailed(job: Job<TData, TResult> | undefined, err: Error): void {
    if (job) {
      const isFinal = job.attemptsMade >= (job.opts.attempts || 3);
      console.error(
        `[${this.queueName}] ${isFinal ? "💀" : "⚠️"} Job ${job.id} failed: ${err.message}`,
      );
    }
  }

  protected onError(err: Error): void {
    console.error(`[${this.queueName}] ❌ Error: ${err.message}`);
  }

  protected onActive(job: Job<TData, TResult>): void {
    console.log(`[${this.queueName}] 🔄 Processing job ${job.id}`);
  }

  async getJob(jobId: string) {
    return await this.queue.getJob(jobId);
  }

  async removeJob(jobId: string) {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
    } else {
      console.log("job not found");
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<QueueHealth> {
    const stats = await this.getStats();
    const workerRunning = this.worker.isRunning();

    return {
      queueName: this.queueName,
      healthy: workerRunning && stats.waiting >= 0,
      workerRunning,
      stats,
      connection: true,
    };
  }

  /**
   * Clean completed jobs
   */
  async cleanCompleted(
    olderThanMs = 24 * 3600 * 1000,
    limit = 1000,
  ): Promise<void> {
    await this.queue.clean(olderThanMs, limit, "completed");
    console.log(`[${this.queueName}] 🧹 Cleaned completed jobs`);
  }

  /**
   * Clean failed jobs
   */
  async cleanFailed(
    olderThanMs = 7 * 24 * 3600 * 1000,
    limit = 1000,
  ): Promise<void> {
    await this.queue.clean(olderThanMs, limit, "failed");
    console.log(`[${this.queueName}] 🧹 Cleaned failed jobs`);
  }

  /**
   * Clean all old jobs
   */
  async cleanAll(): Promise<void> {
    await this.cleanCompleted();
    await this.cleanFailed();
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    console.log(`[${this.queueName}] ⏸️ Queue paused`);
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    console.log(`[${this.queueName}] ▶️ Queue resumed`);
  }

  /**
   * Drain the queue (remove all jobs)
   */
  async drain(): Promise<void> {
    await this.queue.drain();
    console.log(`[${this.queueName}] 🗑️ Queue drained`);
  }

  /**
   * Close queue and worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    console.log(`[${this.queueName}] 🛑 Closed`);
  }

  // ============================================
  // GETTERS
  // ============================================

  getQueue(): Queue<TData, TResult> {
    return this.queue;
  }

  getWorker(): Worker<TData, TResult> {
    return this.worker;
  }

  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }

  getName(): QueueName {
    return this.queueName;
  }

  isRunning(): boolean {
    return this.worker.isRunning();
  }
}
