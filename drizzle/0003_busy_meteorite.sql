CREATE TABLE "chat_messages_delete" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"deleted_at" timestamp DEFAULT now(),
	"delete_action" "delete_action" DEFAULT 'recover' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages_delete" ADD CONSTRAINT "chat_messages_delete_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages_delete" ADD CONSTRAINT "chat_messages_delete_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages_delete" ADD CONSTRAINT "chat_messages_delete_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;