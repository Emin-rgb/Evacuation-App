import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync } from "node:fs";
import { EDGES, INACCESSIBLE_EDGES, NODES, haversineM } from "@/server/data/fallback-graph";

const ZONES: Record<string, [number, number]> = {
  Yasamal: [40.3866, 49.8153],
  Nəsimi: [40.4093, 49.8671],
  Nərimanov: [40.4094, 49.8697],
  Səbail: [40.3667, 49.8352],
  Binəqədi: [40.4519, 49.8231],
  Xətai: [40.3814, 49.9075],
};
// Nərimanov center nudged so it differs from Nəsimi
ZONES["Nərimanov"] = [40.4225, 49.8742];
ZONES["Nəsimi"] = [40.4045, 49.8425];

const INACCESSIBLE_SHELTERS = new Set(["Təbriz küçəsi sığınacağı", "Nəsimi İdman Sarayı"]);
// citizen indexes (of 40) with the priority role; 5 and 9 also have an SOS signal
const PRIORITY_CITIZENS = new Set([5, 9, 20]);

// [name, type, zone, nodeKey, capacity, occupancy, active, reserve]
const SHELTERS: [string, "shelter" | "park" | "stadium", string, string, number, number, boolean, boolean][] = [
  ["Yasamal Parkı", "park", "Yasamal", "n2", 3000, 700, true, false],
  ["Təbriz küçəsi sığınacağı", "shelter", "Yasamal", "n3", 800, 680, true, false],
  ["Tofiq Bəhramov Stadionu", "stadium", "Səbail", "n6", 8000, 1600, true, false],
  ["Dənizkənarı Milli Park", "park", "Səbail", "n4", 5000, 900, true, false],
  ["Nəsimi İdman Sarayı", "shelter", "Nəsimi", "n9", 1200, 300, true, false],
  ["Gənclik Parkı", "park", "Nəsimi", "n17", 2500, 450, true, false],
  ["Nərimanov Parkı", "park", "Nərimanov", "n11", 2000, 380, true, false],
  ["Binəqədi İdman Kompleksi", "stadium", "Binəqədi", "n13", 3500, 500, true, false],
  ["Xətai Olimpiya Meydanı", "stadium", "Xətai", "n16", 6000, 800, false, true],
  ["Yasamal Ehtiyat Meydanı", "park", "Yasamal", "n1", 2000, 0, false, true],
];

type SeedShelter = {
  name: string;
  type: "shelter" | "park" | "stadium";
  zone: string;
  lat: number;
  lng: number;
  node?: string;
  capacity: number;
  occupancy: number;
  active: boolean;
  reserve: boolean;
  inaccessible: boolean;
};

// Real OSM places (server/data/osm-shelters.json, © OpenStreetMap contributors) with the demo occupancy story
// applied by index: #1 at 85% and not accessible, #4 not accessible, last two = inactive reserves.
// Falls back to the hand-written list if the file is missing so the seed never breaks.
function loadShelters(): SeedShelter[] {
  const file = "server/data/osm-shelters.json";
  if (!existsSync(file)) {
    return SHELTERS.map(([name, type, zone, node, capacity, occupancy, active, reserve]) => ({
      name, type, zone, node, capacity, occupancy, active, reserve,
      lat: NODES[node][1],
      lng: NODES[node][2],
      inaccessible: INACCESSIBLE_SHELTERS.has(name),
    }));
  }
  const osm = JSON.parse(readFileSync(file, "utf8")) as Omit<SeedShelter, "occupancy" | "active" | "reserve" | "inaccessible">[];
  const FILL = [0.12, 0.85, 0.18, 0.2, 0.1, 0.15, 0.12, 0.2];
  return osm.map((sh, i) => {
    const reserve = i >= osm.length - 2;
    return {
      ...sh,
      occupancy: reserve ? 0 : Math.round(sh.capacity * FILL[i % FILL.length]),
      active: !reserve,
      reserve,
      inaccessible: i === 1 || i === 4,
    };
  });
}

const TEAMS: [string, string][] = [
  ["Briqada Y-1", "Yasamal"],
  ["Briqada Y-2", "Yasamal"],
  ["Briqada S-1", "Səbail"],
  ["Briqada N-1", "Nəsimi"],
  ["Briqada B-1", "Binəqədi"],
  ["Briqada X-1", "Xətai"],
];

const SOS_TYPES = ["fire", "collapse", "flood", "medical"] as const;

