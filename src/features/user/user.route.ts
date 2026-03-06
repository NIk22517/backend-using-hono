import { authMiddleware } from "@/middleware/authMiddleware";
import { UserController } from "./UserController";
import { services } from "@/core/di/container";
import { OpenAPIHono } from "@hono/zod-openapi";
import { rateLimitMiddleware } from "@/middleware/rateLimitMiddleware";
import { rateLimitConfig } from "@/core/utils/rateLimitConfig";
import {
  getCurrentUserRoute,
  getUserByIdRoute,
  updateUserRoute,
} from "./user.contract";
import { AppEnv } from "@/types/env";

const controller = new UserController(services);
const userRouter = new OpenAPIHono<AppEnv>().basePath("/user");

userRouter
  .use(authMiddleware)
  .use(rateLimitMiddleware(rateLimitConfig.user.common));

userRouter.openapi(getCurrentUserRoute, controller.getTokenUser);
userRouter.openapi(getUserByIdRoute, controller.getUserById);
userRouter.openapi(updateUserRoute, controller.editUserDetails);

export default userRouter;
