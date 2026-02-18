import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { Environment } from "./src/core/utils/EnvValidator";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: Environment.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
