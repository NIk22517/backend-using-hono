import { Job } from "bullmq";
import { BaseQueueManager } from "../base/BaseQueueManager";
import { db } from "@/db";
import { chatScheduleMessages } from "@/db/chatSchema";
import { eq } from "drizzle-orm";
import { services } from "@/core/di/container";

export interface ScheduledMessageJobData {
  scheduleId: number;
  chatId: number;
  senderId: number;
  message: string;
}

export interface ScheduledMessageJobResult {
  success: boolean;
  messageId?: number;
  sentAt?: Date;
  error?: string;
}

export class ScheduledMessageQueue extends BaseQueueManager<
  ScheduledMessageJobData,
  ScheduledMessageJobResult
> {
  constructor() {
    super({
      queueName: "scheduled-messages",
      processor: async (job) => {
        return await this.process(job);
      },
    });
  }

  protected async process(
    job: Job<ScheduledMessageJobData, ScheduledMessageJobResult>,
  ): Promise<ScheduledMessageJobResult> {
    const { chatId, message, scheduleId, senderId } = job.data;
    const attemptNumber = job.attemptsMade + 1;
    console.log(
      `[ScheduledMessage] Processing ${scheduleId} (attempt ${attemptNumber}/${job.opts.attempts})`,
    );

    try {
      await db.transaction(async (tx) => {
        if (attemptNumber === 1) {
          await tx
            .update(chatScheduleMessages)
            .set({
              status: "processing",
              last_attempt_at: new Date(),
            })
            .where(eq(chatScheduleMessages.id, scheduleId));
        }

        await services.chatServices.sendMessage({
          chat_id: chatId.toString(),
          files: null,
          message,
          sender_id: senderId,
        });

        await tx
          .update(chatScheduleMessages)
          .set({
            status: "completed",
            completed_at: new Date(),
            error_message: null,
            active: false,
          })
          .where(eq(chatScheduleMessages.id, scheduleId));
      });

      console.log(`[Success] Message ${scheduleId} sent.`);

      return {
        success: true,
        messageId: scheduleId,
        sentAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      const isFinalAttempt = attemptNumber >= (job.opts.attempts ?? 3);

      await db
        .update(chatScheduleMessages)
        .set({
          status: isFinalAttempt ? "failed" : "pending",
          error_message: message,
          retry_count: attemptNumber,
          last_attempt_at: new Date(),
        })
        .where(eq(chatScheduleMessages.id, scheduleId));

      throw error;
    }
  }

  async scheduleMessage(
    data: ScheduledMessageJobData,
    scheduledAt: Date,
  ): Promise<Job<ScheduledMessageJobData, ScheduledMessageJobResult>> {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    console.log(
      `[ScheduledMessage] Scheduling ${data.scheduleId} for ${scheduledAt.toISOString()} (in ${Math.round(delay / 1000)}s)`,
    );
    return this.queue.add(
      `send-${data.scheduleId}`,
      { ...data },
      {
        jobId: `schedule-${data.scheduleId}`,
        delay: delay,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async removeSchedule(scheduleId: number) {
    const jobId = `schedule-${scheduleId}`;
    await this.removeJob(jobId);
    console.log(`[ScheduledMessage] Cancelled ${scheduleId}`);
  }

  async updateSchedule(data: ScheduledMessageJobData & { scheduledAt: Date }) {
    const jobId = `schedule-${data.scheduleId}`;
    const job = await this.getJob(jobId);

    if (job) {
      const state = await job.getState();
      if (state === "waiting" || state === "delayed") {
        await job.remove();
        console.log(`[ScheduledMessage] Removed old job ${jobId}`);
      } else {
        console.warn(
          `[ScheduledMessage] Cannot update ${jobId} - already ${state}`,
        );
        return;
      }
    }
    await this.scheduleMessage(
      {
        scheduleId: data.scheduleId,
        chatId: data.chatId,
        senderId: data.senderId,
        message: data.message || "",
      },
      data.scheduledAt,
    );
  }

  async bootstrap(): Promise<void> {
    console.log("[ScheduledMessage] Bootstrapping from database...");

    const pendingSchedules = await db
      .select()
      .from(chatScheduleMessages)
      .where(eq(chatScheduleMessages.status, "pending"));

    console.log(
      `[ScheduledMessage] Found ${pendingSchedules.length} pending messages`,
    );

    let scheduled = 0;
    let skipped = 0;

    for (const schedule of pendingSchedules) {
      const existingJob = await this.queue.getJob(`schedule-${schedule.id}`);

      if (existingJob) {
        skipped++;
        continue;
      }

      await this.scheduleMessage(
        {
          scheduleId: schedule.id,
          chatId: schedule.chat_id,
          senderId: schedule.sender_id,
          message: schedule.message || "",
        },
        schedule.scheduled_at,
      );

      scheduled++;
    }

    console.log(
      `[ScheduledMessage] Bootstrap complete: ${scheduled} scheduled, ${skipped} skipped`,
    );
  }
  protected override onCompleted(
    job: Job<ScheduledMessageJobData, ScheduledMessageJobResult>,
  ): void {
    console.log(
      `[ScheduledMessage] ✅ Message ${job.data.scheduleId} sent successfully`,
    );
  }

  protected override onFailed(
    job: Job<ScheduledMessageJobData, ScheduledMessageJobResult> | undefined,
    err: Error,
  ): void {
    if (job) {
      const isFinal = job.attemptsMade >= (job.opts.attempts || 3);
      console.error(
        `[ScheduledMessage] ${isFinal ? "💀 FINAL FAILURE" : "⚠️ Retrying"} - Message ${job.data.scheduleId}: ${err.message}`,
      );
    }
  }
}

export const scheduledMessageQueue = new ScheduledMessageQueue();
