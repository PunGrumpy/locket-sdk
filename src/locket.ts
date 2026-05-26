import { HttpClient } from "./http";
import { SessionStore } from "./session";
import {
  AuthModule,
  AuthModuleOptions,
  FirestoreListResponse,
  FriendsModule,
  FriendsModuleOptions,
  MomentsModule,
  UsersModule,
} from "./modules";
import type {
  AccountInfoUser,
  AuthSession,
  EmailSignInResponse,
  GetAccountInfoResponse,
  PhoneSignInResponse,
  PhoneSignInResult,
  RefreshTokenResponse,
  VerifyCustomTokenResponse,
} from "./types/auth";
import type { FetchUserResponse, Friend } from "./types/user";
import type {
  DeleteMomentResponse,
  GetLatestMomentsResponse,
  GetMomentViewsResponse,
  ReactToMomentResponse,
} from "./types/moment";
export interface LocketOptions {
  /** Pre-existing session (e.g. restored from disk). */
  session?: AuthSession;
  /** HTTP request timeout in ms. Defaults to 30s. */
  timeout?: number;
  /** Custom User-Agent string. */
  userAgent?: string;
  /** Headers added to every request. */
  defaultHeaders?: Record<string, string>;
  /** Override Firebase API key / iOS bundle id / client type. */
  auth?: AuthModuleOptions;
  /** Override Firestore project id. */
  friends?: FriendsModuleOptions;
}

export interface GetLatestMomentsOptions {
  excludedUsers?: string[];
  lastFetch?: number;
  shouldCountMissedMoments?: boolean;
  syncToken?: string;
}

/**
 * Locket — single class to talk to the Locket Camera API.
 *
 * @example
 * ```ts
 * const locket = new Locket();
 * await locket.signInWithEmail("you@example.com", "password");
 * const feed = await locket.getLatestMoments();
 * await locket.react(feed.result.data[0]!.canonical_uid, "Nice!");
 * ```
 */
export class Locket {
  private readonly http: HttpClient;
  private readonly session: SessionStore;
  private readonly authModule: AuthModule;
  private readonly momentsModule: MomentsModule;
  private readonly usersModule: UsersModule;
  private readonly friendsModule: FriendsModule;

  constructor(options: LocketOptions = {}) {
    this.session = new SessionStore();
    if (options.session) this.session.set(options.session);

    this.http = new HttpClient({
      timeout: options.timeout,
      userAgent: options.userAgent,
      defaultHeaders: options.defaultHeaders,
      tokenProvider: this.session,
    });

    this.authModule = new AuthModule(this.http, this.session, options.auth);
    this.momentsModule = new MomentsModule(this.http);
    this.usersModule = new UsersModule(this.http);
    this.friendsModule = new FriendsModule(this.http, this.session, options.friends);
  }

  // ───── Session helpers ─────────────────────────────────────────────

  /** Returns the in-memory session, or null when signed out. */
  getSession(): AuthSession | null {
    return this.session.get();
  }

  /** Manually inject a session (e.g. restored from disk). */
  setSession(session: AuthSession): void {
    this.session.set(session);
  }

  /** True when an idToken is available. */
  isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  /** Clear the current session. */
  signOut(): void {
    this.authModule.signOut();
  }

  // ───── Auth ────────────────────────────────────────────────────────

  /**
   * Sign in with email + password (Firebase `verifyPassword`).
   * Returns the full upstream body (kind, localId, email, idToken, refreshToken, …)
   * and populates the session.
   */
  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<EmailSignInResponse> {
    return this.authModule.signInWithEmail({ email, password });
  }

  /**
   * Sign in with Locket phone number + password (two-step internally).
   * Returns both raw responses:
   *   - `phone`    — `POST /signInWithPhonePassword`
   *   - `identity` — `POST /verifyCustomToken` (contains `idToken`/`refreshToken`)
   *
   * Throws `LocketError` if the inner `phone.result.status` is not 200.
   */
  async signInWithPhone(
    phone: string,
    password: string,
  ): Promise<PhoneSignInResult> {
    return this.authModule.signInWithPhone({ phone, password });
  }

