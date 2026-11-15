import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { citizens, sosSignals } from "@/server/db/schema";
import { nearestZoneId } from "@/server/services/citizen.service";
import { isDuplicateSos } from "@/server/engine/sos-guard";
import type { SosType } from "@/lib/types";

export async function createSos(input: { citizenId: string; type: SosType; lat: number; lng: number }) {
  // Round trip 1 (parallel): citizen + recent SOS of that citizen (duplicate filter) + zone.
  const [[citizen], recent, zoneId] = await Promise.all([
    db.select({ id: citizens.id, role: citizens.role }).from(citizens).where(eq(citizens.id, input.citizenId)),
    db
      .select({ id: sosSignals.id, type: sosSignals.type, status: sosSignals.status, priority: sosSignals.priority, createdAt: sosSignals.createdAt })
      .from(sosSignals)
      .where(eq(sosSignals.citizenId, input.citizenId))
      .orderBy(desc(sosSignals.createdAt))
      .limit(3),
    nearestZoneId(input),
  ]);
  if (!citizen) return null;
  // Duplicate filter: same citizen, earlier unresolved SOS still fresh → return it, insert nothing.
  const existing = recent.find((s) => isDuplicateSos([s]));
  if (existing) return { id: existing.id, type: existing.type, status: existing.status, priority: existing.priority, duplicate: true as const };
  if (!zoneId) throw new Error("No zones");
  // Round trip 2 (parallel): insert signal + mark citizen.
  const [[row]] = await Promise.all([
    db
      .insert(sosSignals)
      .values({
        citizenId: input.citizenId,
        zoneId,
        type: input.type,
        lat: input.lat,
        lng: input.lng,
        priority: citizen.role === "priority" ? 1 : 0,
      })
      .returning({ id: sosSignals.id, type: sosSignals.type, status: sosSignals.status, priority: sosSignals.priority }),
    db.update(citizens).set({ status: "sos", lat: input.lat, lng: input.lng, zoneId }).where(eq(citizens.id, input.citizenId)),
  ]);
  // Red Alert detection is scheduled by the route after the response is sent.
  return { ...row, duplicate: false as const };
}
