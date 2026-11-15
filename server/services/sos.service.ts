import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { citizens, sosSignals } from "@/server/db/schema";
import { nearestZoneId } from "@/server/services/citizen.service";
import { runDetection } from "@/server/services/alert.service";
import type { SosType } from "@/lib/types";

export async function createSos(input: { citizenId: string; type: SosType; lat: number; lng: number }) {
  const [citizen] = await db.select({ id: citizens.id, role: citizens.role }).from(citizens).where(eq(citizens.id, input.citizenId));
  if (!citizen) return null;
  const zoneId = await nearestZoneId(input);
  if (!zoneId) throw new Error("No zones");
  const [row] = await db
    .insert(sosSignals)
    .values({
      citizenId: input.citizenId,
      zoneId,
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      priority: citizen.role === "priority" ? 1 : 0,
    })
    .returning({ id: sosSignals.id, type: sosSignals.type, status: sosSignals.status, priority: sosSignals.priority });
  await db.update(citizens).set({ status: "sos", lat: input.lat, lng: input.lng, zoneId }).where(eq(citizens.id, input.citizenId));
  await runDetection();
  return row;
}
