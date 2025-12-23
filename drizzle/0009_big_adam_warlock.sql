CREATE TABLE "chat_message_read_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_message_user_read" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_read_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"last_read_message_id" integer,
	"last_read_at" timestamp DEFAULT now(),
	"unread_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_chat_user_summary" UNIQUE("chat_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_read_receipts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chat_read_receipts" CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message_read_receipts" ADD CONSTRAINT "chat_message_read_receipts_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_read_receipts" ADD CONSTRAINT "chat_message_read_receipts_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_read_receipts" ADD CONSTRAINT "chat_message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_summary" ADD CONSTRAINT "chat_read_summary_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_summary" ADD CONSTRAINT "chat_read_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_summary" ADD CONSTRAINT "chat_read_summary_last_read_message_id_chat_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_msg_read_message_id" ON "chat_message_read_receipts" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_msg_read_user_id" ON "chat_message_read_receipts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_msg_read_chat_user" ON "chat_message_read_receipts" USING btree ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_msg_read_read_at" ON "chat_message_read_receipts" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "idx_read_summary_chat" ON "chat_read_summary" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_read_summary_user" ON "chat_read_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_read_summary_unread" ON "chat_read_summary" USING btree ("unread_count");--> statement-breakpoint
CREATE INDEX "idx_messages_parent" ON "chat_messages" USING btree ("parent_message_id");--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_id_user_id_unique" UNIQUE("chat_id","user_id");