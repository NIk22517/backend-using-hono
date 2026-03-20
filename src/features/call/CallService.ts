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
  async createCall({
    chat_id,
    user_id,
    user_name,
  }: {
    chat_id: number;
    user_id: number;
    user_name: string;
  }) {
    const members = await db
      .select()
      .from(chatMembers)
      .where(
        and(eq(chatMembers.chat_id, chat_id), ne(chatMembers.user_id, user_id)),
      );

    const [call] = await db
      .insert(chatCalls)
      .values({
        chat_id,
        caller_id: user_id,
        call_type: "audio",
        status: "ringing",
      })
      .returning({ id: chatCalls.id });

    const now = new Date();

    await db.insert(callParticipants).values([
      {
        call_id: call.id,
        user_id,
        status: "accepted",
        joined_at: now,
      },
      ...members.map((member) => ({
        call_id: call.id,
        user_id: member.user_id,
        status: "invited" as ParticipantStatus,
      })),
    ]);

    for (const member of members) {
      socketService.sendToUser({
        userId: member.user_id,
        event: "call:incoming",
        args: [
          {
            call_id: call.id,
            call_type: "audio",
            caller_id: user_id,
            caller_name: user_name,
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
    reason,
  }: {
    call_id: number;
    user_id: number;
    status: ParticipantStatus;
    reason: "manual" | "timeout";
  }) {
    const now = new Date();

    const participantUpdate: {
      status: ParticipantStatus;
      joined_at?: Date;
      left_at?: Date;
    } = { status };

    if (status === "accepted") {
      participantUpdate.joined_at = now;
    }
    if (status === "left" || status === "rejected") {
      participantUpdate.left_at = now;
    }

    const result = await db
      .update(callParticipants)
      .set(participantUpdate)
      .where(
        and(
          eq(callParticipants.call_id, call_id),
          eq(callParticipants.user_id, user_id),
        ),
      )
      .returning();

    const [participants, callRow] = await Promise.all([
      db
        .select()
        .from(callParticipants)
        .where(eq(callParticipants.call_id, call_id)),

      db
        .select({
          status: chatCalls.status,
          started_at: chatCalls.started_at,
          caller_id: chatCalls.caller_id,
        })
        .from(chatCalls)
        .where(eq(chatCalls.id, call_id))
        .then((r) => r[0]),
    ]);

    const wasRinging = callRow?.status === "ringing";
    const wasOngoing = callRow?.status === "ongoing";
    const isCallerLeaving = user_id === callRow?.caller_id && status === "left";

    const calleeParticipants = participants.filter(
      (p) => p.user_id !== callRow?.caller_id,
    );
    const allCalleesTerminal = calleeParticipants.every(
      (p) => p.status === "left" || p.status === "rejected",
    );
    const acceptedParticipants = participants.filter(
      (p) => p.status === "accepted",
    );
    const acceptedCount = acceptedParticipants.length;

    const isCallFullyEnded =
      isCallerLeaving ||
      allCalleesTerminal ||
      (wasOngoing && acceptedCount <= 1);

    let newCallStatus: CallStatus = "ringing";

    if (acceptedCount >= 2) {
      newCallStatus = "ongoing";
    }

    if (isCallFullyEnded) {
      if (wasRinging && isCallerLeaving) {
        newCallStatus = "cancelled";
      } else if (wasRinging && allCalleesTerminal) {
        newCallStatus = reason === "timeout" ? "missed" : "rejected";
      } else {
        newCallStatus = "ended";
      }
    }

    const callUpdate: {
      status: CallStatus;
      started_at?: Date;
      ended_at?: Date;
      duration_seconds?: number;
    } = { status: newCallStatus };

    if (newCallStatus === "ongoing" && !callRow?.started_at) {
      callUpdate.started_at = now;
    }
    if (["ended", "missed", "rejected"].includes(newCallStatus)) {
      callUpdate.ended_at = now;
      callUpdate.duration_seconds = callRow?.started_at
        ? Math.round((now.getTime() - callRow.started_at.getTime()) / 1000)
        : 0;
    }

    await db.update(chatCalls).set(callUpdate).where(eq(chatCalls.id, call_id));

    const allUserIds = participants.map((p) => p.user_id);
    const acceptedUserIds = acceptedParticipants.map((p) => p.user_id);

    if (status === "accepted") {
      for (const user of acceptedUserIds) {
        if (user === user_id) continue;
        socketService.sendToUser({
          event: "call:accepted",
          userId: user,
          args: [
            {
              by: user_id,
              call_id,
            },
          ],
        });
      }
    } else if (status === "rejected" && reason === "manual") {
      if (isCallFullyEnded) {
        for (const user of allUserIds) {
          socketService.sendToUser({
            event: "call:ended",
            userId: user,
            args: [
              {
                call_id,
                ended_by: user_id,
              },
            ],
          });
        }
      } else {
        for (const user of acceptedUserIds) {
          socketService.sendToUser({
            event: "call:rejected",
            userId: user,
            args: [
              {
                call_id,
                rejected_by: user_id,
              },
            ],
          });
        }
      }
    } else if (status === "rejected" && reason === "timeout") {
      if (isCallFullyEnded) {
        for (const user of allUserIds) {
          socketService.sendToUser({
            event: "call:ended",
            userId: user,
            args: [
              {
                call_id,
                ended_by: user_id,
              },
            ],
          });
        }
      } else {
        for (const user of allUserIds) {
          socketService.sendToUser({
            event: "call:missed",
            userId: user,
            args: [
              {
                call_id,
                missed_by: user_id,
              },
            ],
          });
        }
      }
    } else if (status === "left" && wasRinging && isCallerLeaving) {
      const notifyIds = participants
        .filter(
          (p) =>
            p.user_id !== user_id &&
            (p.status === "invited" || p.status === "accepted"),
        )
        .map((p) => p.user_id);
      for (const user of notifyIds) {
        socketService.sendToUser({
          event: "call:cancelled",
          userId: user,
          args: [
            {
              call_id,
              cancelled_by: user_id,
            },
          ],
        });
      }
    } else if (status === "left" && wasOngoing && !isCallFullyEnded) {
      for (const user of acceptedUserIds) {
        socketService.sendToUser({
          event: "call:participant-left",
          userId: user,
          args: [
            {
              call_id,
              left_by: user_id,
            },
          ],
        });
      }
    } else if (isCallFullyEnded) {
      for (const user of allUserIds) {
        socketService.sendToUser({
          event: "call:ended",
          userId: user,
          args: [
            {
              call_id,
              ended_by: user_id,
            },
          ],
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
        joined_at: callParticipants.joined_at,
        left_at: callParticipants.left_at,
      })
      .from(callParticipants)
      .leftJoin(usersTable, eq(callParticipants.user_id, usersTable.id))
      .where(eq(callParticipants.call_id, call_id));
  }
}
