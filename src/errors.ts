import { AxiosError } from "axios";

export class LocketError extends Error {
  public readonly status?: number;
  public readonly code?: string | number;
  public readonly response?: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string | number; response?: unknown } = {},
  ) {
    super(message);
    this.name = "LocketError";
    this.status = options.status;
    this.code = options.code;
    this.response = options.response;
  }

  static fromAxios(error: unknown): LocketError {
    if (error instanceof LocketError) return error;

    if (error instanceof AxiosError) {
      const data = error.response?.data as
        | { error?: { message?: string; code?: string | number } }
        | undefined;
      const message = data?.error?.message ?? error.message ?? "Unknown Locket API error";
      return new LocketError(message, {
        status: error.response?.status,
        code: data?.error?.code ?? error.code,
        response: error.response?.data,
      });
    }

    if (error instanceof Error) {
      return new LocketError(error.message);
    }

    return new LocketError("Unknown error");
  }
}
