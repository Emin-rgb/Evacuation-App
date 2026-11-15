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
