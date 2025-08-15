import { db } from "@/db";
import {
  callParticipants,
  CallStatus,
  chatCalls,
  ParticipantStatus,
} from "@/db/callSchema";
import { chatMembers } from "@/db/chatSchema";
import { socketService } from "@/index";
import { and, eq, ne } from "drizzle-orm";
import { usersTable } from "@/db/userSchema";

export class CallServices {
  async createCall({ chat_id, user_id }: { chat_id: number; user_id: number }) {
    const members = await db
      .select()
      .from(chatMembers)
      .where(
        and(eq(chatMembers.chat_id, chat_id), ne(chatMembers.user_id, user_id))
      );

    const [call] = await db
      .insert(chatCalls)
      .values({
        chat_id,
        caller_id: user_id,
        call_type: "audio",
        status: "initiated",
      })
      .returning({ id: chatCalls.id });

    // Insert caller as "accepted" + invited members
    await db.insert(callParticipants).values([
      { call_id: call.id, user_id, status: "accepted" },
      ...members.map((member) => ({
        call_id: call.id,
        user_id: member.user_id,
        status: "invited" as ParticipantStatus,
      })),
    ]);

    // Tell invited members there is an incoming call
    for (const member of members) {
      socketService.sendToUser({
        userId: member.user_id,
        event: "call:incoming",
        args: [
          {
            call_id: call.id,
            call_type: "audio",
            caller_id: user_id,
          },
        ],
      });
    }

    return call;
  }

  async callControl({
    call_id,
    user_id,
    status,
  }: {
    call_id: number;
    user_id: number;
    status: ParticipantStatus;
  }) {
    const result = await db
      .update(callParticipants)
      .set({ status })
      .where(
        and(
          eq(callParticipants.call_id, call_id),
          eq(callParticipants.user_id, user_id)
        )
      )
      .returning();

    const participants = await db
      .select()
      .from(callParticipants)
      .where(eq(callParticipants.call_id, call_id));

    let newCallStatus: CallStatus = "initiated";
    const hasAccepted = participants.some((p) => p.status === "accepted");
    const allEndedOrRejected = participants.every(
      (p) => p.status === "left" || p.status === "rejected"
    );

    if (hasAccepted) {
      newCallStatus = "ongoing";
    }
    if (allEndedOrRejected) {
      newCallStatus = "ended";
    }

    const [callData] = await db
      .update(chatCalls)
      .set({ status: newCallStatus })
      .where(eq(chatCalls.id, call_id))
      .returning();

    // UPDATED: Only notify after status changes, not for initial call creation
    if (status === "accepted" && hasAccepted) {
      // Notify all participants when someone accepts
      for (const p of participants) {
        socketService.sendToUser({
          event: "call:accepted",
          userId: p.user_id,
          args: [{ by: user_id, call_id }],
        });
      }
    } else if (allEndedOrRejected) {
      for (const p of participants) {
        socketService.sendToUser({
          event: "call:ended",
          userId: p.user_id,
          args: [{ call_id, ended_by: user_id }],
        });
      }
    }

    return result;
  }

  async getParticipants({ call_id }: { call_id: number }) {
    return await db
      .select({
        user_id: callParticipants.user_id,
        status: callParticipants.status,
        name: usersTable.name,
        email: usersTable.email,
        call_id: callParticipants.call_id,
      })
      .from(callParticipants)
      .leftJoin(usersTable, eq(callParticipants.user_id, usersTable.id))
      .where(eq(callParticipants.call_id, call_id));
  }
}
