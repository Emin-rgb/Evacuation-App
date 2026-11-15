import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { citizens, zones } from "@/server/db/schema";
import { nearestNode } from "@/server/engine/geo";
import type { CitizenRole } from "@/lib/types";

export async function nearestZoneId(point: { lat: number; lng: number }) {
  const all = await db.select().from(zones);
  const z = nearestNode(point, all.map((x) => ({ id: x.id, lat: x.centerLat, lng: x.centerLng })));
  return z?.id ?? null;
}

export async function createCitizen(input: { lat?: number; lng?: number; role?: CitizenRole }) {
  const point = input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : null;
  const zoneId = point ? await nearestZoneId(point) : null;
  const [row] = await db
    .insert(citizens)
    .values({ zoneId, lat: point?.lat ?? null, lng: point?.lng ?? null, role: input.role ?? "standard" })
    .returning({ id: citizens.id, status: citizens.status, role: citizens.role });
  return row;
}

export async function updateCitizen(id: string, patch: { status?: "safe"; role?: CitizenRole }) {
  const [row] = await db
    .update(citizens)
    .set(patch)
    .where(eq(citizens.id, id))
    .returning({ id: citizens.id, status: citizens.status, role: citizens.role });
  return row ?? null;
}

export async function getCitizenRole(id: string): Promise<CitizenRole> {
  const [row] = await db.select({ role: citizens.role }).from(citizens).where(eq(citizens.id, id));
  return row?.role ?? "standard";
}
