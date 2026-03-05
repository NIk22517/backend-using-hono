import { AuthController } from "./AuthController";
import { services } from "@/core/di/container";
import { OpenAPIHono } from "@hono/zod-openapi";
import { toAppError } from "@/core/errors";
import { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import { rateLimitMiddleware } from "@/middleware/rateLimitMiddleware";
import { rateLimitConfig } from "@/core/utils/rateLimitConfig";
import { logInRoute, signInRoute } from "./auth.contract";

const controller = new AuthController(services);

const authRoutes = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const error = toAppError(result.error);
      const errRes = {
        ...new ResponseBuilder("auth").failure({
          action: "auth_actions",
          error: error,
          message: error.message,
        }),
        errorCode: error.code,
      };
      return c.json(errRes, error.status);
    }
  },
}).basePath("/auth");

authRoutes.use(rateLimitMiddleware(rateLimitConfig.auth.common));

authRoutes.openapi(signInRoute, controller.signIn);
authRoutes.openapi(logInRoute, controller.logIn);

export default authRoutes;
