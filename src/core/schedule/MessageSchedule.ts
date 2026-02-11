import { db } from "@/db";
import { chatScheduleMessages } from "@/db/chatSchema";
import { ChatServices } from "@/features/chat";
import { and, eq, lte } from "drizzle-orm";
// import { eventEmitter } from "../events/eventEmitter";

const POLLING_INTERVAL_MS = 6_0000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10_000;

const dateSet = new Set<number>();

// eventEmitter.on("scheduleMessageTime", (payload) => {
//   const timestamp = new Date(payload.data.scheduled_at).getTime();
//   dateSet.add(timestamp);
// });

export const startMessageScheduler = async () => {
  console.log("🕒 Starting message scheduler...");

  try {
    const now = new Date();
    const scheduled = await db
      .select({
        scheduled_at: chatScheduleMessages.scheduled_at,
      })
      .from(chatScheduleMessages)
      .where(
        and(
          lte(chatScheduleMessages.scheduled_at, now),
          eq(chatScheduleMessages.status, "pending"),
        ),
      );

    for (const item of scheduled) {
      const ts = new Date(item.scheduled_at).getTime();
      dateSet.add(ts);
    }

    console.log(
      `✅ Bootstrapped ${scheduled.length} scheduled messages into dateSet.`,
    );
  } catch (err) {
    console.error("❌ Failed to bootstrap scheduler:", err);
  }

  // Start polling
  setInterval(processDueMessages, POLLING_INTERVAL_MS);
  console.log(`✅ Polling every ${POLLING_INTERVAL_MS / 1000}s.`);
};

const processDueMessages = async () => {
  const now = new Date();
  const nowTs = now.getTime();
  console.log(`[Scheduler] Checking at ${now.toISOString()}`);

  console.log(dateSet, "All Date in dateSet");

  if (![...dateSet].some((ts) => ts <= nowTs)) {
    console.log("[Scheduler] No due messages in dateSet.");
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const dueMessages = await tx
        .select()
        .from(chatScheduleMessages)
        .where(
          and(
            lte(chatScheduleMessages.scheduled_at, now),
            eq(chatScheduleMessages.status, "pending"),
          ),
        );

      if (!dueMessages.length) {
        console.log("[Scheduler] No messages to process.");
        return;
      }

      for (const msg of dueMessages) {
        const [claimed] = await tx
          .update(chatScheduleMessages)
          .set({
            status: "processing",
            last_attempt_at: new Date(),
          })
          .where(
            and(
              eq(chatScheduleMessages.id, msg.id),
              eq(chatScheduleMessages.status, "pending"),
            ),
          )
          .returning();

        if (!claimed) {
          console.warn(`[Skip] Message ${msg.id} already being handled.`);
          continue;
        }

        console.log(`[Process] Message ${msg.id}`);
        const chatService = new ChatServices();

        try {
          await chatService.sendMessage({
            chat_id: msg.chat_id.toString(),
            files: null,
            message: msg.message ?? "",
            sender_id: msg.sender_id,
          });

          await tx
            .update(chatScheduleMessages)
            .set({
              status: "completed",
              completed_at: new Date(),
              error_message: null,
              active: false,
            })
            .where(eq(chatScheduleMessages.id, msg.id));

          console.log(`[Success] Message ${msg.id} sent.`);
          for (const ts of dateSet) {
            if (ts <= nowTs) {
              dateSet.delete(ts);
            }
          }
        } catch (err: any) {
          const retryCount = msg.retry_count ?? 0;
          const retries = retryCount + 1;
          const failed = retries >= MAX_RETRIES;

          const nextRetry = failed
            ? msg.scheduled_at
            : new Date(
                now.getTime() + RETRY_DELAY_MS * Math.pow(2, retries - 1),
              );

          await tx
            .update(chatScheduleMessages)
            .set({
              status: failed ? "failed" : "pending",
              retry_count: retries,
              error_message: err?.message ?? "Unknown error",
              scheduled_at: failed ? msg.scheduled_at : nextRetry,
            })
            .where(eq(chatScheduleMessages.id, msg.id));

          console.error(
            `[${failed ? "Fail" : "Retry"}] Message ${msg.id}: ${err?.message}`,
          );
        }
      }
    });
  } catch (err) {
    console.error("[Scheduler] Transaction failed:", err);
  }
};
