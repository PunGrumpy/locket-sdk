import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { DEFAULT_USER_AGENT } from "./constants";
import { LocketError } from "./errors";

export interface TokenProvider {
  getIdToken(): string | undefined;
}

export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  userAgent?: string;
  tokenProvider?: TokenProvider;
  defaultHeaders?: Record<string, string>;
}

/**
 * Extended axios config. Set `skipAuth: true` for endpoints that
 * authenticate by API key in the query string (Google identity toolkit,
 * securetoken) so we don't also attach a stale Bearer header.
 */
export interface LocketRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

export class HttpClient {
  private readonly axios: AxiosInstance;
  private readonly tokenProvider?: TokenProvider;

  constructor(options: HttpClientOptions = {}) {
    this.tokenProvider = options.tokenProvider;

    this.axios = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        "User-Agent": options.userAgent ?? DEFAULT_USER_AGENT,
        ...options.defaultHeaders,
      },
    });

    this.axios.interceptors.request.use((config) => this.attachAuth(config));
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(LocketError.fromAxios(error)),
    );
  }

  private attachAuth(
    config: InternalAxiosRequestConfig & { skipAuth?: boolean },
  ): InternalAxiosRequestConfig {
    if (config.skipAuth) return config;

    const headerToken = config.headers?.Authorization;
    if (!headerToken && this.tokenProvider) {
      const token = this.tokenProvider.getIdToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return config;
  }

  request<T>(config: LocketRequestConfig): Promise<T> {
    return this.axios.request<T>(config).then((res) => res.data);
  }

  get<T>(url: string, config?: LocketRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  post<T>(
    url: string,
    body?: unknown,
    config?: LocketRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data: body });
  }

  put<T>(
    url: string,
    body?: unknown,
    config?: LocketRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data: body });
  }
}
