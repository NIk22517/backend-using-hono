import { resend, resendConfig } from "@/config/resend.config";
import { db } from "@/db";
import { ChatInvite, chatInvites } from "@/db/inviteSchema";
import { usersTable } from "@/db/userSchema";
import { and, eq, isNull } from "drizzle-orm";
import { inviteEmailSend } from "./inviteEmail";

export interface SendInviteInput {
  invited_by: number;
  invitee_email: string;
  chat_id?: number;
  message?: string;
  ttl_hours?: number;
}

export class InviteServices {
  async sendInvite({
    invited_by,
    invitee_email,
    chat_id,
    message,
    ttl_hours = 72,
  }: SendInviteInput) {
    const [existingUser] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, invitee_email.toLowerCase()))
      .limit(1);

    await this.assertNoDuplicateInvite(
      existingUser?.id ?? null,
      invitee_email,
      chat_id ?? null,
    );

    const token = crypto.randomUUID();
    const [invite] = await db
      .insert(chatInvites)
      .values({
        invited_by,
        invitee_user_id: existingUser?.id ?? null,
        invitee_email: invitee_email.toLowerCase(),
        chat_id: chat_id ?? null,
        token,
        channel: existingUser ? "notification" : "email",
        status: "pending",
        message: message ?? null,
        expires_at: new Date(Date.now() + ttl_hours * 60 * 60 * 1000),
      })
      .returning();

    if (invite.channel === "email") {
      return await this.sendInviteEmail({
        invite,
        invited_by,
        invitee_email,
      });
    } else {
      console.log(`[Invite] Notification In App → ${invitee_email}`);
    }
  }

  private async sendInviteEmail({
    invite,
    invitee_email,
    invited_by,
  }: {
    invite: ChatInvite;
    invitee_email: string;
    invited_by: number;
  }): Promise<void> {
    console.log(`[Invite] Email → ${invitee_email}`);
    await inviteEmailSend({
      invite: {
        ...invite,
        email: invitee_email,
        name: "Nikhil",
      },
    });
  }

  private async assertNoDuplicateInvite(
    user_id: number | null,
    email: string,
    chat_id: number | null,
  ): Promise<void> {
    const conditions = [eq(chatInvites.status, "pending")];

    if (chat_id !== null) {
      if (user_id !== null) {
        conditions.push(eq(chatInvites.invitee_user_id, user_id));
        conditions.push(eq(chatInvites.chat_id, chat_id));
      } else {
        conditions.push(eq(chatInvites.invitee_email, email.toLowerCase()));
        conditions.push(eq(chatInvites.chat_id, chat_id));
      }
    } else {
      conditions.push(eq(chatInvites.invitee_email, email.toLowerCase()));
      conditions.push(isNull(chatInvites.chat_id));
    }

    const [existing] = await db
      .select({ id: chatInvites.id })
      .from(chatInvites)
      .where(and(...conditions))
      .limit(1);

    if (existing)
      throw new Error("A pending invite already exists for this user");
  }
}
