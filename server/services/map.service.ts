import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roadEdges, roadNodes, shelters } from "@/server/db/schema";
import type { MapData } from "@/lib/types";

export async function getMapData(): Promise<MapData> {
  const [nodes, edges, activeShelters] = await Promise.all([
    db.select().from(roadNodes),
    db.select().from(roadEdges),
    db.select().from(shelters).where(eq(shelters.isActive, true)),
  ]);
  return {
    nodes: nodes.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })),
    edges: edges.map(({ id, fromNodeId, toNodeId, name, status }) => ({
      id,
      fromNodeId,
      toNodeId,
      name,
      status,
    })),
    shelters: activeShelters.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      lat: s.lat,
      lng: s.lng,
      isAccessible: s.isAccessible,
      capacity: s.capacity,
      occupancy: s.occupancy,
      occupancyPct: Math.round((s.occupancy / s.capacity) * 100),
    })),
  };
}
