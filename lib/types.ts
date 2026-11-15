export type RoadStatus = "open" | "closed";
export type ShelterType = "shelter" | "park" | "stadium";
export type CitizenRole = "standard" | "priority";
export type SosType = "fire" | "collapse" | "flood" | "medical";

export type MapNode = { id: string; name: string; lat: number; lng: number };
export type MapEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  name: string;
  status: RoadStatus;
};
export type MapShelter = {
  id: string;
  name: string;
  type: ShelterType;
  lat: number;
  lng: number;
  capacity: number;
  occupancy: number;
  occupancyPct: number;
  isAccessible: boolean;
};
export type MapZone = { id: string; name: string; lat: number; lng: number };
export type MapData = { nodes: MapNode[]; edges: MapEdge[]; shelters: MapShelter[]; zones: MapZone[] };
export type Zone = { id: string; name: string; centerLat: number; centerLng: number };
export type NearestShelter = MapShelter & { distanceM: number };

export type RouteReason = "road_closed" | "shelter_full";
export type RouteResult = {
  shelter: MapShelter;
  path: { lat: number; lng: number }[];
  distanceM: number;
  etaMin: number;
  /** road-by-road directions along the path */
  steps: { name: string; distanceM: number }[];
  rerouted: boolean;
  /** true when the route was computed on accessible edges only (priority citizen) */
  accessible: boolean;
  reason: RouteReason | null;
};
export type TrafficEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  status: RoadStatus;
  isAccessible?: boolean;
};

export type SosStatus = "new" | "assigned" | "resolved";
export type TeamStatus = "available" | "en_route" | "on_scene";
export type AlertKind = "sos_cluster" | "shelter_overload";

export type DashboardSos = {
  id: string;
  type: SosType;
  status: SosStatus;
  priority: number;
  zoneName: string;
  lat: number;
  lng: number;
  createdAt: string;
};
export type DashboardTeam = { id: string; name: string; status: TeamStatus; zoneName: string };
export type DashboardAlert = {
  id: string;
  kind: AlertKind;
  zoneName: string;
  sosCount: number;
  message: string;
  createdAt: string;
};
export type DashboardData = {
  stats: { activeSos: number; prioritySos: number; safeCitizens: number; criticalShelters: number; availableTeams: number };
  shelters: (MapShelter & { zoneName: string })[];
  teams: DashboardTeam[];
  sos: DashboardSos[];
  alerts: DashboardAlert[];
  closedEdges: { id: string; name: string }[];
};
