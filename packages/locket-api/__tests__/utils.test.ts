import { describe, it, expect } from "vite-plus/test";
import { decodeJwtPayload, int64 } from "../src/utils";
import { PROTOBUF_INT64_TYPE } from "../src/constants";

describe("utils", () => {
  describe("decodeJwtPayload", () => {
    it("should correctly decode a valid base64url encoded JWT payload", () => {
      // payload is {"user_id":"12345","name":"Test User"}
      // base64url encoded: eyJ1c2VyX2lkIjoiMTIzNDUiLCJuYW1lIjoiVGVzdCBVc2VyIn0
      const token = "header.eyJ1c2VyX2lkIjoiMTIzNDUiLCJuYW1lIjoiVGVzdCBVc2VyIn0.signature";
      const payload = decodeJwtPayload<{ user_id: string; name: string }>(token);

      expect(payload).toEqual({
        user_id: "12345",
        name: "Test User",
      });
    });

    it("should handle base64url characters like '-' and '_'", () => {
      // payload with special chars: {"test":"<-_>"}
      // base64 encoded: eyJ0ZXN0IjoiPC1fPiJ9
      const token = "header.eyJ0ZXN0IjoiPC1fPiJ9.signature";
      const payload = decodeJwtPayload<{ test: string }>(token);

      expect(payload).toEqual({
        test: "<-_>",
      });
    });

    it("should throw an error if the token has no payload segment", () => {
      expect(() => decodeJwtPayload("no-segments")).toThrow("Invalid JWT: not enough segments");
    });

    it("should throw an error if the payload is not valid JSON", () => {
      // "invalid" encoded in base64: aW52YWxpZA
      const token = "header.aW52YWxpZA.signature";
      expect(() => decodeJwtPayload(token)).toThrow(SyntaxError);
    });

    it("should fallback to atob translation when Buffer is not defined", () => {
      const originalBuffer = globalThis.Buffer;
      // Temporarily remove Buffer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).Buffer;

      try {
        const token = "header.eyJ1c2VyX2lkIjoiMTIzNDUiLCJuYW1lIjoiVGVzdCBVc2VyIn0.signature";
        const payload = decodeJwtPayload<{ user_id: string }>(token);
        expect(payload.user_id).toBe("12345");
      } finally {
        globalThis.Buffer = originalBuffer;
      }
    });
  });

  describe("int64", () => {
    it("should format string numbers into ProtobufInt64", () => {
      const result = int64("123456789012345");
      expect(result).toEqual({
        "@type": PROTOBUF_INT64_TYPE,
        value: "123456789012345",
      });
    });

    it("should format number values into ProtobufInt64 as string value", () => {
      const result = int64(98765);
      expect(result).toEqual({
        "@type": PROTOBUF_INT64_TYPE,
        value: "98765",
      });
    });
  });
});
