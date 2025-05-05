import type { usersTable } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type UserType = InferSelectModel<typeof usersTable>;

declare module "hono" {
  interface ContextVariableMap {
    user: UserType;
  }
}
