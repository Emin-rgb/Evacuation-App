import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { citizens, roadEdges, shelters, sosSignals } from "@/server/db/schema";
import { runDetection } from "@/server/services/alert.service";
import { nearestZoneId } from "@/server/services/citizen.service";
import type { RoadStatus } from "@/lib/types";

export async function setRoadStatus(id: string, status: RoadStatus) {
  const [row] = await db
    .update(roadEdges)
    .set({ status })
    .where(eq(roadEdges.id, id))
    .returning({ id: roadEdges.id, name: roadEdges.name, status: roadEdges.status });
  return row ?? null;
}

export async function setShelterOccupancy(id: string, occupancy: number) {
  const [current] = await db.select({ capacity: shelters.capacity }).from(shelters).where(eq(shelters.id, id));
  if (!current) return null;
  const clamped = Math.min(occupancy, current.capacity);
  const [row] = await db
    .update(shelters)
    .set({ occupancy: clamped })
    .where(eq(shelters.id, id))
    .returning({ id: shelters.id, name: shelters.name, occupancy: shelters.occupancy, capacity: shelters.capacity });
  await runDetection();
  return row ? { ...row, occupancyPct: Math.round((row.occupancy / row.capacity) * 100) } : null;
}

const SOS_TYPES = ["fire", "collapse", "flood", "medical"] as const;

export async function createSosBurst(input: { lat: number; lng: number; count: number }) {
  const zoneId = await nearestZoneId(input);
  if (!zoneId) throw new Error("No zones");
  // ~±100 m jitter so signals form one cluster but are distinct points
  const points = Array.from({ length: input.count }, (_, i) => ({
    lat: input.lat + (Math.random() - 0.5) * 0.0018,
    lng: input.lng + (Math.random() - 0.5) * 0.0018,
    type: SOS_TYPES[i % SOS_TYPES.length],
  }));
  const newCitizens = await db
    .insert(citizens)
    .values(points.map((p) => ({ zoneId, lat: p.lat, lng: p.lng, status: "sos" as const })))
    .returning({ id: citizens.id });
  await db
    .insert(sosSignals)
    .values(points.map((p, i) => ({ citizenId: newCitizens[i].id, zoneId, type: p.type, lat: p.lat, lng: p.lng })));
  const alertsCreated = await runDetection();
  return { created: points.length, alertsCreated };
}
