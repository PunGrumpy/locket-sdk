import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { Locket } from "../src/locket";
import { SessionStore } from "../src/session";
import type { AuthSession } from "../src/types/auth";

describe("Locket SDK", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize default instances correctly", () => {
      const locket = new Locket();

      expect((locket as any).session).toBeInstanceOf(SessionStore);
      expect((locket as any).http).toBeDefined();
      expect((locket as any).authModule).toBeDefined();
      expect((locket as any).momentsModule).toBeDefined();
      expect((locket as any).usersModule).toBeDefined();
      expect((locket as any).friendsModule).toBeDefined();

      expect(locket.getSession()).toBeNull();
      expect(locket.isAuthenticated()).toBe(false);
    });

    it("should initialize with custom options and set pre-existing session", () => {
      const session: AuthSession = {
        idToken: "init-id-token",
        refreshToken: "init-refresh-token",
        uid: "init-uid",
      };

      const locket = new Locket({
        session,
        timeout: 10000,
        userAgent: "custom-ua",
        auth: {
          firebaseApiKey: "custom-api-key",
          clientType: "custom-client-type",
        },
        friends: {
          projectId: "custom-project-id",
        },
      });

      expect(locket.getSession()).toEqual(session);
      expect(locket.isAuthenticated()).toBe(true);

      // Verify AuthModule options got passed
      expect((locket as any).authModule.firebaseApiKey).toBe("custom-api-key");
      expect((locket as any).authModule.clientType).toBe("custom-client-type");

      // Verify FriendsModule options got passed
      expect((locket as any).friendsModule.projectId).toBe("custom-project-id");
    });
  });

  describe("Session Helpers", () => {
    it("should correctly handle setSession, getSession, isAuthenticated, and signOut", () => {
      const locket = new Locket();
      const session: AuthSession = {
        idToken: "token-abc",
        refreshToken: "token-xyz",
        uid: "user-abc",
      };

      expect(locket.isAuthenticated()).toBe(false);

      locket.setSession(session);
      expect(locket.getSession()).toEqual(session);
      expect(locket.isAuthenticated()).toBe(true);

      locket.signOut();
      expect(locket.getSession()).toBeNull();
      expect(locket.isAuthenticated()).toBe(false);
    });
  });

  describe("Auth Delegated Methods", () => {
    it("should call authModule.signInWithEmail and return its response", async () => {
      const locket = new Locket();
      const mockRes = { idToken: "token", localId: "uid" } as any;
      const spy = vi
        .spyOn((locket as any).authModule, "signInWithEmail")
        .mockResolvedValue(mockRes);

      const result = await locket.signInWithEmail("test@example.com", "pass");

      expect(spy).toHaveBeenCalledWith({ email: "test@example.com", password: "pass" });
      expect(result).toBe(mockRes);
    });

    it("should call authModule.signInWithPhone and return its response", async () => {
      const locket = new Locket();
      const mockRes = { phone: {}, identity: {} } as any;
      const spy = vi
        .spyOn((locket as any).authModule, "signInWithPhone")
        .mockResolvedValue(mockRes);

      const result = await locket.signInWithPhone("+12345678", "pass");

      expect(spy).toHaveBeenCalledWith({ phone: "+12345678", password: "pass" });
      expect(result).toBe(mockRes);
    });

    it("should call authModule.signInWithPhonePassword and return its response", async () => {
      const locket = new Locket();
      const mockRes = { result: { token: "custom-token", status: 200 } } as any;
      const spy = vi
        .spyOn((locket as any).authModule, "signInWithPhonePassword")
        .mockResolvedValue(mockRes);

      const result = await locket.signInWithPhonePassword("+12345678", "pass");

      expect(spy).toHaveBeenCalledWith({ phone: "+12345678", password: "pass" });
      expect(result).toBe(mockRes);
    });

    it("should call authModule.exchangeCustomToken and return its response", async () => {
      const locket = new Locket();
      const mockRes = { idToken: "id", refreshToken: "refresh" } as any;
      const spy = vi
        .spyOn((locket as any).authModule, "exchangeCustomToken")
        .mockResolvedValue(mockRes);

      const result = await locket.exchangeCustomToken("my-custom-token");

      expect(spy).toHaveBeenCalledWith("my-custom-token");
      expect(result).toBe(mockRes);
    });

    it("should call authModule.refreshToken and return its response", async () => {
      const locket = new Locket();
      const mockRes = { id_token: "id", refresh_token: "refresh" } as any;
      const spy = vi.spyOn((locket as any).authModule, "refreshToken").mockResolvedValue(mockRes);

      const result = await locket.refreshToken("my-refresh-token");

      expect(spy).toHaveBeenCalledWith("my-refresh-token");
      expect(result).toBe(mockRes);
    });

    it("should call authModule.getAccountInfo and return its response", async () => {
      const locket = new Locket();
      const mockRes = { users: [] } as any;
      const spy = vi.spyOn((locket as any).authModule, "getAccountInfo").mockResolvedValue(mockRes);

      const result = await locket.getAccountInfo("custom-id-token");

      expect(spy).toHaveBeenCalledWith("custom-id-token");
      expect(result).toBe(mockRes);
    });

    it("should fetch user details via getMe", async () => {
      const locket = new Locket();
      const mockUser = { localId: "user-1", email: "me@example.com" };
      const mockRes = { users: [mockUser] } as any;
      const spy = vi.spyOn((locket as any).authModule, "getAccountInfo").mockResolvedValue(mockRes);

      const result = await locket.getMe();

      expect(spy).toHaveBeenCalledWith();
      expect(result).toBe(mockUser);
    });

    it("should return undefined from getMe when user list is empty", async () => {
      const locket = new Locket();
      const mockRes = { users: [] } as any;
      vi.spyOn((locket as any).authModule, "getAccountInfo").mockResolvedValue(mockRes);

      const result = await locket.getMe();
      expect(result).toBeUndefined();
    });
  });

  describe("Moments Delegated Methods", () => {
    it("should call momentsModule.getLatest and return its response", async () => {
      const locket = new Locket();
      const mockRes = { result: { data: [] } } as any;
      const spy = vi.spyOn((locket as any).momentsModule, "getLatest").mockResolvedValue(mockRes);

      const result = await locket.getLatestMoments(["u1"], {
        lastFetch: 1000,
        shouldCountMissedMoments: false,
      });

      expect(spy).toHaveBeenCalledWith({
        users: ["u1"],
        lastFetch: 1000,
        shouldCountMissedMoments: false,
      });
      expect(result).toBe(mockRes);
    });

    it("should call momentsModule.react and return its response", async () => {
      const locket = new Locket();
      const mockRes = { result: { status: 200 } } as any;
      const spy = vi.spyOn((locket as any).momentsModule, "react").mockResolvedValue(mockRes);

      const result = await locket.react("mom-uid", "👋");

      expect(spy).toHaveBeenCalledWith({ momentUid: "mom-uid", reaction: "👋" });
      expect(result).toBe(mockRes);
    });

    it("should call momentsModule.getViews and return its response", async () => {
      const locket = new Locket();
      const mockRes = { result: { data: {} } } as any;
      const spy = vi.spyOn((locket as any).momentsModule, "getViews").mockResolvedValue(mockRes);

      const result = await locket.getMomentViews("mom-uid");

      expect(spy).toHaveBeenCalledWith("mom-uid");
      expect(result).toBe(mockRes);
    });

    it("should call momentsModule.delete and return its response", async () => {
      const locket = new Locket();
      const mockRes = { result: { data: [] } } as any;
      const spy = vi.spyOn((locket as any).momentsModule, "delete").mockResolvedValue(mockRes);

      const result = await locket.deleteMoment("mom-uid", "owner-uid", false);

      expect(spy).toHaveBeenCalledWith({
        momentUid: "mom-uid",
        ownerUid: "owner-uid",
        deleteGlobally: false,
      });
      expect(result).toBe(mockRes);
    });
  });

  describe("Users & Friends Delegated Methods", () => {
    it("should call usersModule.fetch and return user data", async () => {
      const locket = new Locket();
      const mockRes = { user: {} } as any;
      const spy = vi.spyOn((locket as any).usersModule, "fetch").mockResolvedValue(mockRes);

      const result = await locket.fetchUser("user-uid");

      expect(spy).toHaveBeenCalledWith({ userUid: "user-uid" });
      expect(result).toBe(mockRes);
    });

    it("should call friendsModule.listUids and return uids", async () => {
      const locket = new Locket();
      const mockRes = ["friend-1", "friend-2"];
      const spy = vi.spyOn((locket as any).friendsModule, "listUids").mockResolvedValue(mockRes);

      const result = await locket.listFriends("user-uid");

      expect(spy).toHaveBeenCalledWith("user-uid");
      expect(result).toBe(mockRes);
    });

    it("should call friendsModule.listDetailed and return parsed friends", async () => {
      const locket = new Locket();
      const mockRes = [{ uid: "friend-1" }] as any;
      const spy = vi
        .spyOn((locket as any).friendsModule, "listDetailed")
        .mockResolvedValue(mockRes);

      const result = await locket.listFriendsDetailed("user-uid");

      expect(spy).toHaveBeenCalledWith("user-uid");
      expect(result).toBe(mockRes);
    });

    it("should call friendsModule.listRaw and return Firestore list response", async () => {
      const locket = new Locket();
      const mockRes = { documents: [] } as any;
      const spy = vi.spyOn((locket as any).friendsModule, "listRaw").mockResolvedValue(mockRes);

      const result = await locket.listFriendsRaw("user-uid");

      expect(spy).toHaveBeenCalledWith("user-uid");
      expect(result).toBe(mockRes);
    });
  });
});
