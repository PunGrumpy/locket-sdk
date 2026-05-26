export interface FetchUserInput {
  userUid: string;
}

/**
 * Public profile of a Locket user as returned by `POST /fetchUserV2`.
 * Several fields are explicitly nullable (Locket sends `null`, not `undefined`).
 */
export interface LocketUser {
  uid: string;
  first_name: string | null;
  last_name: string | null;
  /** e.g. `"locket_gold"` or `null`. */
  badge: string | null;
  profile_picture_url?: string;
  /** True for users created by the in-app onboarding "temp" flow. */
  temp?: boolean;
  /** Username (slug); only set if the user picked one. */
  username: string | null;
}

/**
 * Wrapper around `POST /fetchUserV2`. The endpoint always returns HTTP 200
 * — success vs failure is signalled by `result.status` and the presence of
 * either `data` or `errors`.
 */
export interface FetchUserResponse {
  result: {
    /** Present when `status === 200`. */
    data?: LocketUser;
    /** Present on failure, e.g. `["Please sign in"]`, `["You don't have access to this user"]`. */
    errors?: string[];
    /** 200 = success, 401 = no/insufficient auth, … */
    status: number;
  };
}

/**
 * A parsed friend entry derived from the raw Firestore document at
 * `users/{uid}/friends/{friendUid}`.
 */
export interface Friend {
  uid: string;
  /** When the user opted-in to sharing past moments with this friend. */
  sharedHistoryOn?: Date;
  /** Friendship document `createTime`. */
  createdAt?: Date;
  /** Friendship document `updateTime`. */
  updatedAt?: Date;
}
