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
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error);
  process.exit(1);
}

export const JWT_SECRET = parsedEnv.data.JWT_SECRET;
export const DATABASE_URL = parsedEnv.data.DATABASE_URL;
export const CLOUDINARY_CLOUD_NAME = parsedEnv.data.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = parsedEnv.data.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = parsedEnv.data.CLOUDINARY_API_SECRET;
