import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { alerts, rescueTeams, shelters, sosSignals } from "@/server/db/schema";
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

export type ApproveResult = {
  id: string;
  status: "approved";
  team: { id: string; name: string } | null;
  shelter: { id: string; name: string } | null;
  assignedSos: number;
};

export async function approveAlert(id: string): Promise<ApproveResult | "not_found" | "not_open"> {
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
  if (!alert) return "not_found";
  if (alert.status !== "open") return "not_open";

  const [teams, reserves, newSos] = await Promise.all([
    db.select().from(rescueTeams).where(eq(rescueTeams.status, "available")),
    db.select().from(shelters).where(and(eq(shelters.isReserve, true), eq(shelters.isActive, false))),
    alert.kind === "sos_cluster"
      ? db
          .select({ id: sosSignals.id })
          .from(sosSignals)
          .where(and(eq(sosSignals.zoneId, alert.zoneId), eq(sosSignals.status, "new")))
      : Promise.resolve([]),
  ]);
  const team = teams.find((t) => t.zoneId === alert.zoneId) ?? teams[0] ?? null;
  const shelter = reserves.find((s) => s.zoneId === alert.zoneId) ?? reserves[0] ?? null;

  // db.batch is a single atomic transaction on neon-http.
  const ops = [
    db.update(alerts).set({ status: "approved" }).where(eq(alerts.id, id)),
    ...(team ? [db.update(rescueTeams).set({ status: "en_route", alertId: id }).where(eq(rescueTeams.id, team.id))] : []),
    ...(shelter ? [db.update(shelters).set({ isActive: true }).where(eq(shelters.id, shelter.id))] : []),
    ...(newSos.length > 0
      ? [
          db
            .update(sosSignals)
            .set({ status: "assigned" })
            .where(inArray(sosSignals.id, newSos.map((s) => s.id))),
        ]
      : []),
  ];
  await db.batch(ops as [(typeof ops)[0], ...(typeof ops)[number][]]);

  return {
    id,
    status: "approved",
    team: team ? { id: team.id, name: team.name } : null,
    shelter: shelter ? { id: shelter.id, name: shelter.name } : null,
    assignedSos: newSos.length,
  };
}

export async function dismissAlert(id: string): Promise<{ id: string; status: "dismissed" } | "not_found" | "not_open"> {
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
  if (!alert) return "not_found";
  if (alert.status !== "open") return "not_open";
  await db.update(alerts).set({ status: "dismissed" }).where(eq(alerts.id, id));
  return { id, status: "dismissed" };
}
