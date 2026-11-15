import test from "node:test";
import assert from "node:assert/strict";
import { filterOsmShelters, polygonAreaM2, type OsmElement } from "@/server/engine/osm-shelters";

const ZONES = { Yasamal: [40.3866, 49.8153] as [number, number] };
const park = (name: string | undefined, lat: number, lon: number, extra: Record<string, string> = {}): OsmElement => ({
  type: "node",
  lat,
  lon,
  tags: { leisure: "park", ...(name ? { name } : {}), ...extra },
});

test("drops unnamed features", () => {
  assert.equal(filterOsmShelters([park(undefined, 40.3866, 49.8153)], ZONES).length, 0);
});

test("drops gazebo / picnic shelters", () => {
  const e = park("Pavilion", 40.3866, 49.8153, { shelter_type: "picnic_shelter" });
  assert.equal(filterOsmShelters([e], ZONES).length, 0);
});

test("drops points too far from every district", () => {
  assert.equal(filterOsmShelters([park("Far park", 40.3866, 49.97)], ZONES).length, 0);
});

test("dedupes by name and by distance (<150 m)", () => {
  const list = [
    park("A park", 40.3866, 49.8153),
    park("A park", 40.39, 49.82),
    park("B park", 40.38665, 49.81535),
    park("C park", 40.395, 49.83),
  ];
  assert.deepEqual(filterOsmShelters(list, ZONES).map((s) => s.name).sort(), ["A park", "C park"]);
});

test("estimates capacity from polygon area, prefers the osm tag", () => {
  // ~100 m x 100 m square = 10 000 m² -> open space 2 m²/person = 5000
  const d = 0.0009;
  const lat = 40.3866;
  const lon = 49.8153;
  const geometry = [
    { lat, lon },
    { lat, lon: lon + d / Math.cos((lat * Math.PI) / 180) },
    { lat: lat + d, lon: lon + d / Math.cos((lat * Math.PI) / 180) },
    { lat: lat + d, lon },
    { lat, lon },
  ];
  assert.ok(Math.abs(polygonAreaM2(geometry) - 10000) < 400);
  const [est] = filterOsmShelters([{ type: "way", geometry, tags: { leisure: "park", name: "Square park" } }], ZONES);
  assert.equal(est.capacitySource, "estimated");
  assert.ok(est.capacity > 4500 && est.capacity < 5500);
  const [tagged] = filterOsmShelters([park("Tagged", lat, lon, { capacity: "1234" })], ZONES);
  assert.deepEqual([tagged.capacity, tagged.capacitySource], [1234, "osm"]);
});
