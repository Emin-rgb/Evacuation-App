export type GraphEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  status: "open" | "closed";
};

export type ShortestPaths = {
  dist: Map<string, number>;
  prev: Map<string, string>;
};

/** Dijkstra over open edges only (roads are two-way). */
export function shortestPaths(edges: GraphEdge[], startNodeId: string): ShortestPaths {
  const adj = new Map<string, { to: string; w: number }[]>();
  for (const e of edges) {
    if (e.status !== "open") continue;
    if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, []);
    if (!adj.has(e.toNodeId)) adj.set(e.toNodeId, []);
    adj.get(e.fromNodeId)!.push({ to: e.toNodeId, w: e.lengthM });
    adj.get(e.toNodeId)!.push({ to: e.fromNodeId, w: e.lengthM });
  }

  const dist = new Map<string, number>([[startNodeId, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();

  for (;;) {
    let u: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!done.has(id) && d < best) {
        u = id;
        best = d;
      }
    }
    if (u === null) break;
    done.add(u);
    for (const { to, w } of adj.get(u) ?? []) {
      const nd = best + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, u);
      }
    }
  }
  return { dist, prev };
}

export function buildPath(prev: Map<string, string>, startNodeId: string, endNodeId: string): string[] {
  const path = [endNodeId];
  let cur = endNodeId;
  while (cur !== startNodeId) {
    const p = prev.get(cur);
    if (!p) return [];
    path.push(p);
    cur = p;
  }
  return path.reverse();
}
