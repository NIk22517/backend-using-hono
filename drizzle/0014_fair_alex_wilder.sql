CREATE TYPE "public"."invite_channel" AS ENUM('email', 'notification');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "chat_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"invited_by" integer NOT NULL,
	"invitee_user_id" integer,
	"invitee_email" varchar(255),
	"chat_id" integer,
	"token" varchar(64) NOT NULL,
	"channel" "invite_channel" NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chat_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "unique_pending_user_chat" UNIQUE("invitee_user_id","chat_id"),
	CONSTRAINT "unique_pending_email_chat" UNIQUE("invitee_email","chat_id")
);
--> statement-breakpoint
ALTER TABLE "chat_invites" ADD CONSTRAINT "chat_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_invites" ADD CONSTRAINT "chat_invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_invites" ADD CONSTRAINT "chat_invites_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invites_inviter" ON "chat_invites" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "idx_invites_invitee_user" ON "chat_invites" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "idx_invites_email" ON "chat_invites" USING btree ("invitee_email");--> statement-breakpoint
CREATE INDEX "idx_invites_token" ON "chat_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_invites_status" ON "chat_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invites_expires" ON "chat_invites" USING btree ("expires_at");