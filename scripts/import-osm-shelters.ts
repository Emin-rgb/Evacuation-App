// Offline import: server/data/raw/overpass-baku.json -> server/data/osm-shelters.json
// Run: npx tsx scripts/import-osm-shelters.ts   (data © OpenStreetMap contributors, ODbL)
import { readFileSync, writeFileSync } from "node:fs";
import { filterOsmShelters, pickSpread, type OsmElement } from "@/server/engine/osm-shelters";

const ZONES = {
  Yasamal: [40.3866, 49.8153],
  Nəsimi: [40.4045, 49.8425],
  Nərimanov: [40.4225, 49.8742],
  Səbail: [40.3667, 49.8352],
  Binəqədi: [40.4519, 49.8231],
  Xətai: [40.3814, 49.9075],
} as Record<string, [number, number]>;

const raw = JSON.parse(readFileSync("server/data/raw/overpass-baku.json", "utf8")) as { elements: OsmElement[] };
const filtered = filterOsmShelters(raw.elements, ZONES);
const top = pickSpread(filtered, Object.keys(ZONES), 10);
writeFileSync("server/data/osm-shelters.json", JSON.stringify(top, null, 2));
console.log(`${raw.elements.length} elements -> ${filtered.length} usable -> ${top.length} kept`);
for (const s of top) console.log(`${s.zone.padEnd(10)} ${s.type.padEnd(8)} ${String(s.capacity).padStart(5)} ${s.capacitySource} ${s.name}`);
