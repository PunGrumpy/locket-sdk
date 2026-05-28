import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import axios, { AxiosError } from "axios";
import { HttpClient } from "../src/http";
import { LocketError } from "../src/errors";
import { DEFAULT_USER_AGENT } from "../src/constants";

describe("HttpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor Configuration", () => {
    it("should instantiate axios with default configurations", () => {
      const axiosCreateSpy = vi.spyOn(axios, "create");
      new HttpClient();

      expect(axiosCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "*/*",
            "User-Agent": DEFAULT_USER_AGENT,
          }),
        }),
      );
    });

    it("should override timeout, userAgent, defaultHeaders, and baseURL", () => {
      const axiosCreateSpy = vi.spyOn(axios, "create");
      new HttpClient({
        baseURL: "https://api.locket.camera/v1",
        timeout: 5000,
        userAgent: "CustomUserAgent/1.0",
        defaultHeaders: {
          "X-Custom-Header": "foo",
        },
      });

      expect(axiosCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: "https://api.locket.camera/v1",
          timeout: 5000,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "*/*",
            "User-Agent": "CustomUserAgent/1.0",
            "X-Custom-Header": "foo",
          }),
        }),
      );
    });
  });

  describe("Request Interceptor (Token Insertion)", () => {
    it("should attach Authorization header when tokenProvider returns a token", async () => {
      const tokenProvider = {
        getIdToken: vi.fn().mockReturnValue("mock-id-token"),
      };

      const client = new HttpClient({ tokenProvider });

      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { result: "success" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });
      });

      const data = await client.get("/test", { adapter: mockAdapter });

      expect(data).toEqual({ result: "success" });
      expect(tokenProvider.getIdToken).toHaveBeenCalled();

      const calledConfig = mockAdapter.mock.calls[0]![0];
      // Headers can be accessed via config.headers.get("Authorization") or config.headers.Authorization
      expect(calledConfig.headers.Authorization).toBe("Bearer mock-id-token");
    });

    it("should not attach Authorization header if tokenProvider returns undefined", async () => {
      const tokenProvider = {
        getIdToken: vi.fn().mockReturnValue(undefined),
      };

      const client = new HttpClient({ tokenProvider });

      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { result: "success" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });
      });

      await client.get("/test", { adapter: mockAdapter });

      const calledConfig = mockAdapter.mock.calls[0]![0];
      expect(calledConfig.headers.Authorization).toBeUndefined();
    });

    it("should skip Authorization header when skipAuth is true", async () => {
      const tokenProvider = {
        getIdToken: vi.fn().mockReturnValue("mock-id-token"),
      };

      const client = new HttpClient({ tokenProvider });

      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { result: "success" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });
      });

      await client.get("/test", { skipAuth: true, adapter: mockAdapter });

      const calledConfig = mockAdapter.mock.calls[0]![0];
      expect(calledConfig.headers.Authorization).toBeUndefined();
    });

    it("should not override existing Authorization header", async () => {
      const tokenProvider = {
        getIdToken: vi.fn().mockReturnValue("mock-id-token"),
      };

      const client = new HttpClient({ tokenProvider });

      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { result: "success" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });
      });

      await client.get("/test", {
        headers: { Authorization: "Bearer pre-existing-token" },
        adapter: mockAdapter,
      });

      const calledConfig = mockAdapter.mock.calls[0]![0];
      expect(calledConfig.headers.Authorization).toBe("Bearer pre-existing-token");
    });
  });

  describe("Response Interceptor (Error Wrapping)", () => {
    it("should return the response data directly on successful requests", async () => {
      const client = new HttpClient();
      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { foo: "bar" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });
      });

      const data = await client.request({ url: "/ok", adapter: mockAdapter });
      expect(data).toEqual({ foo: "bar" });
    });

    it("should wrap Axios errors in LocketError", async () => {
      const client = new HttpClient();

      const mockAdapter = vi.fn().mockImplementation((config) => {
        const response = {
          data: { error: { message: "Access Denied", code: "ACCESS_DENIED" } },
          status: 403,
          statusText: "Forbidden",
          headers: {},
          config,
        };
        const error = new AxiosError(
          "Forbidden request",
          "ERR_BAD_REQUEST",
          config,
          {},
          response as any,
        );
        return Promise.reject(error);
      });

      await expect(client.get("/forbidden", { adapter: mockAdapter })).rejects.toThrowError(
        LocketError,
      );

      try {
        await client.get("/forbidden", { adapter: mockAdapter });
      } catch (err: any) {
        expect(err).toBeInstanceOf(LocketError);
        expect(err.message).toBe("Access Denied");
        expect(err.status).toBe(403);
        expect(err.code).toBe("ACCESS_DENIED");
      }
    });
  });

  describe("HTTP Verb Helper Methods", () => {
    it("should execute POST request with custom body", async () => {
      const client = new HttpClient();
      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { created: true },
          status: 201,
          statusText: "Created",
          headers: {},
          config,
        });
      });

      const body = { name: "test-item" };
      const data = await client.post("/items", body, { adapter: mockAdapter });

      expect(data).toEqual({ created: true });
      const calledConfig = mockAdapter.mock.calls[0]![0];
      expect(calledConfig.method?.toLowerCase()).toBe("post");
      expect(JSON.parse(calledConfig.data)).toEqual(body);
    });

    it("should execute PUT request with custom body", async () => {
      const client = new HttpClient();
      const mockAdapter = vi.fn().mockImplementation((config) => {
        return Promise.resolve({
          data: { updated: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });
      });

      const body = { name: "updated-name" };
      const data = await client.put("/items/1", body, { adapter: mockAdapter });

      expect(data).toEqual({ updated: true });
      const calledConfig = mockAdapter.mock.calls[0]![0];
      expect(calledConfig.method?.toLowerCase()).toBe("put");
      expect(JSON.parse(calledConfig.data)).toEqual(body);
    });
  });
});
