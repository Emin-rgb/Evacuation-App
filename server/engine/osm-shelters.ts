import { haversineM } from "@/server/engine/geo";

export type OsmElement = {
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};
export type ShelterType = "shelter" | "park" | "stadium";
export type OsmShelter = {
  name: string;
  type: ShelterType;
  zone: string;
  lat: number;
  lng: number;
  capacity: number;
  capacitySource: "osm" | "estimated";
  areaM2: number;
};
export type ZoneCentres = Record<string, [number, number]>;

const BAD_SHELTER_TYPES = new Set(["picnic_shelter", "gazebo", "lean_to", "weather_shelter", "basic_hut"]);
// zoos, botanical gardens etc. are paid/fenced attractions, not gathering points
const NOT_A_SHELTER = /zoo|botanika|botanical|residence|rezidensiya|atıcılıq/i;
const MAX_DIST_M = 6000;
const MIN_GAP_M = 150;
const MIN_CAP = 300;
const MAX_CAP = 10000;

/** Polygon area in m² (shoelace on a local equirectangular projection). 0 for non-polygons. */
export function polygonAreaM2(geometry: { lat: number; lon: number }[] | undefined): number {
  if (!geometry || geometry.length < 4) return 0;
  const lat0 = geometry[0].lat;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  let sum = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    const a = geometry[i];
    const b = geometry[i + 1];
    sum += a.lon * kx * (b.lat * ky) - b.lon * kx * (a.lat * ky);
  }
  return Math.abs(sum) / 2;
}

export function mapType(tags: Record<string, string>): { type: ShelterType; open: boolean } | null {
  if (tags.leisure === "stadium") return { type: "stadium", open: true };
  if (tags.leisure === "park" || tags.landuse === "recreation_ground" || tags.place === "square") {
    return { type: "park", open: true };
  }
  if (["school", "university", "community_centre"].includes(tags.amenity ?? "")) return { type: "shelter", open: false };
  if (tags.emergency === "assembly_point") return { type: "park", open: true };
  return null;
}

function centreOf(e: OsmElement): { lat: number; lng: number } | null {
  if (e.lat != null && e.lon != null) return { lat: e.lat, lng: e.lon };
  if (e.center) return { lat: e.center.lat, lng: e.center.lon };
  if (e.geometry?.length) {
    const lat = e.geometry.reduce((s, p) => s + p.lat, 0) / e.geometry.length;
    const lng = e.geometry.reduce((s, p) => s + p.lon, 0) / e.geometry.length;
    return { lat, lng };
  }
  return null;
}

export function estimateCapacity(tags: Record<string, string>, areaM2: number, open: boolean) {
  const tag = Number.parseInt(tags.capacity ?? "", 10);
  if (Number.isFinite(tag) && tag > 0) return { capacity: tag, capacitySource: "osm" as const };
  const raw = areaM2 / (open ? 2 : 4);
  return { capacity: Math.round(Math.min(MAX_CAP, Math.max(MIN_CAP, raw))), capacitySource: "estimated" as const };
}

/**
 * Pure filter: OSM elements → usable gathering points.
 * Drops unnamed, gazebo/picnic shelters, far-from-districts and duplicate (name or <150 m) features.
 * Result is sorted by size (area), largest first.
 */
export function filterOsmShelters(elements: OsmElement[], zones: ZoneCentres): OsmShelter[] {
  const candidates: OsmShelter[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    const name = (tags.name ?? "").trim();
    if (!name) continue;
    if (BAD_SHELTER_TYPES.has(tags.shelter_type ?? "")) continue;
    if (tags.amenity === "shelter") continue;
    if (NOT_A_SHELTER.test(name)) continue;
    const kind = mapType(tags);
    const c = centreOf(e);
    if (!kind || !c) continue;

    let zone = "";
    let best = Infinity;
    for (const [z, [lat, lng]] of Object.entries(zones)) {
      const d = haversineM(c, { lat, lng });
      if (d < best) {
        best = d;
        zone = z;
      }
    }
    if (best > MAX_DIST_M) continue;

    const areaM2 = polygonAreaM2(e.geometry);
    const { capacity, capacitySource } = estimateCapacity(tags, areaM2, kind.open);
    candidates.push({ name, type: kind.type, zone, lat: c.lat, lng: c.lng, capacity, capacitySource, areaM2 });
  }

  candidates.sort((a, b) => b.areaM2 - a.areaM2 || b.capacity - a.capacity);
  const kept: OsmShelter[] = [];
  const names = new Set<string>();
  for (const c of candidates) {
    const key = c.name.toLowerCase();
    if (names.has(key)) continue;
    if (kept.some((k) => haversineM(k, c) < MIN_GAP_M)) continue;
    names.add(key);
    kept.push(c);
  }
  return kept;
}

/** Spread selection: the best one per zone first, then the largest remaining, up to `count`. */
export function pickSpread(list: OsmShelter[], zoneNames: string[], count: number): OsmShelter[] {
  const picked: OsmShelter[] = [];
  for (const z of zoneNames) {
    const best = list.find((s) => s.zone === z);
    if (best) picked.push(best);
  }
  for (const s of list) {
    if (picked.length >= count) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, count);
}
