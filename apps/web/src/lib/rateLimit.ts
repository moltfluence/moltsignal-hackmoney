type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

// Best-effort, in-memory limiter. In serverless this is per-instance.
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAtMs) {
    buckets.set(key, { count: 1, resetAtMs: now + opts.windowMs });
    return { ok: true };
  }

  if (bucket.count >= opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { ok: true };
}

