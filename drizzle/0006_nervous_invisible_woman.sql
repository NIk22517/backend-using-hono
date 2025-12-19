CREATE TYPE "public"."message_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."system_event" AS ENUM('group_created', 'users_added', 'user_removed', 'user_left', 'group_name_changed', 'group_avatar_changed', 'message_pinned');--> statement-breakpoint
CREATE TABLE "chat_message_system_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"event" "system_event" NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "chat_message_system_events_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "message_type" "message_type" DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "chat_message_system_events" ADD CONSTRAINT "chat_message_system_events_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_system_events" ADD CONSTRAINT "chat_message_system_events_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sys_event_event" ON "chat_message_system_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_sys_event_message_id" ON "chat_message_system_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_sys_event_chat_id" ON "chat_message_system_events" USING btree ("chat_id");