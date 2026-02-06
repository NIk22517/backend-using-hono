import { db } from "@/db";
import { chatMessages } from "@/db/chatSchema";
import { and, desc, eq, gt } from "drizzle-orm";
import axios from "axios";
import { stream } from "hono/streaming";
import { Context } from "hono";
import { OLLAMA_URL } from "@/core/utils/EnvValidator";

interface NomicEmbeddingResponse {
  embedding: number[];
  model: string;
}

export class AiService {
  async chatSummary({ chat_id, c }: { chat_id: number; c: Context }) {
    try {
      const results = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chat_id, chat_id));

      if (results.length === 0) {
        c.status(200);
        return c.text("No messages found to summarize.");
      }

      const messagesText = results
        .map((msg) => `${msg.sender_id}: ${msg.message}`)
        .join("\n");

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
          model: "llama3.2:1b",
          prompt: prompt,
          stream: true,
        },
        {
          responseType: "stream",
        },
      );

      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");
      c.header("Transfer-Encoding", "chunked");

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
              if (json.done) {
                await stream.close();
                return;
              }
            } catch (error) {
              console.error(
                "Error parsing Ollama stream chunk:",
                error,
                "Raw line:",
                line,
              );
              await stream.write(
                `[SERVER_ERROR: Malformed AI response part]\n`,
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
        .where(and(eq(chatMessages.chat_id, chat_id)))
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
        },
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
                line,
              );
              await stream.write(
                `[SERVER_ERROR: Malformed AI response part]\n`,
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
  async suggestions({
    chat_id,
    c,
    user_id,
  }: {
    chat_id: number;
    c: Context;
    user_id: number;
  }) {
    try {
      const [lastMessage] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chat_id, chat_id))
        .orderBy(desc(chatMessages.created_at))
        .limit(1);

      if (!lastMessage) {
        return c.json({ suggestions: [] });
      }
      const isFromUser = lastMessage.sender_id === user_id;

      const prompt = isFromUser
        ? `
You are an AI that outputs ONLY valid JSON array of strings.

Last message you wrote:
"${lastMessage.message}"

TASK:
- Generate exactly 3 short, friendly, and natural continuations to what you just wrote.
- Think of it as the next thing you'd say to keep the conversation going.
- Each must be under 15 words, all different in tone.

STRICT RULES:
1. Output MUST be ONLY a JSON array of strings.
2. Example of correct output:
["This is one", "This is two", "This is three"]
3. WRONG output examples (do NOT produce these):
{"String 1": "This", "String 2": "That"}
["This", "That",]
Text before or after array.
4. Use only straight double quotes (").
5. No trailing commas.
6. Output must be parseable by JSON.parse() with no errors.

NOW OUTPUT ONLY THE ARRAY:
`
        : `
You are an AI that outputs ONLY valid JSON array of strings.

Last message from the other person:
"${lastMessage.message}"

TASK:
- Generate exactly 3 short, friendly, and relevant replies to this message.
- Each must be under 15 words, all different in tone.

STRICT RULES:
1. Output MUST be ONLY a JSON array of strings.
2. Example of correct output:
["This is one", "This is two", "This is three"]
3. WRONG output examples (do NOT produce these):
{"String 1": "This", "String 2": "That"}
["This", "That",]
Text before or after array.
4. Use only straight double quotes (").
5. No trailing commas.
6. Output must be parseable by JSON.parse() with no errors.

NOW OUTPUT ONLY THE ARRAY:
`;

      const ollamaRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: "llama3.2:1b",
        prompt,
        stream: false,
        format: "json",
      });

      let suggestions: string[] = [];
      try {
        const rawOutput = ollamaRes.data.response.trim();
        const parsedOutput = JSON.parse(rawOutput);

        if (Array.isArray(parsedOutput)) {
          suggestions = parsedOutput;
        } else if (parsedOutput && typeof parsedOutput === "object") {
          if (Array.isArray(parsedOutput.suggestions)) {
            suggestions = parsedOutput.suggestions.flat();
          } else {
            suggestions = Object.values(parsedOutput ?? {}).flat() as string[];
          }
        }
      } catch (err) {
        console.error(
          "Failed to parse AI suggestions:",
          err,
          "Raw:",
          ollamaRes.data.response,
        );
        suggestions = [];
      }

      return c.json({ suggestions });
    } catch (error) {
      console.error("Error in suggestions:", error);
      throw error;
    }
  }

  async embedMessageText() {
    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chat_id, 1))
      .limit(1);

    if (!result.length || !result[0].message) {
      throw new Error(`No message found for chat_id ${1}`);
    }

    try {
      const { data } = await axios.post<NomicEmbeddingResponse>(
        `${OLLAMA_URL}/api/embeddings`,
        {
          model: "nomic-embed-text:v1.5",
          prompt: result[0].message,
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      return data;
    } catch (error) {
      console.error("Error fetching embeddings:", error);
      throw error;
    }
  }
}
