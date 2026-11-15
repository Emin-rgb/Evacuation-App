export type BreakerState = "closed" | "open" | "half_open";

export class CircuitOpenError extends Error {
  constructor() {
    super("Circuit open");
    this.name = "CircuitOpenError";
  }
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

/** Rejects with TimeoutError when `fn` does not settle within `ms`. */
export function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    fn().then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export type BreakerOptions = { failureThreshold?: number; cooldownMs?: number; now?: () => number };

/**
 * closed → (N consecutive failures) → open → (cooldown) → half_open → one probe:
 * success → closed, failure → open again. Pure: no I/O, injectable clock.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private probing = false;
  private readonly threshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(opts: BreakerOptions = {}) {
    this.threshold = opts.failureThreshold ?? 2;
    this.cooldownMs = opts.cooldownMs ?? 15_000;
    this.now = opts.now ?? Date.now;
  }

  get state(): BreakerState {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt >= this.cooldownMs ? "half_open" : "open";
  }

  get consecutiveFailures() {
    return this.failures;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.state;
    if (state === "open" || (state === "half_open" && this.probing)) throw new CircuitOpenError();
    if (state === "half_open") this.probing = true;
    try {
      const result = await fn();
      this.failures = 0;
      this.openedAt = null;
      return result;
    } catch (err) {
      this.failures += 1;
      if (state === "half_open" || this.failures >= this.threshold) this.openedAt = this.now();
      throw err;
    } finally {
      if (state === "half_open") this.probing = false;
    }
  }
}
