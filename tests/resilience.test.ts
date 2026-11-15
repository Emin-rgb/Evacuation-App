import { test } from "node:test";
import assert from "node:assert/strict";
import { CircuitBreaker, CircuitOpenError, TimeoutError, withTimeout } from "@/server/engine/circuit-breaker";
import { ResilientEdges } from "@/server/engine/resilient-edges";
import { buildPath, shortestPaths, type GraphEdge } from "@/server/engine/routing";
import { EDGES, INACCESSIBLE_EDGES, NODES, haversineM } from "@/server/data/fallback-graph";

const fail = () => Promise.reject(new Error("503"));
const ok = () => Promise.resolve("ok");
const live: GraphEdge[] = [{ id: "L", fromNodeId: "A", toNodeId: "B", lengthM: 1, status: "closed" }];
const stat: GraphEdge[] = [{ id: "S", fromNodeId: "A", toNodeId: "B", lengthM: 1, status: "open" }];

test("breaker opens after N failures, probes after cooldown, closes on success", async () => {
  let t = 0;
  const b = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, now: () => t });
  await assert.rejects(b.exec(fail));
  assert.equal(b.state, "closed");
  await assert.rejects(b.exec(fail));
  assert.equal(b.state, "open");
  await assert.rejects(b.exec(ok), CircuitOpenError); // fast-fail, fn not called
  t = 1000;
  assert.equal(b.state, "half_open");
  assert.equal(await b.exec(ok), "ok");
  assert.equal(b.state, "closed");
});

test("failed half-open probe re-opens the breaker", async () => {
  let t = 0;
  const b = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => t });
  await assert.rejects(b.exec(fail));
  t = 1000;
  await assert.rejects(b.exec(fail));
  assert.equal(b.state, "open");
});

test("withTimeout rejects a slow call", async () => {
  await assert.rejects(withTimeout(() => new Promise((r) => setTimeout(r, 200)), 20), TimeoutError);
  assert.equal(await withTimeout(ok, 50), "ok");
});

test("provider falls back to static on 503, never throws", async () => {
  const r = new ResilientEdges({ primary: () => Promise.reject(new Error("503")), fallback: () => stat });
  const res = await r.get();
  assert.equal(res.source, "static");
  assert.equal(res.edges, stat);
  assert.equal(r.health().lastError, "503");
});

test("provider falls back when the API is slower than the timeout", async () => {
  const r = new ResilientEdges({
    primary: () => new Promise((res) => setTimeout(() => res(live), 200)),
    fallback: () => stat,
    timeoutMs: 20,
  });
  assert.equal((await r.get()).source, "static");
});

test("last good snapshot (with closures) is used before the static graph, until the TTL", async () => {
  let t = 0;
  let down = false;
  const r = new ResilientEdges({
    primary: () => (down ? fail() : Promise.resolve(live)),
    fallback: () => stat,
    cacheTtlMs: 1000,
    now: () => t,
  });
  assert.equal((await r.get()).source, "live");
  down = true;
  const cached = await r.get();
  assert.equal(cached.source, "cache");
  assert.equal(cached.edges[0].status, "closed");
  t = 2000;
  assert.equal((await r.get()).source, "static");
});

test("provider recovers to live after the cooldown", async () => {
  let t = 0;
  let down = true;
  const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => t });
  const r = new ResilientEdges({ primary: () => (down ? fail() : Promise.resolve(live)), fallback: () => stat, breaker, now: () => t });
  assert.equal((await r.get()).source, "static");
  down = false;
  assert.equal((await r.get()).source, "static"); // breaker still open
  t = 1000;
  assert.equal((await r.get()).source, "live");
  assert.equal(r.health().state, "closed");
});

test("static fallback graph keeps accessible-only routing working", () => {
  const edges: GraphEdge[] = EDGES.map(([a, b, name]) => ({
    id: `${a}-${b}`,
    fromNodeId: a,
    toNodeId: b,
    lengthM: haversineM([NODES[a][1], NODES[a][2]], [NODES[b][1], NODES[b][2]]),
    status: "open",
    isAccessible: !INACCESSIBLE_EDGES.has(`${a}-${b}`),
    name,
  }));
  const { prev, dist } = shortestPaths(edges, "n2", { accessibleOnly: true });
  const path = buildPath(prev, "n2", "n16");
  assert.ok(path.length > 1 && dist.has("n16"));
  for (let i = 0; i + 1 < path.length; i++) {
    const e = edges.find((x) => [x.fromNodeId, x.toNodeId].sort().join() === [path[i], path[i + 1]].sort().join())!;
    assert.equal(e.isAccessible, true);
  }
});
