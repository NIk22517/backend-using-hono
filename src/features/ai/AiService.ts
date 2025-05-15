import { db } from "@/db";
import { chatMessages } from "@/db/chatSchema";
import { and, eq, gt } from "drizzle-orm";
import axios from "axios";
import { stream } from "hono/streaming";
import { Context } from "hono";

export class AiService {
  async chatSummary({ chat_id, c }: { chat_id: number; c: Context }) {
    try {
      const results = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chat_id, chat_id),
            gt(chatMessages.created_at, new Date("2025-05-13"))
          )
        );

      const messagesText = results.map((msg) => msg.message).join("\n");
      const prompt = `Summarize the key topics and information discussed in the following chat messages:\n\n${messagesText}`;

      const ollamaStream = await axios.post(
        `http://127.0.0.1:11434/api/generate`,
        {
          model: "llama3.2",
          prompt: prompt,
          stream: true,
        },
        {
          responseType: "stream",
        }
      );

      return stream(c, async (stream) => {
        for await (const chunk of ollamaStream.data) {
          const chunkString = new TextDecoder().decode(chunk);

          const lines = chunkString
            .split("\n")
            .filter((line) => line.trim() !== "");

          for (const line of lines) {
            try {
              const json = JSON.parse(line);

              if (json.response) {
                await stream.write(`${json.response}`);
              }
            } catch (error) {
              console.error("Error parsing Ollama stream chunk:", error, line);
              await stream.write(`data: Error parsing stream\n\n`);
            }
          }
        }
        await stream.close();
      });
    } catch (error) {
      console.error("Error in chatSummary:", error);
      throw error;
    }
  }
}
