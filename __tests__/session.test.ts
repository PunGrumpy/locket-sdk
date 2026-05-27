import { describe, it, expect } from "vite-plus/test";
import { SessionStore } from "../src/session";
import type { AuthSession } from "../src/types/auth";

describe("SessionStore", () => {
  it("should initialize with null session", () => {
    const store = new SessionStore();
    expect(store.get()).toBeNull();
    expect(store.getIdToken()).toBeUndefined();
    expect(store.getRefreshToken()).toBeUndefined();
    expect(store.isAuthenticated()).toBe(false);
  });

  it("should set a session and return its values", () => {
    const store = new SessionStore();
    const session: AuthSession = {
      idToken: "test-id-token",
      refreshToken: "test-refresh-token",
      uid: "user-123",
      expiresIn: "3600",
      expiresAt: Date.now() + 3600 * 1000,
    };

    store.set(session);

    expect(store.get()).toEqual(session);
    expect(store.getIdToken()).toBe("test-id-token");
    expect(store.getRefreshToken()).toBe("test-refresh-token");
    expect(store.isAuthenticated()).toBe(true);
  });

  it("should update an existing session", () => {
    const store = new SessionStore();
    const session: AuthSession = {
      idToken: "original-id-token",
      refreshToken: "original-refresh-token",
      uid: "user-123",
    };

    store.set(session);

    store.update({
      idToken: "new-id-token",
    });

    expect(store.get()).toEqual({
      idToken: "new-id-token",
      refreshToken: "original-refresh-token",
      uid: "user-123",
    });
    expect(store.getIdToken()).toBe("new-id-token");
    expect(store.getRefreshToken()).toBe("original-refresh-token");
  });

  it("should initialize session on update if no session is set", () => {
    const store = new SessionStore();
    const patch: Partial<AuthSession> = {
      idToken: "patched-id-token",
      uid: "user-999",
    };

    store.update(patch);

    expect(store.get()).toEqual(patch);
    expect(store.getIdToken()).toBe("patched-id-token");
    expect(store.isAuthenticated()).toBe(true);
  });

  it("should clear the session", () => {
    const store = new SessionStore();
    const session: AuthSession = {
      idToken: "id-token",
      refreshToken: "refresh-token",
    };

    store.set(session);
    expect(store.isAuthenticated()).toBe(true);

    store.clear();

    expect(store.get()).toBeNull();
    expect(store.getIdToken()).toBeUndefined();
    expect(store.getRefreshToken()).toBeUndefined();
    expect(store.isAuthenticated()).toBe(false);
  });

  it("should handle authentication status checks correctly", () => {
    const store = new SessionStore();

    // No session
    expect(store.isAuthenticated()).toBe(false);

    // Session without idToken
    store.set({ refreshToken: "refresh-token" } as any);
    expect(store.isAuthenticated()).toBe(false);

    // Session with idToken
    store.update({ idToken: "id-token" });
    expect(store.isAuthenticated()).toBe(true);
  });
});
