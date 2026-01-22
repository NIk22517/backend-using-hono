import { db } from "@/db";
import { UserType } from "@/types/hono";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export class UserServices {
  
  async checkUserExist({
    key,
    value,
  }: {
    key: "id" | "email";
    value: UserType["id"] | UserType["email"];
  }): Promise<UserType | null> {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable[key], value));

    return user.length > 0 ? user[0] : null;
  }

  async updateUserDetails({
    id,
    updates,
  }: {
    id: number;
    updates: Partial<Pick<UserType, "name" | "avatar_url">>;
  }) {
    const [update] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning();
    const { password, ...rest } = update;
    return rest;
  }
}
