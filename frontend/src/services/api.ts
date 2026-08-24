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
  code?: string;
  email?: string;
  responseBody?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    email?: string,
    responseBody?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.email = email;
    this.responseBody = responseBody;
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

async function readErrorDetails(response: Response): Promise<{
  message: string;
  code?: string;
  email?: string;
  body?: unknown;
}> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as {
        message?: unknown;
        code?: string;
        email?: string;
        statusCode?: number;
      };
      let message = response.statusText || "Request failed.";
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (typeof body.message === "string") {
        message = body.message;
      }
      return {
        message,
        code: typeof body.code === "string" ? body.code : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        body,
      };
    } catch {
      // Fall through to default status message.
    }
  }

  return {
    message: response.statusText || "Request failed.",
  };
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
    const details = await readErrorDetails(response);
    throw new ApiError(
      details.message,
      response.status,
      details.code,
      details.email,
      details.body,
    );
  }

  return parseResponse<T>(response);
}