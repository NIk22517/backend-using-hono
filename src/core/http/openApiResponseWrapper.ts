import type { Context } from "hono";
import { AppError, toAppError } from "../errors";
import type { ResponseBuilder } from "@/core/utils/ResponseBuilder";

type AnyContext = Context<any, any, any>;

type Handler<R, C extends AnyContext> = (ctx: C) => Promise<R>;

export const openApiResponseWrapper = <R, C extends AnyContext>({
  builder,
  action,
  successMsg,
  handler,
}: {
  builder: ResponseBuilder;
  action: string;
  successMsg: string;
  handler: Handler<R, C>;
}) => {
  return async (ctx: C) => {
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

      console.log(response, "error log");

      return ctx.json(response, appError.status) as any;
    }
  };
};
