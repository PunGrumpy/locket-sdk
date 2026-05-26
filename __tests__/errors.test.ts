import { describe, it, expect } from "vite-plus/test";
import { AxiosError } from "axios";
import { LocketError } from "../src/errors";

describe("errors", () => {
  describe("LocketError", () => {
    it("should instantiate with correct properties", () => {
      const error = new LocketError("Something went wrong", {
        status: 400,
        code: "INVALID_PARAM",
        response: { detail: "Invalid email format" },
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("LocketError");
      expect(error.message).toBe("Something went wrong");
      expect(error.status).toBe(400);
      expect(error.code).toBe("INVALID_PARAM");
      expect(error.response).toEqual({ detail: "Invalid email format" });
    });

    it("should fallback to default options if none provided", () => {
      const error = new LocketError("Error message");

      expect(error.status).toBeUndefined();
      expect(error.code).toBeUndefined();
      expect(error.response).toBeUndefined();
    });
  });

  describe("fromAxios", () => {
    it("should return the error unmodified if it is already a LocketError", () => {
      const original = new LocketError("Some locket error");
      const result = LocketError.fromAxios(original);
      expect(result).toBe(original);
    });

    it("should convert an AxiosError with structured Locket error data", () => {
      const response = {
        status: 403,
        statusText: "Forbidden",
        headers: {},
        config: {} as any,
        data: {
          error: {
            message: "User lacks permission",
            code: "PERMISSION_DENIED",
          },
        },
      };

      const axiosError = new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        response as any,
      );

      const result = LocketError.fromAxios(axiosError);

      expect(result).toBeInstanceOf(LocketError);
      expect(result.message).toBe("User lacks permission");
      expect(result.status).toBe(403);
      expect(result.code).toBe("PERMISSION_DENIED");
      expect(result.response).toEqual(response.data);
    });

    it("should fallback to AxiosError message if there is no response data", () => {
      const axiosError = new AxiosError("Network Error", "ERR_NETWORK");

      const result = LocketError.fromAxios(axiosError);

      expect(result.message).toBe("Network Error");
      expect(result.status).toBeUndefined();
      expect(result.code).toBe("ERR_NETWORK");
      expect(result.response).toBeUndefined();
    });

    it("should fallback to default message if AxiosError has no message", () => {
      const axiosError = new AxiosError();
      Object.defineProperty(axiosError, "message", { value: undefined, configurable: true });

      const result = LocketError.fromAxios(axiosError);
      expect(result.message).toBe("Unknown Locket API error");
    });

    it("should convert a generic Error into a LocketError", () => {
      const generic = new Error("Standard error");
      const result = LocketError.fromAxios(generic);

      expect(result).toBeInstanceOf(LocketError);
      expect(result.message).toBe("Standard error");
      expect(result.status).toBeUndefined();
      expect(result.code).toBeUndefined();
      expect(result.response).toBeUndefined();
    });

    it("should convert an unknown object/value into a default LocketError", () => {
      const result = LocketError.fromAxios({ something: "else" });

      expect(result).toBeInstanceOf(LocketError);
      expect(result.message).toBe("Unknown error");
    });
  });
});
