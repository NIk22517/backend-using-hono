export type SuccessResponse<T> = {
  service: string;
  action: string;
  status: "success";
  message: string;
  data: T;
};

export type FailureResponse<E = unknown> = {
  service: string;
  action: string;
  status: "error";
  message: string;
  error: E;
};

export type ResponseType<T, E = unknown> =
  | SuccessResponse<T>
  | FailureResponse<E>;

export class ResponseBuilder {
  constructor(private readonly service: string) {}

  success<T>({
    action,
    data,
    message,
  }: {
    action: string;
    message: string;
    data: T;
  }): SuccessResponse<T> {
    return {
      service: this.service,
      action,
      status: "success",
      message,
      data,
    };
  }

  failure<E = unknown>({
    action,
    error,
    message,
  }: {
    action: string;
    message: string;
    error: E;
  }): FailureResponse<E> {
    return {
      service: this.service,
      action,
      status: "error",
      message,
      error,
    };
  }
}
