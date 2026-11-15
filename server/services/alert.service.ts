import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { alerts, shelters, sosSignals } from "@/server/db/schema";
import { detectAlerts } from "@/server/engine/crisis";

export async function runDetection() {
  const [sos, shelterRows, open] = await Promise.all([
    db.select().from(sosSignals),
    db.select().from(shelters),
    db.select().from(alerts).where(eq(alerts.status, "open")),
  ]);
  const found = detectAlerts({
    sos,
    shelters: shelterRows,
    openAlerts: open.map((a) => ({ kind: a.kind, zoneId: a.zoneId, shelterId: a.shelterId })),
  });
  if (found.length > 0) await db.insert(alerts).values(found);
  return found.length;
}
