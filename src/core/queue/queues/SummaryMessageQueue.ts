import { Job } from "bullmq";
import { BaseQueueManager } from "../base/BaseQueueManager";
import { services } from "@/core/di/container";

export interface SummaryMessageJobData {}

export interface SummaryMessageJobResult {
  success: boolean;
}

class SummaryMessageQueue extends BaseQueueManager<
  SummaryMessageJobData,
  SummaryMessageJobResult
> {
  constructor() {
    super({
      queueName: "scheduled-summary-chat-message",
      processor: async (job) => {
        return this.process(job);
      },
    });
  }

  protected async process(
    job: Job<SummaryMessageJobData, SummaryMessageJobResult>,
  ): Promise<SummaryMessageJobResult> {
    console.log("[SummaryMessageQueue] Processing daily chat summaries...");
    await services.AiServices.chatSummaryAll();
    return { success: true };
  }

  async scheduleDailySummary(): Promise<void> {
    const repeatableJobs = await this.queue.getJobSchedulers();
    for (const job of repeatableJobs) {
      await this.queue.removeJobScheduler(job.key);
    }
    await this.queue.add(
      "daily-summary",
      {},
      {
        jobId: "daily-summary",
        repeat: { pattern: "0 0 * * *" },
        // repeat: { pattern: "* * * * *" },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    console.log("[SummaryMessageQueue] ✅ Daily summary job scheduled");
  }
}

export const summaryMessageQueue = new SummaryMessageQueue();
