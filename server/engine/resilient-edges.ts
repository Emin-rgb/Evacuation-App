import { CircuitBreaker, type BreakerState, withTimeout } from "@/server/engine/circuit-breaker";
import type { GraphEdge } from "@/server/engine/routing";

export type EdgeSource = "live" | "cache" | "static";
export type EdgesResult = { edges: GraphEdge[]; source: EdgeSource };
export type ProviderHealth = {
  state: BreakerState;
  source: EdgeSource;
  failures: number;
  lastError: string | null;
  lastOkAt: number | null;
};

export type ResilientOptions = {
  primary: () => Promise<GraphEdge[]>;
  /** last resort, must not fail and must not depend on the primary */
  fallback: () => GraphEdge[];
  breaker?: CircuitBreaker;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
};

/** live (breaker + timeout) → last good snapshot (TTL) → static graph. `get()` never throws. */
export class ResilientEdges {
  private snapshot: { edges: GraphEdge[]; at: number } | null = null;
  private lastSource: EdgeSource = "live";
  private lastError: string | null = null;
  private lastOkAt: number | null = null;
  private totalFailures = 0;
  readonly breaker: CircuitBreaker;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly now: () => number;

  constructor(private readonly opts: ResilientOptions) {
    this.now = opts.now ?? Date.now;
    this.breaker = opts.breaker ?? new CircuitBreaker({ now: this.now });
    this.timeoutMs = opts.timeoutMs ?? 5000;
    this.cacheTtlMs = opts.cacheTtlMs ?? 10 * 60_000;
  }

  async get(): Promise<EdgesResult> {
    try {
      const edges = await this.breaker.exec(() => withTimeout(this.opts.primary, this.timeoutMs));
      this.snapshot = { edges, at: this.now() };
      this.lastOkAt = this.now();
      this.lastError = null;
      this.lastSource = "live";
      return { edges, source: "live" };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.totalFailures += 1;
      if (this.snapshot && this.now() - this.snapshot.at <= this.cacheTtlMs) {
        this.lastSource = "cache";
        return { edges: this.snapshot.edges, source: "cache" };
      }
      this.lastSource = "static";
      return { edges: this.opts.fallback(), source: "static" };
    }
  }

  health(): ProviderHealth {
    return {
      state: this.breaker.state,
      source: this.lastSource,
      failures: this.totalFailures,
      lastError: this.lastError,
      lastOkAt: this.lastOkAt,
    };
  }
}
