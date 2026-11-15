import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roadNodes, shelters } from "@/server/db/schema";
import { haversineM, nearestNode, type LatLng } from "@/server/engine/geo";
import { FULL_PCT, buildPath, buildSteps, pickShelter, shortestPaths } from "@/server/engine/routing";
import { getCitizenRole } from "@/server/services/citizen.service";
import { trafficProvider } from "@/server/providers/traffic.provider";
import type { RouteReason, RouteResult } from "@/lib/types";

const WALK_M_PER_MIN = 80;

export type RouteRequest = { prevShelterId?: string; citizenId?: string; targetShelterId?: string };

export async function findRoute(origin: LatLng, req: RouteRequest = {}): Promise<RouteResult | null> {
  const { prevShelterId, citizenId, targetShelterId } = req;
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

  const cost = (s: (typeof active)[number], d: number) => walkIn + d + haversineM(nodeById.get(s.nodeId)!, s);
  // a chosen destination wins if it is usable (active, <90%, reachable, accessible when needed); otherwise recommend
  const chosen = targetShelterId ? pickShelter(active.filter((x) => x.id === targetShelterId), dist, cost, opts) : null;
  const best = chosen ?? pickShelter(active, dist, cost, opts);
  if (!best) return null;

  const s = best.shelter;
  const pathIds = buildPath(prev, start.id, s.nodeId);
  const path = pathIds
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
    steps: buildSteps(pathIds, edges),
    rerouted: reason !== null,
    accessible: accessibleOnly,
    reason,
  };
}
