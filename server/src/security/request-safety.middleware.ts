import type { NextFunction, Request, Response } from "express";

function getTrustedOrigins(): string[] {
  const defaults = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];

  const envFrontend = process.env.FRONTEND_URL?.trim();
  if (envFrontend) {
    defaults.push(envFrontend);
  }

  const envOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (envOrigins && envOrigins.length > 0) {
    defaults.push(...envOrigins);
  }

  return Array.from(new Set(defaults));
}

const RATE_LIMITS = {
  register: { limit: 5, windowMs: 15 * 60 * 1000 },
  login: { limit: 10, windowMs: 5 * 60 * 1000 },
  refresh: { limit: 30, windowMs: 5 * 60 * 1000 },
} as const;

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

function buildBucketKey(request: Request, routeName: string) {
  const forwarded = request.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return `${routeName}:${forwardedIp ?? request.ip ?? request.socket.remoteAddress ?? "unknown"}`;
}

function isUnsafeMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function getRouteName(request: Request): keyof typeof RATE_LIMITS | null {
  if (request.method !== "POST") return null;
  if (request.path === "/api/v1/auth/register") return "register";
  if (request.path === "/api/v1/auth/login") return "login";
  if (request.path === "/api/v1/auth/refresh") return "refresh";
  return null;
}

function validateOrigin(request: Request, response: Response, next: NextFunction) {
  if (!isUnsafeMethod(request.method) || request.path.startsWith("/api/docs")) {
    return next();
  }

  const origin = request.headers.origin;
  const trustedOrigins = getTrustedOrigins();
  if (!origin || !trustedOrigins.includes(origin)) {
    return response.status(403).json({ statusCode: 403, message: "Forbidden" });
  }

  return next();
}

function applyRateLimit(request: Request, response: Response, next: NextFunction) {
  const routeName = getRouteName(request);
  if (!routeName) {
    return next();
  }

  const { limit, windowMs } = RATE_LIMITS[routeName];
  const now = Date.now();
  const bucketKey = buildBucketKey(request, routeName);
  const bucket = buckets.get(bucketKey) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs);
  bucket.timestamps.push(now);
  buckets.set(bucketKey, bucket);

  const staleThreshold = now - Math.max(windowMs, 15 * 60 * 1000);
  for (const [key, value] of buckets.entries()) {
    value.timestamps = value.timestamps.filter((timestamp) => timestamp >= staleThreshold);
    if (value.timestamps.length === 0) {
      buckets.delete(key);
    }
  }

  if (bucket.timestamps.length > limit) {
    return response.status(429).json({ statusCode: 429, message: "Too many requests" });
  }

  return next();
}

export function requestSafetyMiddleware(request: Request, response: Response, next: NextFunction) {
  validateOrigin(request, response, (originError?: unknown) => {
    if (originError) return next(originError as Error);
    return applyRateLimit(request, response, next);
  });
}