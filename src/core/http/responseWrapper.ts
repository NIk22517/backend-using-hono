// core/http/responseWrapper.ts

import type { Context } from "hono";
import type {
  ResponseBuilder,
  ResponseType,
} from "@/core/utils/ResponseBuilder";

type AnyContext = Context<any, any, any>;

type Handler<T, C extends AnyContext> = (ctx: C) => Promise<T>;

interface WrapperProps<T, C extends AnyContext> {
  builder: ResponseBuilder;
  action: string;
  successMsg: string;
  errorMsg: string;
  handler: Handler<T, C>;
}

export const responseWrapper = <T, C extends AnyContext>({
  builder,
  action,
  successMsg,
  errorMsg,
  handler,
}: WrapperProps<T, C>) => {
  return async (ctx: C): Promise<ResponseType<T>> => {
    try {
      const data = await handler(ctx);
      const response = builder.success({ action, data, message: successMsg });
      ctx.status(data ? 200 : 204);
      return response;
    } catch (error: any) {
      console.error(`Error in ${action}:`, error);
      ctx.status(error ? 400 : 500);
      const err = builder.failure({
        action,
        error,
        message: error?.message ?? errorMsg,
      });
      return err;
    }
  };
};
