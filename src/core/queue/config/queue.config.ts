import { REDIS_PASSWORD, REDIS_URL } from "@/core/utils/EnvValidator";
import { ConnectionOptions, QueueOptions, WorkerOptions } from "bullmq";

export interface QueueConfig {
  connection: ConnectionOptions;
  queueOptions: Omit<QueueOptions, "connection">;
  workerOptions: Omit<WorkerOptions, "connection">;
}

export const DEFAULT_QUEUE_OPTIONS: Omit<QueueOptions, "connection"> = {
  prefix: "bull",
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
      count: 5000,
    },
  },
};

export const DEFAULT_WORKER_OPTIONS: Omit<WorkerOptions, "connection"> = {
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 60000,
  },
  lockDuration: 30000,
};

export const QUEUE_NAMES = {
  SCHEDULED_MESSAGES: "scheduled-messages",
  EMAIL_NOTIFICATIONS: "email-notifications",
  PUSH_NOTIFICATIONS: "push-notifications",
  FILE_PROCESSING: "file-processing",
  DATA_EXPORT: "data-export",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function getRedisConnection(): ConnectionOptions {
  return {
    url: REDIS_URL,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function createQueueConfig(
  overrides?: Partial<QueueConfig>,
): QueueConfig {
  const connection = overrides?.connection || getRedisConnection();

  return {
    connection,
    queueOptions: {
      ...DEFAULT_QUEUE_OPTIONS,
      ...overrides?.queueOptions,
    },
    workerOptions: {
      ...DEFAULT_WORKER_OPTIONS,
      ...overrides?.workerOptions,
    },
  };
}

export function getQueueOptions(
  queueName: QueueName,
  customOptions?: Partial<QueueOptions>,
): QueueOptions {
  const config = createQueueConfig();

  return {
    connection: config.connection,
    ...config.queueOptions,
    ...customOptions,
  };
}

export function getWorkerOptions(
  queueName: QueueName,
  customOptions?: Partial<WorkerOptions>,
): WorkerOptions {
  const config = createQueueConfig();

  return {
    connection: config.connection,
    ...config.workerOptions,
    ...customOptions,
  };
}
