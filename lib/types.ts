export type RoadStatus = "open" | "closed";
export type ShelterType = "shelter" | "park" | "stadium";
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
};
export type MapData = { nodes: MapNode[]; edges: MapEdge[]; shelters: MapShelter[] };
export type Zone = { id: string; name: string; centerLat: number; centerLng: number };
export type NearestShelter = MapShelter & { distanceM: number };

export type RouteReason = "road_closed" | "shelter_full";
export type RouteResult = {
  shelter: MapShelter;
  path: { lat: number; lng: number }[];
  distanceM: number;
  etaMin: number;
  rerouted: boolean;
  reason: RouteReason | null;
};
export type TrafficEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  status: RoadStatus;
};
