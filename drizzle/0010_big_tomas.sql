CREATE TYPE "public"."message_delete_action" AS ENUM('self', 'everyone');--> statement-breakpoint
CREATE TABLE "chat_message_deletes" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"delete_action" "message_delete_action" NOT NULL,
	"deleted_by" integer NOT NULL,
	"deleted_at" timestamp DEFAULT now(),
	CONSTRAINT "chat_message_deletes_message_id_user_id_unique" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
DROP TABLE "chat_messages_delete" CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message_deletes" ADD CONSTRAINT "chat_message_deletes_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_deletes" ADD CONSTRAINT "chat_message_deletes_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_deletes" ADD CONSTRAINT "chat_message_deletes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_deletes" ADD CONSTRAINT "chat_message_deletes_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_msg_delete_chat_user" ON "chat_message_deletes" USING btree ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_msg_delete_message" ON "chat_message_deletes" USING btree ("message_id");--> statement-breakpoint
DROP TYPE "public"."delete_action";