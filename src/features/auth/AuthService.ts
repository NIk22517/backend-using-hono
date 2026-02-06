import { Services } from "@/core/di/types";
import { AppError } from "@/core/errors";
import { JWT_SECRET } from "@/core/utils/EnvValidator";
import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

export class AuthService {
  async signIn(
    {
      email,
      name,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    },
    services: Services,
  ) {
    const check = await services.userServices.checkUserExist({
      key: "email",
      value: email,
    });

    if (check) {
      throw AppError.conflict("User already exists");
    }
    const hashedPassword = await hash(password, 10);

    const user: typeof usersTable.$inferInsert = {
      name,
      email,
      password: hashedPassword,
    };
    const [data] = await db.insert(usersTable).values(user).returning();

    const token = sign(data, JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: p, ...rest } = data;
    return {
      ...rest,
      created_at: rest.created_at?.toISOString() ?? null,
      token,
    };
  }

  async logIn(
    { email, password }: { email: string; password: string },
    services: Services,
  ) {
    const check = await services.userServices.checkUserExist({
      key: "email",
      value: email,
    });

    if (!check) {
      throw new Error("User Not Exist");
    }

    const checkPassword = await compare(password, check.password);
    if (!checkPassword) {
      throw new Error("Invalid credentials");
    }

    const token = sign(check, JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password: p, ...rest } = check;

    return {
      ...rest,
      created_at: rest.created_at?.toISOString() ?? null,
      token,
    };
  }
}
