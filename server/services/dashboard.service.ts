import { and, count, desc, eq, gt, gte, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { alerts, citizens, rescueTeams, roadEdges, shelters, sosSignals, zones } from "@/server/db/schema";
import type { DashboardData } from "@/lib/types";

const SOS_WINDOW_MS = 60 * 60 * 1000;
const CRITICAL_PCT = 90;
const SOS_FEED_LIMIT = 100; // flood protection: the feed and map never carry more than this

export async function getDashboard(): Promise<DashboardData> {
  const since = new Date(Date.now() - SOS_WINDOW_MS);
  const active = and(gte(sosSignals.createdAt, since), ne(sosSignals.status, "resolved"));
  const [shelterRows, teamRows, sosRows, alertRows, closed, safe, [activeCount], [priorityCount]] = await Promise.all([
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
      .orderBy(desc(sosSignals.priority), desc(sosSignals.createdAt))
      .limit(SOS_FEED_LIMIT),
    db
      .select({ a: alerts, zoneName: zones.name })
      .from(alerts)
      .innerJoin(zones, eq(alerts.zoneId, zones.id))
      .where(eq(alerts.status, "open"))
      .orderBy(desc(alerts.createdAt)),
    db.select({ id: roadEdges.id, name: roadEdges.name }).from(roadEdges).where(eq(roadEdges.status, "closed")),
    db.select({ id: citizens.id }).from(citizens).where(eq(citizens.status, "safe")),
    db.select({ n: count() }).from(sosSignals).where(active),
    db.select({ n: count() }).from(sosSignals).where(and(active, gt(sosSignals.priority, 0))),
  ]);

  const shelterList = shelterRows
    .map(({ s, zoneName }) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      lat: s.lat,
      lng: s.lng,
      isAccessible: s.isAccessible,
      capacity: s.capacity,
      occupancy: s.occupancy,
      occupancyPct: Math.round((s.occupancy / s.capacity) * 100),
      zoneName,
    }))
    .sort((a, b) => b.occupancyPct - a.occupancyPct);

  return {
    stats: {
      activeSos: activeCount.n,
      prioritySos: priorityCount.n,
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
      priority: s.priority,
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
