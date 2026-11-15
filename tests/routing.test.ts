import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPath, buildSteps, pickShelter, shortestPaths, type GraphEdge } from "@/server/engine/routing";

const edge = (id: string, a: string, b: string, lengthM: number, status: "open" | "closed" = "open"): GraphEdge => ({
  id,
  fromNodeId: a,
  toNodeId: b,
  lengthM,
  status,
});

test("Dijkstra avoids a closed edge", () => {
  const open = [edge("1", "A", "B", 100), edge("2", "B", "C", 100), edge("3", "A", "C", 500)];
  assert.deepEqual(buildPath(shortestPaths(open, "A").prev, "A", "C"), ["A", "B", "C"]);

  const closed = [edge("1", "A", "B", 100), edge("2", "B", "C", 100, "closed"), edge("3", "A", "C", 500)];
  const { dist, prev } = shortestPaths(closed, "A");
  assert.deepEqual(buildPath(prev, "A", "C"), ["A", "C"]);
  assert.equal(dist.get("C"), 500);
});

test("Dijkstra returns no path when the only road is closed", () => {
  const { dist, prev } = shortestPaths([edge("1", "A", "B", 100, "closed")], "A");
  assert.equal(dist.has("B"), false);
  assert.deepEqual(buildPath(prev, "A", "B"), []);
});

test("route skips a shelter at or above 90%", () => {
  const dist = new Map([["N1", 100], ["N2", 400]]);
  const near = { id: "near", nodeId: "N1", capacity: 100, occupancy: 90 };
  const far = { id: "far", nodeId: "N2", capacity: 100, occupancy: 50 };
  const cost = (_s: unknown, d: number) => d;

  assert.equal(pickShelter([near, far], dist, cost)?.shelter.id, "far");
  assert.equal(pickShelter([{ ...near, occupancy: 89 }, far], dist, cost)?.shelter.id, "near");
  assert.equal(pickShelter([near], dist, cost), null);
});

test("Dijkstra treats roads as two-way", () => {
  const { prev } = shortestPaths([edge("1", "A", "B", 100)], "B");
  assert.deepEqual(buildPath(prev, "B", "A"), ["B", "A"]);
});

test("Dijkstra picks the shortest of several routes", () => {
  const edges = [edge("1", "A", "B", 300), edge("2", "B", "D", 300), edge("3", "A", "C", 100), edge("4", "C", "D", 150)];
  const { dist, prev } = shortestPaths(edges, "A");
  assert.equal(dist.get("D"), 250);
  assert.deepEqual(buildPath(prev, "A", "D"), ["A", "C", "D"]);
});

test("Dijkstra start node has distance 0 and path to itself", () => {
  const { dist, prev } = shortestPaths([edge("1", "A", "B", 10)], "A");
  assert.equal(dist.get("A"), 0);
  assert.deepEqual(buildPath(prev, "A", "A"), ["A"]);
});

test("Dijkstra reroutes when a previously used edge closes", () => {
  const mk = (s: "open" | "closed") => [edge("1", "A", "B", 100, s), edge("2", "B", "C", 100), edge("3", "A", "D", 200), edge("4", "D", "C", 200)];
  assert.deepEqual(buildPath(shortestPaths(mk("open"), "A").prev, "A", "C"), ["A", "B", "C"]);
  assert.deepEqual(buildPath(shortestPaths(mk("closed"), "A").prev, "A", "C"), ["A", "D", "C"]);
});

test("pickShelter picks the lowest cost, not the first", () => {
  const dist = new Map([["N1", 900], ["N2", 200]]);
  const a = { id: "a", nodeId: "N1", capacity: 100, occupancy: 10 };
  const b = { id: "b", nodeId: "N2", capacity: 100, occupancy: 10 };
  assert.equal(pickShelter([a, b], dist, (_s, d) => d)?.shelter.id, "b");
});

test("pickShelter skips unreachable shelters", () => {
  const dist = new Map([["N1", 100]]);
  const a = { id: "a", nodeId: "N1", capacity: 100, occupancy: 10 };
  const b = { id: "b", nodeId: "N9", capacity: 100, occupancy: 0 };
  assert.equal(pickShelter([b], dist, (_s, d) => d), null);
  assert.equal(pickShelter([b, a], dist, (_s, d) => d)?.shelter.id, "a");
});

test("pickShelter returns null for no candidates", () => {
  assert.equal(pickShelter([], new Map(), (_s, d) => d), null);
});

test("accessibleOnly skips inaccessible edges; default behaviour is unchanged", () => {
  const edges: GraphEdge[] = [
    { ...edge("1", "A", "B", 100), isAccessible: false },
    edge("2", "B", "C", 100),
    edge("3", "A", "C", 500),
  ];
  assert.deepEqual(buildPath(shortestPaths(edges, "A").prev, "A", "C"), ["A", "B", "C"]);
  assert.deepEqual(buildPath(shortestPaths(edges, "A", { accessibleOnly: true }).prev, "A", "C"), ["A", "C"]);
});

test("accessibleOnly route never picks an inaccessible shelter", () => {
  const dist = new Map([["N1", 100], ["N2", 400]]);
  const shelters = [
    { id: "near", nodeId: "N1", capacity: 100, occupancy: 10, isAccessible: false },
    { id: "far", nodeId: "N2", capacity: 100, occupancy: 10, isAccessible: true },
  ];
  const cost = (_s: unknown, d: number) => d;
  assert.equal(pickShelter(shelters, dist, cost)?.shelter.id, "near");
  assert.equal(pickShelter(shelters, dist, cost, { accessibleOnly: true })?.shelter.id, "far");
});

test("buildSteps merges consecutive segments on the same street", () => {
  const e = (id: string, a: string, b: string, len: number, name: string): GraphEdge => ({ ...edge(id, a, b, len), name });
  const edges = [e("1", "A", "B", 100, "Main"), e("2", "B", "C", 50, "Main"), e("3", "C", "D", 70, "Side")];
  assert.deepEqual(buildSteps(["A", "B", "C", "D"], edges), [
    { name: "Main", distanceM: 150 },
    { name: "Side", distanceM: 70 },
  ]);
  assert.deepEqual(buildSteps(["D", "C"], edges), [{ name: "Side", distanceM: 70 }]);
});
