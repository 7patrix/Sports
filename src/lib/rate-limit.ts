import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Minimal fixed-window rate limiter.
 *
 * NOTE: in-memory and per-instance - fine for a single Railway instance and to
 * demonstrate abuse protection. A multi-instance production deployment should
 * back this with Redis (the same Redis already used for the queue).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Enforce a rate limit for a request. Returns a 429 NextResponse when exceeded,
 * or null when the request may proceed.
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  options: { limit: number; windowMs: number }
): NextResponse | null {
  // Disabled under test so the shared-process integration suite is deterministic;
  // the limiter itself is covered by a dedicated unit test.
  if (process.env.NODE_ENV === "test" || process.env.RATE_LIMIT_DISABLED === "1") return null;

  const key = `${scope}:${clientIp(request)}`;
  const result = checkRateLimit(key, options.limit, options.windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests", retryAfterSec: result.retryAfterSec },
    { status: 429, headers: { "retry-after": String(result.retryAfterSec) } }
  );
}
