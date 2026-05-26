import { PROTOBUF_INT64_TYPE } from "./constants";
import type { ProtobufInt64 } from "./types/common";

/**
 * Decode the payload (middle segment) of a JWT. Does NOT verify the signature —
 * use only to extract claims like `user_id` from a token you already trust.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string
): T {
  const segments = token.split(".");
  if (segments.length < 2) throw new Error("Invalid JWT: not enough segments");
  const b64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const json =
    typeof Buffer !== "undefined"
      ? Buffer.from(padded, "base64").toString("utf-8")
      : decodeURIComponent(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (atob as any)(padded)
            .split("")
            .map(
              (c: string) =>
                "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
            )
            .join("")
        );
  return JSON.parse(json) as T;
}

export function int64(value: string | number): ProtobufInt64 {
  return { "@type": PROTOBUF_INT64_TYPE, value: String(value) };
}
