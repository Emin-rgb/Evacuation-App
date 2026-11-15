import { desc, eq, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { alerts, citizens, rescueTeams, roadEdges, shelters, sosSignals, zones } from "@/server/db/schema";
import type { DashboardData } from "@/lib/types";

const SOS_WINDOW_MS = 60 * 60 * 1000;
const CRITICAL_PCT = 90;

export async function getDashboard(): Promise<DashboardData> {
  const since = new Date(Date.now() - SOS_WINDOW_MS);
  const [shelterRows, teamRows, sosRows, alertRows, closed, safe] = await Promise.all([
    db
      .select({ s: shelters, zoneName: zones.name })
      .from(shelters)
      .innerJoin(zones, eq(shelters.zoneId, zones.id))
      .where(eq(shelters.isActive, true)),
    db
      .select({ t: rescueTeams, zoneName: zones.name })
      .from(rescueTeams)
      .innerJoin(zones, eq(rescueTeams.zoneId, zones.id))
      .orderBy(rescueTeams.name),
    db
      .select({ s: sosSignals, zoneName: zones.name })
      .from(sosSignals)
      .innerJoin(zones, eq(sosSignals.zoneId, zones.id))
      .where(gte(sosSignals.createdAt, since))
      .orderBy(desc(sosSignals.createdAt)),
    db
      .select({ a: alerts, zoneName: zones.name })
      .from(alerts)
      .innerJoin(zones, eq(alerts.zoneId, zones.id))
      .where(eq(alerts.status, "open"))
      .orderBy(desc(alerts.createdAt)),
    db.select({ id: roadEdges.id, name: roadEdges.name }).from(roadEdges).where(eq(roadEdges.status, "closed")),
    db.select({ id: citizens.id }).from(citizens).where(eq(citizens.status, "safe")),
  ]);

  const shelterList = shelterRows
    .map(({ s, zoneName }) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      lat: s.lat,
      lng: s.lng,
      capacity: s.capacity,
      occupancy: s.occupancy,
      occupancyPct: Math.round((s.occupancy / s.capacity) * 100),
      zoneName,
    }))
    .sort((a, b) => b.occupancyPct - a.occupancyPct);

  return {
    stats: {
      activeSos: sosRows.filter(({ s }) => s.status !== "resolved").length,
      safeCitizens: safe.length,
      criticalShelters: shelterList.filter((s) => s.occupancyPct >= CRITICAL_PCT).length,
      availableTeams: teamRows.filter(({ t }) => t.status === "available").length,
    },
    shelters: shelterList,
    teams: teamRows.map(({ t, zoneName }) => ({ id: t.id, name: t.name, status: t.status, zoneName })),
    sos: sosRows.map(({ s, zoneName }) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      zoneName,
      lat: s.lat,
      lng: s.lng,
      createdAt: s.createdAt.toISOString(),
    })),
    alerts: alertRows.map(({ a, zoneName }) => ({
      id: a.id,
      kind: a.kind,
      zoneName,
      sosCount: a.sosCount,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
    })),
    closedEdges: closed,
  };
}
