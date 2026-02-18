import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string().min(10, {
    message: "JWT_SECRET must be at least 10 characters",
  }),
  DATABASE_URL: z.string(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  OLLAMA_URL: z.string().startsWith("http"),
  REDIS_PASSWORD: z.string().min(6),
  REDIS_URL: z.string().startsWith("redis"),
  RESEND_API_KEY: z.string().min(6),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error);
  process.exit(1);
}

export const Environment = parsedEnv.data;
