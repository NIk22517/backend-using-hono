import type { Context } from "hono";
import { toAppError } from "../errors";
import type { ResponseBuilder } from "@/core/utils/ResponseBuilder";
import { RouteConfig, RouteHandler } from "@hono/zod-openapi";

type InferRouteContext<R extends RouteConfig> = Parameters<RouteHandler<R>>[0];
type RouteHandlerFn<R extends RouteConfig, Result> = (
  ctx: InferRouteContext<R>,
) => Promise<Result>;

export const openApiResponseWrapper = <R extends RouteConfig, Result>({
  builder,
  action,
  successMsg,
  handler,
}: {
  route: R;
  builder: ResponseBuilder;
  action: string;
  successMsg: string;
  handler: RouteHandlerFn<R, Result>;
}) => {
  return async (ctx: InferRouteContext<R>) => {
    try {
      const data = await handler(ctx);

      const response = builder.success({
        action,
        message: successMsg,
        data,
      });

      return ctx.json(response, 200);
    } catch (err: any) {
      const appError = toAppError(err);
      const response = {
        ...builder.failure({
          action,
          message: appError.message,
          error: appError.error,
        }),
        errorCode: appError.code,
      };

      return ctx.json(response, appError.status) as any;
    }
  };
};
