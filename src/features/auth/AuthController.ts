import { BaseController } from "@/core/http/BaseController";
import type { Services } from "@/core/di/types";
import { openApiResponseWrapper } from "@/core/http/openApiResponseWrapper";
import { logInRoute, signInRoute } from "./auth.contract";

export class AuthController extends BaseController {
  constructor(private readonly deps: Services) {
    super("AuthService");
  }

  signIn = openApiResponseWrapper({
    route: signInRoute,
    action: "auth_sign_in",
    builder: this.builder,
    successMsg: "User Created Successfully",
    handler: async (ctx) => {
      const { data } = ctx.req.valid("json");
      return this.deps.authService.signIn(data, this.deps);
    },
  });

  logIn = openApiResponseWrapper({
    route: logInRoute,
    action: "auth_log_in",
    builder: this.builder,
    successMsg: "Log in Successfully",
    handler: async (ctx) => {
      const { data } = ctx.req.valid("json");
      return this.deps.authService.logIn(data, this.deps);
    },
  });
}
