import { DATABASE_URL } from "@/core/utils/EnvValidator";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
});
