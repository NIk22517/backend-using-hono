CREATE TABLE "chat_clear_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"cleared_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_clear_states_chat_id_user_id_unique" UNIQUE("chat_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_clear_states" ADD CONSTRAINT "chat_clear_states_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_clear_states" ADD CONSTRAINT "chat_clear_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clear_chat_user" ON "chat_clear_states" USING btree ("chat_id","user_id");