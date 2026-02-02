import { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "@/db/schema";
import { db } from "@/db";
import { PgTransaction } from "drizzle-orm/pg-core";

export type DbExecutor =
  | typeof db
  | PgTransaction<
      NodePgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
