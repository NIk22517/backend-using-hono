import { Environment } from "@/core/utils/EnvValidator";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: Environment.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
});
