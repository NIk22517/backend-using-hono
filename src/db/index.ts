import { DATABASE_URL } from "@/core/utils/EnvValidator";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(DATABASE_URL);
