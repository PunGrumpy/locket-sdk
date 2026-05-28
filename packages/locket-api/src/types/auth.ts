// ───── Inputs ──────────────────────────────────────────────────────────

export interface SignInWithPhoneInput {
  phone: string;
  password: string;
}

export interface SignInWithEmailInput {
  email: string;
  password: string;
  clientType?: string;
  returnSecureToken?: boolean;
}

// ───── Raw endpoint responses ──────────────────────────────────────────

/**
 * Response body from `POST /signInWithPhonePassword`.
 *
 * Locket always returns HTTP 200 here; failure is signalled by
 * `result.status !== 200` and a missing `result.token`.
 */
export interface PhoneSignInResponse {
  result: {
    /** Firebase custom token — exchange via `verifyCustomToken`. Absent on failure. */
    token?: string;
    /** Inner status: 200 = success, 400 = bad credentials, … */
    status: number;
  };
}

/**
 * Response body from `POST /identitytoolkit/v3/relyingparty/verifyPassword`.
 * Already contains a usable `idToken` and `refreshToken`.
 */
export interface EmailSignInResponse {
  kind: string;
  localId: string;
  email: string;
  displayName?: string;
  idToken: string;
  registered: boolean;
  profilePicture?: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Response body from `POST /identitytoolkit/v3/relyingparty/verifyCustomToken`.
 */
export interface VerifyCustomTokenResponse {
  kind: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  isNewUser: boolean;
}

/**
 * Response body from `POST /securetoken.googleapis.com/v1/token`.
 * Note the snake_case fields — these come straight from Google.
 */
export interface RefreshTokenResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
  refresh_token: string;
  id_token: string;
  user_id: string;
  project_id: string;
}

export interface ProviderUserInfo {
  providerId: string;
  rawId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  phoneNumber?: string;
  federatedId?: string;
}

export interface AccountInfoUser {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  phoneNumber?: string;
  /** Redacted by Firebase, always "UkVEQUNURUQ=" — never the real hash. */
  passwordHash?: string;
  passwordUpdatedAt?: number;
  providerUserInfo?: ProviderUserInfo[];
  validSince?: string;
  lastLoginAt?: string;
  createdAt?: string;
  customAuth?: boolean;
  /** Stringified JSON, e.g. `{"revenueCatEntitlements":["Gold"]}` */
  customAttributes?: string;
  lastRefreshAt?: string;
}

export interface GetAccountInfoResponse {
  kind: string;
  users: AccountInfoUser[];
}

// ───── Combined / decoded shapes ───────────────────────────────────────

/**
 * Result of the high-level `signInWithPhone()` convenience.
 * Contains the raw bodies of both API calls so nothing is lost.
 */
export interface PhoneSignInResult {
  /** Raw response from `POST /signInWithPhonePassword`. */
  phone: PhoneSignInResponse;
  /** Raw response from `POST /verifyCustomToken` — contains the idToken/refreshToken. */
  identity: VerifyCustomTokenResponse;
}

/** Decoded payload of a Locket / Firebase JWT idToken. */
export interface LocketJwtPayload {
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  auth_time: number;
  user_id: string;
  sub: string;
  iat: number;
  exp: number;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  revenueCatEntitlements?: string[];
  firebase?: {
    identities?: Record<string, unknown>;
    sign_in_provider?: string;
  };
  [key: string]: unknown;
}

// ───── Session ─────────────────────────────────────────────────────────

export interface AuthSession {
  idToken: string;
  refreshToken: string;
  /** TTL in seconds, as returned by Firebase (string, e.g. "3600"). */
  expiresIn?: string;
  /** Absolute expiry timestamp in ms since epoch. Computed from `expiresIn`. */
  expiresAt?: number;
  uid?: string;
}
