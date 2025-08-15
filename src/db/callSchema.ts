import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./userSchema";
import { chats } from "./chatSchema";
import { InferSelectModel } from "drizzle-orm";

export const callTypeEnum = pgEnum("call_type", ["audio", "video"]);
export const callStatusEnum = pgEnum("call_status", [
  "initiated", // call started but not answered yet
  "ringing", // user notified but not answered
  "ongoing", // call in progress
  "ended", // call completed
  "missed", // user didn’t answer
  "rejected", // user declined
]);

export const PARTICIPANT_STATUSES = [
  "invited",
  "accepted",
  "rejected",
  "left",
] as const;

export const participantStatusEnum = pgEnum(
  "participant_status",
  PARTICIPANT_STATUSES
);

export const chatCalls = pgTable("chat_calls", {
  id: serial("id").primaryKey(),
  chat_id: integer("chat_id")
    .references(() => chats.id)
    .notNull(),
  caller_id: integer("caller_id")
    .references(() => usersTable.id)
    .notNull(),
  call_type: callTypeEnum("call_type").notNull(),
  status: callStatusEnum("status").default("initiated").notNull(),
  started_at: timestamp("started_at"),
  ended_at: timestamp("ended_at"),
  duration_seconds: integer("duration_seconds").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

export const callParticipants = pgTable("call_participants", {
  id: serial("id").primaryKey(),
  call_id: integer("call_id")
    .references(() => chatCalls.id, { onDelete: "cascade" })
    .notNull(),
  user_id: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  status: participantStatusEnum("status").default("invited").notNull(),
  joined_at: timestamp("joined_at"),
  left_at: timestamp("left_at"),
});

export type ChatCallType = InferSelectModel<typeof chatCalls>;
export type CallStatus = (typeof callStatusEnum.enumValues)[number];
export type CallType = (typeof callTypeEnum.enumValues)[number];
export type CallParticipantType = InferSelectModel<typeof callParticipants>;
export type ParticipantStatus =
  (typeof participantStatusEnum.enumValues)[number];
