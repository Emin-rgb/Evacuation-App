import type { SosType, DashboardData, MapData, NearestShelter, RoadStatus, RouteResult, TrafficEdge, Zone } from "@/lib/types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMap: () => get<MapData>("/api/map"),
  getZones: () => get<Zone[]>("/api/zones"),
  getNearestShelters: (lat: number, lng: number) =>
    get<NearestShelter[]>(`/api/shelters/nearest?lat=${lat}&lng=${lng}`),
  getRoute: (lat: number, lng: number, prev?: string) =>
    get<RouteResult>(`/api/route?lat=${lat}&lng=${lng}${prev ? `&prev=${prev}` : ""}`),
  getDashboard: () => get<DashboardData>("/api/dashboard"),
  setRoadStatus: (id: string, status: RoadStatus) =>
    patch<{ id: string; name: string; status: RoadStatus }>(`/api/traffic/roads/${id}`, { status }),
  setShelterOccupancy: (id: string, occupancy: number) =>
    patch<{ id: string; name: string; occupancyPct: number }>(`/api/shelters/${id}`, { occupancy }),
  createCitizen: (lat?: number, lng?: number) => post<{ id: string }>("/api/citizens", { lat, lng }),
  markSafe: (id: string) => patch<{ id: string; status: string }>(`/api/citizens/${id}`, { status: "safe" }),
  sendSos: (citizenId: string, type: SosType, lat: number, lng: number) =>
    post<{ id: string }>("/api/sos", { citizenId, type, lat, lng }),
  sosBurst: (lat: number, lng: number, count: number) =>
    post<{ created: number; alertsCreated: number }>("/api/simulate/sos-burst", { lat, lng, count }),
  approveAlert: (id: string) =>
    post<{
      id: string;
      team: { id: string; name: string } | null;
      shelter: { id: string; name: string } | null;
      assignedSos: number;
    }>(`/api/alerts/${id}/approve`, {}),
  dismissAlert: (id: string) => post<{ id: string }>(`/api/alerts/${id}/dismiss`, {}),
  getTraffic: () => get<TrafficEdge[]>("/api/traffic"),
};
