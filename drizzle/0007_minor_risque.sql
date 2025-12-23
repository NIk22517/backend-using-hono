ALTER TYPE "public"."chat_type" ADD VALUE 'broadcast';--> statement-breakpoint
CREATE TABLE "broadcast_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"recipient_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "broadcast_recipients_chat_recipient" UNIQUE("chat_id","recipient_id")
);
--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_broadcast_recipients_user" ON "broadcast_recipients" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_broadcast_recipients_chat_id" ON "broadcast_recipients" USING btree ("chat_id");