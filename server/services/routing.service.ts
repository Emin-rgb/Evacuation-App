import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roadNodes, shelters } from "@/server/db/schema";
import { haversineM, nearestNode, type LatLng } from "@/server/engine/geo";
import { FULL_PCT, buildPath, pickShelter, shortestPaths } from "@/server/engine/routing";
import { getCitizenRole } from "@/server/services/citizen.service";
import { trafficProvider } from "@/server/providers/traffic.provider";
import type { RouteReason, RouteResult } from "@/lib/types";

const WALK_M_PER_MIN = 80;

export async function findRoute(origin: LatLng, prevShelterId?: string, citizenId?: string): Promise<RouteResult | null> {
  const accessibleOnly = citizenId ? (await getCitizenRole(citizenId)) === "priority" : false;
  const opts = { accessibleOnly };
  const [nodes, edges, active] = await Promise.all([
    db.select().from(roadNodes),
    trafficProvider.getEdges(),
    db.select().from(shelters).where(eq(shelters.isActive, true)),
  ]);
  const start = nearestNode(origin, nodes);
  if (!start) return null;

  const { dist, prev } = shortestPaths(edges, start.id, opts);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const walkIn = haversineM(origin, start);

  const best = pickShelter(active, dist, (s, d) => walkIn + d + haversineM(nodeById.get(s.nodeId)!, s), opts);
  if (!best) return null;

  const s = best.shelter;
  const path = buildPath(prev, start.id, s.nodeId)
    .map((id) => nodeById.get(id)!)
    .map(({ lat, lng }) => ({ lat, lng }));
  const distanceM = Math.round(best.total);

  let reason: RouteReason | null = null;
  if (prevShelterId) {
    if (prevShelterId !== s.id) {
      const old = active.find((x) => x.id === prevShelterId);
      const oldFull = !old || (old.occupancy / old.capacity) * 100 >= FULL_PCT;
      reason = oldFull ? "shelter_full" : "road_closed";
    } else {
      // same shelter: did closures force a detour vs. the all-open graph?
      const open = shortestPaths(edges.map((e) => ({ ...e, status: "open" as const })), start.id, opts);
      const ideal = buildPath(open.prev, start.id, s.nodeId).join();
      if (ideal !== buildPath(prev, start.id, s.nodeId).join()) reason = "road_closed";
    }
  }

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
      isAccessible: s.isAccessible,
    },
    path: [origin, ...path, { lat: s.lat, lng: s.lng }],
    distanceM,
    etaMin: Math.max(1, Math.round(distanceM / WALK_M_PER_MIN)),
    rerouted: reason !== null,
    accessible: accessibleOnly,
    reason,
  };
}
