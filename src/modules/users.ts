import { LOCKET_API_BASE_URL } from "../constants";
import { HttpClient } from "../http";
import type { RequestOptions } from "../types/common";
import type { FetchUserInput, FetchUserResponse } from "../types/user";

export class UsersModule {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch public profile information for a Locket user.
   */
  async fetch(input: FetchUserInput, options?: RequestOptions) {
    return this.http.post<FetchUserResponse>(
      `${LOCKET_API_BASE_URL}/fetchUserV2`,
      { data: { user_uid: input.userUid } },
      this.requestConfig(options)
    );
  }

  private requestConfig(options?: RequestOptions) {
    const headers: Record<string, string> = { ...(options?.headers ?? {}) };
    if (options?.token) headers.Authorization = `Bearer ${options.token}`;
    return { headers, signal: options?.signal } as const;
  }
}
