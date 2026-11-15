import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { citizens, zones } from "@/server/db/schema";
import { nearestNode } from "@/server/engine/geo";

export async function nearestZoneId(point: { lat: number; lng: number }) {
  const all = await db.select().from(zones);
  const z = nearestNode(point, all.map((x) => ({ id: x.id, lat: x.centerLat, lng: x.centerLng })));
  return z?.id ?? null;
}

export async function createCitizen(input: { lat?: number; lng?: number }) {
  const point = input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : null;
  const zoneId = point ? await nearestZoneId(point) : null;
  const [row] = await db
    .insert(citizens)
    .values({ zoneId, lat: point?.lat ?? null, lng: point?.lng ?? null })
    .returning({ id: citizens.id, status: citizens.status });
  return row;
}

export async function markSafe(id: string) {
  const [row] = await db
    .update(citizens)
    .set({ status: "safe" })
    .where(eq(citizens.id, id))
    .returning({ id: citizens.id, status: citizens.status });
  return row ?? null;
}
