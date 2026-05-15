import { AppError } from "@/core/errors";
import { PushTokenServiceTokenType } from "./notifications.schema";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { db } from "@/db";
import { pushTokens } from "@/db/pushNotificationSchema";
import { eq } from "drizzle-orm";

const expo = new Expo();

export class NotificationsServices {
  async updatePushToken({ data }: PushTokenServiceTokenType) {
    if (!Expo.isExpoPushToken(data.token)) {
      throw AppError.badRequest("Notification Token is invalid");
    }
    const [result] = await db
      .insert(pushTokens)
      .values({
        device_id: data.device_id,
        platform: data.platform,
        token: data.token,
        user_id: data.user_id,
      })
      .onConflictDoUpdate({
        target: [pushTokens.user_id, pushTokens.device_id],
        set: {
          device_id: data.device_id,
          platform: data.platform,
          token: data.token,
          user_id: data.user_id,
          updated_at: new Date(),
        },
      })
      .returning();

    return result;
  }

  async getPushToken({ user_id }: { user_id: number }) {
    const result = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.user_id, user_id));
    return result;
  }

  async sendNotification({
    payload,
    user_id,
  }: {
    user_id: number;
    payload: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };
  }) {
    const tokens = await this.getPushToken({ user_id });
    if (!tokens || tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map(({ token }) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: "default" as const,
        priority: "high" as const,
        badge: 1,
      }));

    if (!messages.length) return;
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < receipts.length; i++) {
          if (receipts[i].status === "error") {
            await db
              .delete(pushTokens)
              .where(eq(pushTokens.token, messages[i].to as string));
          }
        }
      } catch (err) {
        console.error("Push failed:", err);
      }
    }
  }
}
