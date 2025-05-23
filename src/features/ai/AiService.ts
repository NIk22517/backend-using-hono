import { db } from "@/db";
import { chatMessages } from "@/db/chatSchema";
import { and, eq, gt } from "drizzle-orm";
import axios from "axios";
import { stream } from "hono/streaming";
import { Context } from "hono";
import { OLLAMA_URL } from "@/core/utils/EnvValidator";

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

      if (results.length === 0) {
        c.status(200);
        return c.text("No messages found to summarize.");
      }

      const messagesText = results
        .map((msg) => `${msg.sender_id}: ${msg.message}`)
        .join("\n");

      console.log("call happen in services");

      const prompt = `You are an AI assistant tasked with summarizing chat conversations.
Analyze the following chat messages and provide a concise summary of the key topics, decisions, and important information discussed.
Focus on extracting the most critical points.

Chat Messages:
---
${messagesText}
---

Summary:`;

      const ollamaStream = await axios.post(
        `${OLLAMA_URL}/api/generate`,
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
              console.error(
                "Error parsing Ollama stream chunk:",
                error,
                "Raw line:",
                line
              );
              await stream.write(
                `[SERVER_ERROR: Malformed AI response part]\n`
              );
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

  async chatSummaryV2({ chat_id, c }: { chat_id: number; c: Context }) {
    try {
      const results = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chat_id, chat_id),
            gt(chatMessages.created_at, new Date("2024-01-01"))
          )
        )
        .orderBy(chatMessages.created_at);
      if (results.length === 0) {
        c.status(200);
        return c.text("No messages found to summarize.");
      }

      const messagesText = results
        .map((msg) => `${msg.id}: ${msg.message}`)
        .join("\n");

      const prompt = `CHAT MESSAGES:\n${messagesText}\n\nATTACHMENT CONTENT:\n${"No specific attachment content provided."}`;

      const ollamaStream = await axios.post<NodeJS.ReadableStream>(
        `${OLLAMA_URL}/api/generate`,
        {
          model: "chat-summary",
          prompt: prompt,
          stream: true,
        },
        {
          responseType: "stream",
        }
      );

      return stream(c, async (stream) => {
        for await (const chunk of ollamaStream.data) {
          const chunkString =
            typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);

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
              console.error(
                "Error parsing Ollama stream chunk:",
                error,
                "Raw line:",
                line
              );
              await stream.write(
                `[SERVER_ERROR: Malformed AI response part]\n`
              );
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
