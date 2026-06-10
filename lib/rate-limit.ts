import { NextRequest } from "next/server";

// Lightweight fixed-window rate limiter.
//
// NOTE: state is in-memory, so limits are per server instance. That's fine for
// a single Node process; on multi-instance/serverless deployments move this to
// Redis/Upstash for a shared counter. It still meaningfully slows brute-force
// and abuse on any single instance.
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  b.count++;
  const retryAfter = Math.ceil((b.reset - now) / 1000);
  if (b.count > limit) return { ok: false, remaining: 0, retryAfter };
  return { ok: true, remaining: limit - b.count, retryAfter };
}

// Best-effort client IP from common proxy headers (Vercel/Cloudflare/nginx).
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
