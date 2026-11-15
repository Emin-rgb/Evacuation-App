export type RateResult = { ok: boolean; retryAfterMs: number };

const MAX_KEYS = 10_000;

/** Fixed-window limiter, in memory (per server instance). Clock is injectable for tests. */
export class RateLimiter {
  private hits = new Map<string, { start: number; count: number }>();

  constructor(private now: () => number = Date.now) {}

  allow(key: string, limit: number, windowMs: number): RateResult {
    const t = this.now();
    if (this.hits.size > MAX_KEYS) this.sweep(t, windowMs);
    const h = this.hits.get(key);
    if (!h || t - h.start >= windowMs) {
      this.hits.set(key, { start: t, count: 1 });
      return { ok: true, retryAfterMs: 0 };
    }
    if (h.count >= limit) return { ok: false, retryAfterMs: h.start + windowMs - t };
    h.count += 1;
    return { ok: true, retryAfterMs: 0 };
  }

  // A flood with random keys must not grow memory without bound.
  private sweep(t: number, windowMs: number) {
    for (const [k, h] of this.hits) if (t - h.start >= windowMs) this.hits.delete(k);
    if (this.hits.size > MAX_KEYS) this.hits.clear();
  }
}
