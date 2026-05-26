import { LOCKET_API_BASE_URL } from "../constants";
import { HttpClient } from "../http";
import type {
  DeleteMomentInput,
  DeleteMomentResponse,
  GetLatestMomentsInput,
  GetLatestMomentsResponse,
  GetMomentViewsResponse,
  ReactToMomentInput,
  ReactToMomentResponse,
} from "../types/moment";
import type { RequestOptions } from "../types/common";
import { int64 } from "../utils";

export class MomentsModule {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the latest moments from one or many friends.
   */
  async getLatest(
    input: GetLatestMomentsInput = {},
    options?: RequestOptions,
  ): Promise<GetLatestMomentsResponse> {
    const data: Record<string, unknown> = {
      excluded_users: input.excludedUsers ?? [],
      users: input.users ?? [],
      should_count_missed_moments: input.shouldCountMissedMoments ?? true,
    };
    if (input.lastFetch !== undefined) data.last_fetch = int64(input.lastFetch);
    if (input.syncToken) data.sync_token = input.syncToken;

    return this.http.post<GetLatestMomentsResponse>(
      `${LOCKET_API_BASE_URL}/getLatestMomentV2`,
      { data },
      this.requestConfig(options),
    );
  }

  async delete(input: DeleteMomentInput, options?: RequestOptions) {
    return this.http.post<DeleteMomentResponse>(
      `${LOCKET_API_BASE_URL}/deleteMomentV2`,
      {
        data: {
          delete_globally: input.deleteGlobally ?? true,
          moment_uid: input.momentUid,
          owner_uid: input.ownerUid,
        },
      },
      this.requestConfig(options),
    );
  }

  /**
   * List viewers of one of your own moments.
   * **Requires a Locket Gold subscription.**
   */
  async getViews(momentUid: string, options?: RequestOptions) {
    return this.http.post<GetMomentViewsResponse>(
      `${LOCKET_API_BASE_URL}/getMomentViews`,
      { data: { moment_uid: momentUid } },
      this.requestConfig(options),
    );
  }

  async react(input: ReactToMomentInput, options?: RequestOptions) {
    return this.http.post<ReactToMomentResponse>(
      `${LOCKET_API_BASE_URL}/reactToMoment`,
      {
        data: {
          moment_uid: input.momentUid,
          reaction: input.reaction,
        },
      },
      this.requestConfig(options),
    );
  }

  private requestConfig(options?: RequestOptions) {
    const headers: Record<string, string> = { ...(options?.headers ?? {}) };
    if (options?.token) headers.Authorization = `Bearer ${options.token}`;
    return { headers, signal: options?.signal } as const;
  }
}