async function main() {
  const { db } = await import("./index");
  const s = await import("./schema");

  // children first
  await db.delete(s.rescueTeams);
  await db.delete(s.alerts);
  await db.delete(s.sosSignals);
  await db.delete(s.citizens);
  await db.delete(s.shelters);
  await db.delete(s.roadEdges);
  await db.delete(s.roadNodes);
  await db.delete(s.zones);

  // Demo accounts (upserted, never wiped: reseeding must not log people out or lose accounts).
  const { hashPassword } = await import("../engine/password");
  const demoUsers = [
    { email: "nigar@dac.az", name: "Nigar Huseynova", role: "dispatcher" as const, password: "dispatcher123" },
    { email: "rauf@dac.az", name: "Rauf Aliyev", role: "dispatcher" as const, password: "dispatcher123" },
    { email: "supervisor@dac.az", name: "Leyla Supervisor", role: "supervisor" as const, password: "supervisor123" },
  ];
  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password);
    await db
      .insert(s.users)
      .values({ email: u.email, name: u.name, role: u.role, passwordHash })
      .onConflictDoUpdate({
        target: s.users.email,
        set: { name: u.name, role: u.role, passwordHash, failedAttempts: 0, lockedUntil: null },
      });
  }

  const zoneRows = await db
    .insert(s.zones)
    .values(Object.entries(ZONES).map(([name, [centerLat, centerLng]]) => ({ name, centerLat, centerLng })))
    .returning();
  const zoneId = Object.fromEntries(zoneRows.map((z) => [z.name, z.id]));

  const nodeRows = await db
    .insert(s.roadNodes)
    .values(Object.entries(NODES).map(([key, [name, lat, lng]]) => ({ name: `${key}|${name}`, lat, lng })))
    .returning();
  const nodeId: Record<string, string> = {};
  for (const n of nodeRows) {
    const [key, name] = n.name.split("|");
    nodeId[key] = n.id;
    // store clean name
    void name;
  }
  // restore clean names
  for (const n of nodeRows) {
    const [key, name] = n.name.split("|");
    const { eq } = await import("drizzle-orm");
    await db.update(s.roadNodes).set({ name }).where(eq(s.roadNodes.id, nodeId[key]));
  }

  await db.insert(s.roadEdges).values(
    EDGES.map(([a, b, name]) => ({
      fromNodeId: nodeId[a],
      toNodeId: nodeId[b],
      name,
      lengthM: haversineM([NODES[a][1], NODES[a][2]], [NODES[b][1], NODES[b][2]]),
      isAccessible: !INACCESSIBLE_EDGES.has(`${a}-${b}`),
    })),
  );

  const shelterList = loadShelters();
  const nearestNodeKey = (lat: number, lng: number) =>
    Object.keys(NODES).reduce((best, k) =>
      haversineM([lat, lng], [NODES[k][1], NODES[k][2]]) < haversineM([lat, lng], [NODES[best][1], NODES[best][2]]) ? k : best,
    );
  await db.insert(s.shelters).values(
    shelterList.map((sh) => ({
      name: sh.name,
      type: sh.type,
      zoneId: zoneId[sh.zone],
      nodeId: nodeId[sh.node ?? nearestNodeKey(sh.lat, sh.lng)],
      lat: sh.lat,
      lng: sh.lng,
      capacity: sh.capacity,
      occupancy: sh.occupancy,
      isActive: sh.active,
      isReserve: sh.reserve,
      isAccessible: !sh.inaccessible,
      // OSM has no capacity data: the number is estimated from area (see scripts/import-osm-shelters.ts)
    })),
  );

  await db.insert(s.rescueTeams).values(TEAMS.map(([name, zone]) => ({ name, zoneId: zoneId[zone] })));

  // 40 citizens spread over zones, deterministic jitter
  const zoneNames = Object.keys(ZONES);
  const citizenValues = Array.from({ length: 40 }, (_, i) => {
    const zone = zoneNames[i % zoneNames.length];
    const [lat, lng] = ZONES[zone];
    return {
      zoneId: zoneId[zone],
      lat: lat + (((i * 37) % 21) - 10) * 0.0006,
      lng: lng + (((i * 53) % 21) - 10) * 0.0006,
      status: (i % 5 === 0 ? "safe" : "unknown") as "safe" | "unknown",
      role: (PRIORITY_CITIZENS.has(i) ? "priority" : "standard") as "priority" | "standard",
    };
  });
  const citizenRows = await db.insert(s.citizens).values(citizenValues).returning();

  // 12 older SOS signals (20–55 min ago, spread out → no live alert at start)
  const sosCitizens = citizenRows.slice(0, 12);
  await db.insert(s.sosSignals).values(
    sosCitizens.map((c, i) => ({
      citizenId: c.id,
      zoneId: c.zoneId!,
      type: SOS_TYPES[i % 4],
      lat: c.lat!,
      lng: c.lng!,
      status: (i < 4 ? "resolved" : i < 7 ? "assigned" : "new") as "resolved" | "assigned" | "new",
      priority: c.role === "priority" ? 1 : 0,
      createdAt: new Date(Date.now() - (20 + i * 3) * 60_000),
    })),
  );

  console.log("Seeded: 6 zones, 20 nodes, 31 edges, 10 shelters, 6 teams, 40 citizens, 12 SOS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
