// AuthController.ts
import { type Context } from "hono";
import { z } from "zod";
import { BaseController } from "@/core/http/BaseController";
import type { Services } from "@/core/di/types";
import { responseWrapper } from "@/core/http/responseWrapper";
import { SignInRequestSchema } from "./auth.schemas";
import { openApiResponseWrapper } from "@/core/http/openApiResponseWrapper";
import { AppError } from "@/core/errors";

const logInSchema = z.object({
  email: z.string().email({ message: "Provide a valid email" }),
  password: z.string().min(6).max(16),
});

export class AuthController extends BaseController {
  constructor(private readonly deps: Services) {
    super("AuthService");
  }

  signIn = openApiResponseWrapper({
    action: "auth_sign_in",
    builder: this.builder,
    successMsg: "User Created Successfully",
    handler: async (ctx: Context) => {
      const body = await ctx.req.json();
      console.log(body, "body");
      if (!body?.data) {
        throw AppError.badRequest("Missing request body");
      }

      const parsed = SignInRequestSchema.safeParse(body);

      console.log(parsed, "parsed");

      if (!parsed.success) {
        throw AppError.validation("Invalid input", parsed.error);
      }

      return this.deps.authService.signIn(parsed.data.data, this.deps);
    },
  });

  logIn = openApiResponseWrapper({
    action: "auth_log_in",
    builder: this.builder,
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
