import {
  DEFAULT_CLIENT_TYPE,
  DEFAULT_IOS_BUNDLE_ID,
  GOOGLE_IDENTITY_TOOLKIT_URL,
  GOOGLE_SECURE_TOKEN_URL,
  LOCKET_API_BASE_URL,
  LOCKET_FIREBASE_API_KEY,
} from "../constants";
import { LocketError } from "../errors";
import { HttpClient } from "../http";
import { SessionStore } from "../session";
import type {
  AuthSession,
  EmailSignInResponse,
  GetAccountInfoResponse,
  LocketJwtPayload,
  PhoneSignInResponse,
  PhoneSignInResult,
  RefreshTokenResponse,
  SignInWithEmailInput,
  SignInWithPhoneInput,
  VerifyCustomTokenResponse,
} from "../types/auth";
import { decodeJwtPayload } from "../utils";

export interface AuthModuleOptions {
  firebaseApiKey?: string;
  iosBundleId?: string;
  clientType?: string;
}

function computeExpiresAt(expiresIn: string | number | undefined): number | undefined {
  if (expiresIn === undefined) return undefined;
  const seconds = typeof expiresIn === "string" ? Number(expiresIn) : expiresIn;
  if (!Number.isFinite(seconds)) return undefined;
  return Date.now() + seconds * 1000;
}

function uidFromIdToken(idToken: string): string | undefined {
  try {
    const payload = decodeJwtPayload<LocketJwtPayload>(idToken);
    return payload.user_id ?? payload.sub;
  } catch {
    return undefined;
  }
}

export class AuthModule {
  private readonly firebaseApiKey: string;
  private readonly iosBundleId: string;
  private readonly clientType: string;

  constructor(
    private readonly http: HttpClient,
    private readonly session: SessionStore,
    options: AuthModuleOptions = {},
  ) {
    this.firebaseApiKey = options.firebaseApiKey ?? LOCKET_FIREBASE_API_KEY;
    this.iosBundleId = options.iosBundleId ?? DEFAULT_IOS_BUNDLE_ID;
    this.clientType = options.clientType ?? DEFAULT_CLIENT_TYPE;
  }

  /**
   * Sign in using a phone number + password.
   *
   * Internally this calls two endpoints in sequence:
   *   1. `POST /signInWithPhonePassword`  → custom Firebase token
   *   2. `POST /verifyCustomToken`        → `idToken` + `refreshToken`
   *
   * Both raw responses are returned so callers can inspect every field.
   * On success the session is populated.
   */
  async signInWithPhone(input: SignInWithPhoneInput): Promise<PhoneSignInResult> {
    const phone = await this.signInWithPhonePassword(input);
    if (phone.result?.status !== 200 || !phone.result?.token) {
      throw new LocketError(
        `signInWithPhonePassword failed (inner status ${phone.result?.status ?? "unknown"})`,
        { status: phone.result?.status, response: phone },
      );
    }

    const identity = await this.exchangeCustomToken(phone.result.token);
    const session: AuthSession = {
      idToken: identity.idToken,
      refreshToken: identity.refreshToken,
      expiresIn: identity.expiresIn,
      expiresAt: computeExpiresAt(identity.expiresIn),
      uid: uidFromIdToken(identity.idToken),
    };
    this.session.set(session);
    return { phone, identity };
  }

  /**
   * Low-level: call `POST /signInWithPhonePassword` only and return the raw body.
   * Useful if you want to handle the custom-token exchange yourself.
   */
  async signInWithPhonePassword(
    input: SignInWithPhoneInput,
  ): Promise<PhoneSignInResponse> {
    return this.http.post<PhoneSignInResponse>(
      `${LOCKET_API_BASE_URL}/signInWithPhonePassword`,
      { data: { phone: input.phone, password: input.password } },
      { skipAuth: true },
    );
  }

  /**
   * Sign in directly through Firebase email/password (`verifyPassword`).
   * Populates the session and returns the full Firebase response body.
   */
  async signInWithEmail(
    input: SignInWithEmailInput,
  ): Promise<EmailSignInResponse> {
    const response = await this.http.post<EmailSignInResponse>(
      `${GOOGLE_IDENTITY_TOOLKIT_URL}/verifyPassword`,
      {
        clientType: input.clientType ?? this.clientType,
        email: input.email,
        password: input.password,
        returnSecureToken: input.returnSecureToken ?? true,
      },
      {
        skipAuth: true,
        params: { key: this.firebaseApiKey },
        headers: { "x-ios-bundle-identifier": this.iosBundleId },
      },
    );

    this.session.set({
      idToken: response.idToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      expiresAt: computeExpiresAt(response.expiresIn),
      uid: response.localId,
    });

    return response;
  }

  /**
   * Exchange a Firebase custom token for an `idToken` + `refreshToken`.
   * Does NOT touch the session — caller decides what to do with the result.
   */
  async exchangeCustomToken(
    customToken: string,
  ): Promise<VerifyCustomTokenResponse> {
    return this.http.post<VerifyCustomTokenResponse>(
      `${GOOGLE_IDENTITY_TOOLKIT_URL}/verifyCustomToken`,
      { token: customToken, returnSecureToken: true },
      {
        skipAuth: true,
        params: { key: this.firebaseApiKey },
        headers: { "x-ios-bundle-identifier": this.iosBundleId },
      },
    );
  }

  /**
   * Retrieve account info for the currently signed-in user (or a supplied idToken).
   */
  async getAccountInfo(idToken?: string): Promise<GetAccountInfoResponse> {
    const token = idToken ?? this.session.getIdToken();
    if (!token) throw new LocketError("Not authenticated: no idToken available");

    return this.http.post<GetAccountInfoResponse>(
      `${GOOGLE_IDENTITY_TOOLKIT_URL}/getAccountInfo`,
      { idToken: token },
      {
        skipAuth: true,
        params: { key: this.firebaseApiKey },
        headers: { "x-ios-bundle-identifier": this.iosBundleId },
      },
    );
  }

  /**
   * Refresh the current Firebase session using a refresh token.
   * Updates the in-memory session on success and returns the full Google response.
   */
  async refreshToken(refreshToken?: string): Promise<RefreshTokenResponse> {
    const token = refreshToken ?? this.session.getRefreshToken();
    if (!token) throw new LocketError("No refresh token available");

    const response = await this.http.post<RefreshTokenResponse>(
      `${GOOGLE_SECURE_TOKEN_URL}/token`,
      { grantType: "refresh_token", refreshToken: token },
      {
        skipAuth: true,
        params: { key: this.firebaseApiKey },
        headers: { "x-ios-bundle-identifier": this.iosBundleId },
      },
    );

    this.session.update({
      idToken: response.id_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      expiresAt: computeExpiresAt(response.expires_in),
      uid: response.user_id,
    });

    return response;
  }

  signOut(): void {
    this.session.clear();
  }
}
