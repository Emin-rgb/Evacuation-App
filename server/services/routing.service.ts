import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roadNodes, shelters } from "@/server/db/schema";
import { haversineM, nearestNode, type LatLng } from "@/server/engine/geo";
import { buildPath, shortestPaths } from "@/server/engine/routing";
import { trafficProvider } from "@/server/providers/traffic.provider";
import type { RouteResult } from "@/lib/types";

const FULL_PCT = 90;
const WALK_M_PER_MIN = 80;

export async function findRoute(origin: LatLng): Promise<RouteResult | null> {
  const [nodes, edges, active] = await Promise.all([
    db.select().from(roadNodes),
    trafficProvider.getEdges(),
    db.select().from(shelters).where(eq(shelters.isActive, true)),
  ]);
  const start = nearestNode(origin, nodes);
  if (!start) return null;

  const { dist, prev } = shortestPaths(edges, start.id);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const walkIn = haversineM(origin, start);

  let best: { shelter: (typeof active)[number]; total: number } | null = null;
  for (const s of active) {
    if ((s.occupancy / s.capacity) * 100 >= FULL_PCT) continue;
    const d = dist.get(s.nodeId);
    if (d === undefined) continue;
    const total = walkIn + d + haversineM(nodeById.get(s.nodeId)!, s);
    if (!best || total < best.total) best = { shelter: s, total };
  }
  if (!best) return null;

  const s = best.shelter;
  const path = buildPath(prev, start.id, s.nodeId)
    .map((id) => nodeById.get(id)!)
    .map(({ lat, lng }) => ({ lat, lng }));
  const distanceM = Math.round(best.total);

  return {
    shelter: {
      id: s.id,
      name: s.name,
      type: s.type,
      lat: s.lat,
      lng: s.lng,
      capacity: s.capacity,
      occupancy: s.occupancy,
      occupancyPct: Math.round((s.occupancy / s.capacity) * 100),
    },
    path: [origin, ...path, { lat: s.lat, lng: s.lng }],
    distanceM,
    etaMin: Math.max(1, Math.round(distanceM / WALK_M_PER_MIN)),
    rerouted: false,
    reason: null,
  };
}
