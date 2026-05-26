import type { AuthSession } from "./types/auth";

export class SessionStore {
  private session: AuthSession | null = null;

  set(session: AuthSession): void {
    this.session = session;
  }

  update(patch: Partial<AuthSession>): void {
    if (!this.session) {
      this.session = patch as AuthSession;
      return;
    }
    this.session = { ...this.session, ...patch };
  }

  clear(): void {
    this.session = null;
  }

  get(): AuthSession | null {
    return this.session;
  }

  getIdToken(): string | undefined {
    return this.session?.idToken;
  }

  getRefreshToken(): string | undefined {
    return this.session?.refreshToken;
  }

  isAuthenticated(): boolean {
    return Boolean(this.session?.idToken);
  }
}
