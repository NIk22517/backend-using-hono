// AuthController.ts
import { type Context } from "hono";
import { z } from "zod";
import { BaseController } from "@/core/http/BaseController";
import type { Services } from "@/core/di/types";
import { responseWrapper } from "@/core/http/responseWrapper";
import { SignInRequestSchema } from "./auth.schemas";

const logInSchema = z.object({
  email: z.string().email({ message: "Provide a valid email" }),
  password: z.string().min(6).max(16),
});

export class AuthController extends BaseController {
  constructor(private readonly deps: Services) {
    super("AuthService");
  }

  signIn = responseWrapper({
    action: "auth_sign_in",
    builder: this.builder,
    successMsg: "User Created Successfully",
    errorMsg: "Not able to create new user",
    handler: async (ctx: Context) => {
      const { data } = await ctx.req.json();

      if (!data) {
        ctx.status(400);
        throw new Error("Please provide the data");
      }
      console.log(data, "data");

      const parsed = SignInRequestSchema.safeParse(data);

      if (!parsed.success) {
        ctx.status(400);
        throw parsed.error;
      }

      return this.deps.authService.signIn(parsed.data.data, this.deps);
    },
  });

  logIn = responseWrapper({
    action: "auth_log_in",
    builder: this.builder,
    errorMsg: "Can not find user with this email",
    successMsg: "Log in Successfully",
    handler: async (ctx) => {
      const { data } = await ctx.req.json();

      if (!data) {
        throw new Error("Data is not provided");
      }

      const parseData = logInSchema.safeParse(data);
      if (!parseData.success) {
        throw parseData.error;
      }

      return this.deps.authService.logIn(parseData.data, this.deps);
    },
  });
}
