const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_URL = (rawApiUrl || "http://localhost:3001/api/v1").replace(/\/+$/, "");

export function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

type RequestOptions = RequestInit & {
  retryOnUnauthorized?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as { message?: unknown };
      if (Array.isArray(body.message)) {
        return body.message.join(", ");
      }
      if (typeof body.message === "string") {
        return body.message;
      }
    } catch {
      // Fall through to default status message.
    }
  }

  return response.statusText || "Request failed.";
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { retryOnUnauthorized = true, ...requestInit } = options;
  const headers = new Headers(requestInit.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const hasBody = requestInit.body !== undefined && requestInit.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...requestInit,
    headers,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return parseResponse<T>(response);
}