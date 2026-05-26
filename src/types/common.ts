export interface ProtobufInt64 {
  "@type": "type.googleapis.com/google.protobuf.Int64Value";
  value: string;
}

export interface RequestOptions {
  /** Override the bearer token for this single request. */
  token?: string;
  /** Extra headers to merge into the request. */
  headers?: Record<string, string>;
  /** Per-request abort signal. */
  signal?: AbortSignal;
}
