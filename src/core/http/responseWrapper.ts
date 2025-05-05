// core/http/responseWrapper.ts

import type { Context } from "hono";
import type {
  ResponseBuilder,
  ResponseType,
} from "@/core/utils/ResponseBuilder";

type Handler<T> = (ctx: Context) => Promise<T>;

interface WrapperProps<T> {
  builder: ResponseBuilder;
  action: string;
  successMsg: string;
  errorMsg: string;
  handler: Handler<T>;
}

export const responseWrapper = <T>({
  builder,
  action,
  successMsg,
  errorMsg,
  handler,
}: WrapperProps<T>) => {
  return async (ctx: Context): Promise<ResponseType<T>> => {
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
