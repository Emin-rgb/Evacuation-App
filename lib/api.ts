import type { RiskSimulation, RiskSnapshot, CitizenRole, FailureMode, ProviderHealth, SosType, DashboardData, MapData, NearestShelter, RoadStatus, RouteResult, TrafficEdge, Zone } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterSec?: number,
  ) {
    super(message);
  }
}

async function fail(res: Response): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status, body?.retryAfterSec);
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return fail(res);
  return res.json() as Promise<T>;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return fail(res);
  return res.json() as Promise<T>;
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return fail(res);
  return res.json() as Promise<T>;
}

export type SessionRole = "supervisor" | "dispatcher";
export type SessionUser = { id: string; name: string; role: SessionRole };

export const api = {
  login: (email: string, password: string) => post<{ user: SessionUser }>("/api/auth/login", { email, password }),
  logout: () => post<{ ok: true }>("/api/auth/logout", {}),
  getSession: () => get<{ user: SessionUser | null }>("/api/auth/me"),
  getMap: () => get<MapData>("/api/map"),
  getZones: () => get<Zone[]>("/api/zones"),
  getNearestShelters: (lat: number, lng: number) =>
    get<NearestShelter[]>(`/api/shelters/nearest?lat=${lat}&lng=${lng}`),
  getRoute: (lat: number, lng: number, opts: { prev?: string; citizenId?: string; shelterId?: string } = {}) =>
    get<RouteResult>(
      `/api/route?lat=${lat}&lng=${lng}${opts.prev ? `&prev=${opts.prev}` : ""}${opts.citizenId ? `&citizenId=${opts.citizenId}` : ""}${opts.shelterId ? `&shelterId=${opts.shelterId}` : ""}`,
    ),
  getDashboard: () => get<DashboardData>("/api/dashboard"),
  setRoadStatus: (id: string, status: RoadStatus) =>
    patch<{ id: string; name: string; status: RoadStatus }>(`/api/traffic/roads/${id}`, { status }),
  setShelterOccupancy: (id: string, occupancy: number) =>
    patch<{ id: string; name: string; occupancyPct: number }>(`/api/shelters/${id}`, { occupancy }),
  createCitizen: (lat?: number, lng?: number, role?: CitizenRole) =>
    post<{ id: string }>("/api/citizens", { lat, lng, role }),
  setCitizenRole: (id: string, role: CitizenRole) =>
    patch<{ id: string; role: CitizenRole }>(`/api/citizens/${id}`, { role }),
  markSafe: (id: string) => patch<{ id: string; status: string }>(`/api/citizens/${id}`, { status: "safe" }),
  sendSos: (citizenId: string, type: SosType, lat: number, lng: number) =>
    post<{ id: string; priority: number }>("/api/sos", { citizenId, type, lat, lng }),
  sosBurst: (lat: number, lng: number, count: number) =>
    post<{ created: number; alertsCreated: number }>("/api/simulate/sos-burst", { lat, lng, count }),
  approveAlert: (id: string) =>
    post<{
      id: string;
      approvedBy: string;
      team: { id: string; name: string } | null;
      shelter: { id: string; name: string } | null;
      assignedSos: number;
    }>(`/api/alerts/${id}/approve`, {}),
  dismissAlert: (id: string) => post<{ id: string }>(`/api/alerts/${id}/dismiss`, {}),
  getProviderHealth: () => get<ProviderHealth & { mode: FailureMode }>("/api/traffic/health"),
  setProviderMode: (mode: FailureMode) => patch<{ mode: FailureMode }>("/api/simulate/provider", { mode }),
  getRisk: (zoneId?: string) => get<RiskSnapshot>(`/api/risk${zoneId ? `?zoneId=${zoneId}` : ""}`),
  setRiskSimulation: (mode: RiskSimulation) => patch<{ mode: RiskSimulation }>("/api/simulate/risk", { mode }),
  getTraffic: () => get<TrafficEdge[]>("/api/traffic"),
};
