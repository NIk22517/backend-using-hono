-- 1️⃣ Add the new column for last read message
ALTER TABLE chat_read_receipts
ADD COLUMN IF NOT EXISTS last_read_message_id integer
REFERENCES chat_messages(id);

-- 2️⃣ Backfill last_read_message_id using the old status
-- Must be done BEFORE dropping columns
UPDATE chat_read_receipts crr
SET last_read_message_id = sub.max_message_id
FROM (
  SELECT chat_id, user_id, MAX(message_id) AS max_message_id
  FROM chat_read_receipts
  WHERE status = 'read'
  GROUP BY chat_id, user_id
) sub
WHERE crr.chat_id = sub.chat_id
AND crr.user_id = sub.user_id;

-- 3️⃣ Drop old columns (after backfill)
ALTER TABLE chat_read_receipts DROP COLUMN IF EXISTS message_id;
ALTER TABLE chat_read_receipts DROP COLUMN IF EXISTS status;
ALTER TABLE chat_read_receipts DROP COLUMN IF EXISTS read_at;

-- 4️⃣ Ensure chat_id is NOT NULL
ALTER TABLE chat_read_receipts ALTER COLUMN chat_id SET NOT NULL;

-- 5️⃣ Update foreign keys to use cascade
ALTER TABLE chat_read_receipts DROP CONSTRAINT IF EXISTS chat_read_receipts_user_id_users_id_fk;
ALTER TABLE chat_read_receipts DROP CONSTRAINT IF EXISTS chat_read_receipts_chat_id_chats_id_fk;

ALTER TABLE chat_read_receipts
  ADD CONSTRAINT chat_read_receipts_user_id_users_id_fk FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE chat_read_receipts
  ADD CONSTRAINT chat_read_receipts_chat_id_chats_id_fk FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;


-- 7️⃣ Optional: add index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_chat_read_user
ON chat_read_receipts(user_id);
