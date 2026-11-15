import { haversineM } from "@/server/engine/geo";

export const CLUSTER_MIN_SIGNALS = 4;
export const CLUSTER_RADIUS_M = 500;
export const CLUSTER_WINDOW_MS = 5 * 60 * 1000;
export const OVERLOAD_PCT = 95;

export type CrisisSos = { citizenId: string; zoneId: string; lat: number; lng: number; createdAt: Date; status: string };
export type CrisisShelter = { id: string; name: string; zoneId: string; capacity: number; occupancy: number; isActive: boolean };
export type OpenAlert = { kind: "sos_cluster" | "shelter_overload"; zoneId: string; shelterId: string | null };

export type AlertCandidate = {
  kind: "sos_cluster" | "shelter_overload";
  zoneId: string;
  shelterId: string | null;
  sosCount: number;
  message: string;
};

type Input = { sos: CrisisSos[]; shelters: CrisisShelter[]; openAlerts: OpenAlert[]; now?: Date };

export function detectAlerts({ sos, shelters, openAlerts, now = new Date() }: Input): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  const since = now.getTime() - CLUSTER_WINDOW_MS;
  const recent = sos.filter((s) => s.status !== "resolved" && s.createdAt.getTime() >= since);

  // Cluster: best center = the signal with the most distinct citizens within radius.
  const clusterZones = new Set(openAlerts.filter((a) => a.kind === "sos_cluster").map((a) => a.zoneId));
  const best = new Map<string, number>();
  for (const center of recent) {
    if (clusterZones.has(center.zoneId)) continue;
    const citizens = new Set(recent.filter((s) => haversineM(center, s) <= CLUSTER_RADIUS_M).map((s) => s.citizenId));
    if (citizens.size >= CLUSTER_MIN_SIGNALS && citizens.size > (best.get(center.zoneId) ?? 0)) {
      best.set(center.zoneId, citizens.size);
    }
  }
  for (const [zoneId, count] of best) {
    out.push({
      kind: "sos_cluster",
      zoneId,
      shelterId: null,
      sosCount: count,
      message: `${count} SOS / ${CLUSTER_RADIUS_M} m`,
    });
  }

  const overloaded = new Set(openAlerts.filter((a) => a.kind === "shelter_overload").map((a) => a.shelterId));
  for (const s of shelters) {
    if (!s.isActive || overloaded.has(s.id) || s.capacity <= 0) continue;
    const pct = Math.round((s.occupancy / s.capacity) * 100);
    if (pct > OVERLOAD_PCT) {
      out.push({ kind: "shelter_overload", zoneId: s.zoneId, shelterId: s.id, sosCount: 0, message: `${s.name} ${pct}%` });
    }
  }
  return out;
}
