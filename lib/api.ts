import type { MapData, NearestShelter, Zone } from "@/lib/types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMap: () => get<MapData>("/api/map"),
  getZones: () => get<Zone[]>("/api/zones"),
  getNearestShelters: (lat: number, lng: number) =>
    get<NearestShelter[]>(`/api/shelters/nearest?lat=${lat}&lng=${lng}`),
};
