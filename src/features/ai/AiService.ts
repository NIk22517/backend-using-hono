import { db } from "@/db";
import { chatMessages } from "@/db/chatSchema";
import { and, eq, gt } from "drizzle-orm";
import axios from "axios";

export class AiService {
  async chatSummary({ chat_id }: { chat_id: number }) {
    const [result] = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chat_id, chat_id),
          gt(chatMessages.created_at, new Date("2025-05-13"))
        )
      );

    const prompt = `Extract the key information from the \'message\' field of the following JSON data: ${JSON.stringify(
      result
    )}`;

    const streamData = await axios.post(
      `http://127.0.0.1:11434/api/generate`,
      {
        model: "llama3.2",
        prompt: prompt,
      },
      {
        responseType: "stream",
      }
    );
    return streamData.data;
  }
}
