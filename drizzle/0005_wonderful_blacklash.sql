CREATE INDEX "idx_chat_members_user" ON "chat_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_members_user_chat_id" ON "chat_members" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_message" ON "chat_message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_chat" ON "chat_message_attachments" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_messages_chat_created" ON "chat_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "chat_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_msg_delete_chat_user" ON "chat_messages_delete" USING btree ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_reply_message" ON "chat_messages_reply" USING btree ("reply_message_id");--> statement-breakpoint
CREATE INDEX "idx_reply_message_chat" ON "chat_messages_reply" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_read_receipts_last_msg" ON "chat_read_receipts" USING btree ("last_read_message_id");--> statement-breakpoint
CREATE INDEX "idx_chats_created_by" ON "chats" USING btree ("created_by");