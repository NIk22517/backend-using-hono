ALTER TABLE "chat_messages" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (
            setweight(to_tsvector('english', COALESCE("chat_messages"."message", '')), 'A')
          ) STORED NOT NULL;