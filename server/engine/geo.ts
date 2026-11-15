export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function nearestNode<T extends LatLng>(point: LatLng, nodes: T[]): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    const d = haversineM(point, n);
    if (d < bestDist) {
      best = n;
      bestDist = d;
    }
  }
  return best;
}
