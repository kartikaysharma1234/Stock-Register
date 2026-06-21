import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import routesJson from "../routes/backendRoutes.json";
import type { IApiError, IApiResponse } from "../types";
import { env } from "../utils/env";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface BackendRoute {
  url: string;
  method: HttpMethod;
}

export type BackendRoutes = {
  [group: string]: BackendRoute | BackendRoutes;
};

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export const routes = routesJson as BackendRoutes;

const normalizeBaseUrl = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem("accessToken"),
  getRefreshToken: () => localStorage.getItem("refreshToken"),
  setTokens: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  },
  clear: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentOrganization");
  },
};

export const api = axios.create({
  baseURL: normalizeBaseUrl(env.apiUrl),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (!token) return config;

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    config.headers = new AxiosHeaders(config.headers);
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

const isEnvelope = <T>(value: unknown): value is IApiResponse<T> => {
  if (!value || typeof value !== "object") return false;
  return "success" in value && "message" in value && "data" in value;
};

api.interceptors.response.use(
  (response) => {
    const payload: unknown = response.data;
    response.data = isEnvelope<unknown>(payload) ? payload.data : payload;
    return response;
  },
  (error: AxiosError<IApiError>) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      window.location.href = "/auth/login";
    }

    return Promise.reject(error.response?.data ?? error);
  },
);

export const buildUrl = (
  url: string,
  params: Record<string, string | number> = {},
  query: Record<string, QueryValue> = {},
) => {
  const replaced = Object.entries(params).reduce(
    (current, [key, value]) =>
      current.replace(`:${key}`, encodeURIComponent(String(value))),
    url,
  );

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, String(entry)));
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${replaced}?${queryString}` : replaced;
};

export const isBackendRoute = (
  entry: BackendRoute | BackendRoutes | undefined,
): entry is BackendRoute =>
  Boolean(
    entry &&
      typeof entry === "object" &&
      "url" in entry &&
      "method" in entry,
  );

export const getRoute = (path: string) => {
  const segments = path.split(".");
  let current: BackendRoute | BackendRoutes | undefined = routes;

  for (const segment of segments) {
    if (!current || isBackendRoute(current)) {
      throw new Error(`Route path "${path}" is not a route group`);
    }
    current = current[segment];
  }

  if (!isBackendRoute(current)) {
    throw new Error(`Route path "${path}" was not found`);
  }

  return current;
};

export interface RequestOptions<TBody = unknown> {
  params?: Record<string, string | number>;
  query?: Record<string, QueryValue>;
  data?: TBody;
  config?: Omit<AxiosRequestConfig, "url" | "method" | "data" | "params">;
}

export const request = async <TResponse, TBody = unknown>(
  route: BackendRoute,
  options: RequestOptions<TBody> = {},
) => {
  const response = await api.request<TResponse>({
    ...(options.config ?? {}),
    url: buildUrl(route.url, options.params, options.query),
    method: route.method,
    data: options.data,
  });

  return response.data;
};

export { routesJson };
