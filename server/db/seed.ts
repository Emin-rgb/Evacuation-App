import { config } from "dotenv";
config({ path: ".env.local" });

function haversineM(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

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

// key: [name, lat, lng]
const NODES: Record<string, [string, number, number]> = {
  n1: ["Hüseyn Cavid / Şərifzadə", 40.3905, 49.8038],
  n2: ["Həsən Əliyev / Təbriz", 40.3868, 49.8165],
  n3: ["Rəsul Rza / Yasamal", 40.3815, 49.8275],
  n4: ["28 May", 40.3797, 49.8466],
  n5: ["Nizami / Fizuli", 40.3792, 49.8367],
  n6: ["Dənizkənarı Bulvar", 40.3715, 49.8452],
  n7: ["İçərişəhər", 40.3657, 49.8359],
  n8: ["Azadlıq prospekti", 40.4012, 49.8394],
  n9: ["Nəsimi bazarı", 40.4037, 49.8318],
  n10: ["Metro 20 Yanvar", 40.4089, 49.8081],
  n11: ["Nərimanov / Əhməd Rəcəbli", 40.4018, 49.8693],
  n12: ["Tbilisi prospekti", 40.4224, 49.8621],
  n13: ["Binəqədi mərkəz", 40.4512, 49.8186],
  n14: ["Binəqədi / Biləcəri", 40.4457, 49.8059],
  n15: ["Xətai / Əhmədli", 40.3834, 49.8727],
  n16: ["Xətai / Nobel", 40.3851, 49.9022],
  n17: ["Xətai / Gənclik", 40.4019, 49.8513],
  n18: ["Heydər Əliyev Mərkəzi", 40.3954, 49.8678],
  n19: ["Zığ yolu", 40.4308, 49.8512],
  n20: ["Neftçilər prospekti", 40.3713, 49.8531],
};

const EDGES: [string, string, string][] = [
  ["n1", "n2", "Hüseyn Cavid prospekti"],
  ["n2", "n3", "Həsən Əliyev küçəsi"],
  ["n3", "n5", "Rəsul Rza küçəsi"],
  ["n5", "n4", "Nizami küçəsi"],
  ["n5", "n7", "Fizuli küçəsi"],
  ["n7", "n6", "Neftçilər yolu"],
  ["n6", "n4", "Dənizkənarı Bulvar"],
  ["n6", "n20", "Neftçilər prospekti"],
  ["n20", "n15", "Neftçilər prospekti"],
  ["n4", "n17", "28 May küçəsi"],
  ["n3", "n9", "Mirzə Ibrahimov"],
  ["n2", "n10", "Şəmsi Bədəlbəyli"],
  ["n10", "n9", "Azadlıq prospekti"],
  ["n9", "n8", "Azadlıq prospekti"],
  ["n8", "n17", "Azadlıq prospekti"],
  ["n8", "n11", "Rəşid Behbudov"],
  ["n17", "n18", "Heydər Əliyev prospekti"],
  ["n18", "n11", "Heydər Əliyev prospekti"],
  ["n11", "n12", "Tbilisi prospekti"],
  ["n12", "n19", "Tbilisi prospekti"],
  ["n19", "n13", "Zığ yolu"],
  ["n13", "n14", "Binəqədi şossesi"],
  ["n14", "n10", "Biləcəri yolu"],
  ["n14", "n1", "Ələsgər Qayıbov"],
  ["n10", "n1", "Şərifzadə küçəsi"],
  ["n18", "n15", "Əhmədli yolu"],
  ["n15", "n16", "Xətai prospekti"],
  ["n16", "n18", "Nobel prospekti"],
  ["n17", "n15", "Gənclik yolu"],
  ["n12", "n13", "Mərdəkan yolu"],
  ["n12", "n8", "Tbilisi yolu"],
];

// Drop 1: edges without ramps/with stairs (indices into EDGES by "a-b"), graph stays connected for accessible-only routing
const INACCESSIBLE_EDGES = new Set(["n3-n5", "n5-n7", "n6-n4", "n10-n9", "n8-n11", "n18-n15"]);
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

  await db.insert(s.shelters).values(
    SHELTERS.map(([name, type, zone, node, capacity, occupancy, isActive, isReserve]) => ({
      name,
      type,
      zoneId: zoneId[zone],
      nodeId: nodeId[node],
      lat: NODES[node][1],
      lng: NODES[node][2],
      capacity,
      occupancy,
      isActive,
      isReserve,
      isAccessible: !INACCESSIBLE_SHELTERS.has(name),
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
