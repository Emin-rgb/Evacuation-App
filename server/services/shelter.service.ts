import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shelters } from "@/server/db/schema";
import { haversineM, type LatLng } from "@/server/engine/geo";
import type { NearestShelter } from "@/lib/types";

export async function findNearestShelters(origin: LatLng): Promise<NearestShelter[]> {
  const rows = await db.select().from(shelters).where(eq(shelters.isActive, true));
  return rows
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      lat: s.lat,
      lng: s.lng,
      isAccessible: s.isAccessible,
      capacity: s.capacity,
      occupancy: s.occupancy,
      occupancyPct: Math.round((s.occupancy / s.capacity) * 100),
      distanceM: Math.round(haversineM(origin, s)),
    }))
    .sort((a, b) => a.distanceM - b.distanceM);
}
