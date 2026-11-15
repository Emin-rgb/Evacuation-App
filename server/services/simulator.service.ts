import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roadEdges, shelters } from "@/server/db/schema";
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
  return row ? { ...row, occupancyPct: Math.round((row.occupancy / row.capacity) * 100) } : null;
}
