/** Firestore-style timestamp returned by Locket on moment objects. */
export interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

export interface Moment {
  /** Canonical id used by Locket for this moment. */
  canonical_uid: string;
  /** Author user UID. */
  user: string;
  /** Capture time. */
  date: FirestoreTimestamp | string;
  md5?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_url?: string;
  caption?: string;
  /** Other fields (overlays, reactions, …) are exposed via the index signature. */
  [key: string]: unknown;
}

export interface GetLatestMomentsInput {
  /** User UIDs whose moments you want to fetch (defaults to all friends). */
  users?: string[];
  excludedUsers?: string[];
  lastFetch?: number;
  shouldCountMissedMoments?: boolean;
  syncToken?: string;
}

export interface DeleteMomentInput {
  momentUid: string;
  ownerUid: string;
  /** When true (default), removes the moment for everyone, not just yourself. */
  deleteGlobally?: boolean;
}

/**
 * Response body from `POST /deleteMomentV2`.
 *
 *   - Success: `{ result: { data: [momentUid] } }` — note: no `status` field on success.
 *   - Failure: `{ result: { errors: [...], status: <number> } }`
 */
export interface DeleteMomentResponse {
  result: {
    /** UIDs of the moments that were deleted (success only). */
    data?: string[];
    errors?: string[];
    status?: number;
  };
}

export interface ReactToMomentInput {
  momentUid: string;
  /** Reaction text — any string (emoji or plain text). */
  reaction: string;
}

/**
 * Response body from `POST /reactToMoment`.
 *
 *   - Success: `{ result: { data: [momentUid], status: 200 } }`
 *   - Failure: `{ result: { errors: ["You don't have access to this moment"], status: 401 } }`
 */
export interface ReactToMomentResponse {
  result: {
    /** UIDs of the moments the reaction was applied to (success only). */
    data?: string[];
    errors?: string[];
    status: number;
  };
}

/**
 * Response body from `POST /getLatestMomentV2`.
 *
 * `result.status` semantics:
 *   - 200 → there are new moments in `result.data`
 *   - 304 → nothing new since the provided `sync_token` (data is empty)
 */
export interface GetLatestMomentsResponse {
  result: {
    data: Moment[];
    missed_moments_count?: number;
    sync_token?: string;
    status: number;
  };
}

/** Single viewer entry on a moment. Known field is `user`; extra fields are passed through. */
export interface MomentView {
  user?: string;
  [key: string]: unknown;
}

/**
 * Response body from `POST /getMomentViews`.
 *
 * `result.status` semantics:
 *   - 200 → success — `data.moment_views` + `data.count` are present
 *   - 401 → caller is not the moment's owner (or no Bearer token)
 *   - 404 → moment_uid not found
 */
export interface GetMomentViewsResponse {
  result: {
    data?: {
      moment_views: MomentView[];
      count: number;
    };
    errors?: string[];
    status: number;
  };
}
