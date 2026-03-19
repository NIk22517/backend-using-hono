import { Environment } from "@/core/utils/EnvValidator";
import { GoogleGenAI } from "@google/genai";

export const geminiAi = new GoogleGenAI({
  apiKey: Environment.GEMINI_API_KEY,
});