  /**
   * Low-level: call `/signInWithPhonePassword` only and return the raw body.
   * Useful if you want to handle the custom-token exchange yourself.
   */
  async signInWithPhonePassword(
    phone: string,
    password: string,
  ): Promise<PhoneSignInResponse> {
    return this.authModule.signInWithPhonePassword({ phone, password });
  }

  /**
   * Exchange a Firebase custom token for `idToken` + `refreshToken`
   * (`verifyCustomToken`). Does NOT touch the session.
   */
  async exchangeCustomToken(
    customToken: string,
  ): Promise<VerifyCustomTokenResponse> {
    return this.authModule.exchangeCustomToken(customToken);
  }

  /**
   * Refresh the current session using a refresh token.
   * Updates the session in-place and returns the full upstream body
   * (access_token, id_token, refresh_token, expires_in, user_id, project_id, …).
   */
  async refreshToken(refreshToken?: string): Promise<RefreshTokenResponse> {
    return this.authModule.refreshToken(refreshToken);
  }

  /** Get the full account-info payload (kind + users[]) for the signed-in user. */
  async getAccountInfo(idToken?: string): Promise<GetAccountInfoResponse> {
    return this.authModule.getAccountInfo(idToken);
  }

  /** Convenience: just the first `users[0]` from getAccountInfo. */
  async getMe(): Promise<AccountInfoUser | undefined> {
    const info = await this.authModule.getAccountInfo();
    return info.users?.[0];
  }

  // ───── Moments ─────────────────────────────────────────────────────

  /**
   * Fetch the latest moments from one or many users.
   * Pass `undefined` (or omit `users`) to fetch from every friend.
   */
  async getLatestMoments(
    users?: string[],
    options: GetLatestMomentsOptions = {},
  ): Promise<GetLatestMomentsResponse> {
    return this.momentsModule.getLatest({ users, ...options });
  }

  /**
   * React to a moment with any emoji.
   * Returns `{ result: { data?: [momentUid], errors?: [...], status } }` —
   * inspect `result.status === 200` for success.
   */
  async react(
    momentUid: string,
    reaction: string,
  ): Promise<ReactToMomentResponse> {
    return this.momentsModule.react({ momentUid, reaction });
  }

  /**
   * List who has viewed one of **your own** moments.
   *
   * **Requires a Locket Gold subscription.** For non-Gold accounts, Locket
   * still returns a 200 HTTP but the inner `result.status` will reflect an
   * error.
   *
   * Inner statuses:
   *   - 200 → `result.data.moment_views` + `result.data.count`
   *   - 404 → `result.errors === ["Moment not found"]`
   *   - 401 → `result.errors === ["User does not have access to this moment"]`
   */
  async getMomentViews(momentUid: string): Promise<GetMomentViewsResponse> {
    return this.momentsModule.getViews(momentUid);
  }

  /**
   * Delete one of your own moments.
   *
   * `deleteGlobally` (default `true`) — when true, removes the moment for
   * everyone (not just yourself).
   *
   * Returns the raw body — on success `result.data` is `[momentUid]` and no
   * `status` is sent; on failure `result.errors` + `result.status` are populated.
   */
  async deleteMoment(
    momentUid: string,
    ownerUid: string,
    deleteGlobally = true,
  ): Promise<DeleteMomentResponse> {
    return this.momentsModule.delete({
      momentUid,
      ownerUid,
      deleteGlobally,
    });
  }

  // ───── Users & friends ─────────────────────────────────────────────

  /** Fetch the public profile of a Locket user by UID. */
  async fetchUser(userUid: string): Promise<FetchUserResponse> {
    return this.usersModule.fetch({ userUid });
  }

  /** List the friend UIDs of a user (defaults to the signed-in user). */
  async listFriends(userUid?: string): Promise<string[]> {
    return this.friendsModule.listUids(userUid);
  }

  /**
   * Parsed friend list with metadata: `uid`, `sharedHistoryOn`,
   * `createdAt`, `updatedAt` as `Date` objects.
   */
  async listFriendsDetailed(userUid?: string): Promise<Friend[]> {
    return this.friendsModule.listDetailed(userUid);
  }

  /** Same as `listFriends` but returns raw Firestore documents. */
  async listFriendsRaw(userUid?: string): Promise<FirestoreListResponse> {
    return this.friendsModule.listRaw(userUid);
  }
}
