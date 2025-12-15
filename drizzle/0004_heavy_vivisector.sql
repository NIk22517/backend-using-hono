DELETE FROM chat_read_receipts a
USING chat_read_receipts b
WHERE a.chat_id = b.chat_id
  AND a.user_id = b.user_id
  AND a.id < b.id; 


ALTER TABLE "chat_read_receipts" ADD CONSTRAINT "chat_read_receipts_chat_id_user_id_unique" UNIQUE("chat_id","user_id");--> statement-breakpoint
DROP TYPE "public"."chat_read_status";