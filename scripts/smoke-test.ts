/**
 * API smoke test: checks the CASE.md features and Drops 1-3 against a running server.
 * Usage: npx tsx scripts/smoke-test.ts [baseUrl=http://localhost:3000]
 * Needs a seeded DB. It changes demo data (SOS, alerts, occupancy): run `npm run db:seed` afterwards.
 */
const base = process.argv[2] ?? "http://localhost:3000";
let cookie = "";
let failed = 0;

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
async function call(method: string, path: string, body?: unknown, auth = false): Promise<{ code: number; json: Json }> {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(auth && cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { code: res.status, json };
}
function check(name: string, ok: boolean, info = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? `  [${info}]` : ""}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function login(email: string, password: string) {
  const res = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const set = res.headers.get("set-cookie");
  return { code: res.status, cookie: set ? set.split(";")[0] : "" };
}

async function main() {
  const zones: Json[] = (await call("GET", "/api/zones")).json;
  const Z = Object.fromEntries(zones.map((z) => [z.name, z]));
  const disp = await login("nigar@dac.az", "dispatcher123");
  check("login dispatcher", disp.code === 200 && !!disp.cookie);
  cookie = disp.cookie;
  const sup = await login("supervisor@dac.az", "supervisor123");

  // Module 1
  const bn = Z["Binəqədi"];
  const near = (await call("GET", `/api/shelters/nearest?lat=${bn.centerLat}&lng=${bn.centerLng}`)).json;
  check("M1 nearest shelters with occupancy %", Array.isArray(near) && near.length >= 3 && near.every((s: Json) => "occupancyPct" in s));
  const cit = (await call("POST", "/api/citizens", { lat: bn.centerLat, lng: bn.centerLng })).json;
  const route = (await call("GET", `/api/route?lat=${bn.centerLat}&lng=${bn.centerLng}&citizenId=${cit.id}`)).json;
  check("M1 route (path, distance, ETA)", route.path?.length >= 2 && route.distanceM > 0 && route.etaMin >= 1);
  let sosOk = true;
  for (const [i, type] of ["fire", "collapse", "flood", "medical"].entries()) {
    const c = (await call("POST", "/api/citizens", { lat: 40.43, lng: 49.8 + i * 0.02 })).json;
    const r = await call("POST", "/api/sos", { citizenId: c.id, type, lat: 40.43, lng: 49.8 + i * 0.02 });
    sosOk &&= r.code === 201 && r.json.type === type;
  }
  check("M1 SOS for 4 types", sosOk);
  check("M1 'I'm safe'", (await call("PATCH", `/api/citizens/${cit.id}`, { status: "safe" })).json?.status === "safe");

  const nr = Z["Nərimanov"];
  const map = (await call("GET", "/api/map")).json;
  const road = map.edges.find((e: Json) => e.name === "Tbilisi yolu");
  const r1 = (await call("GET", `/api/route?lat=${nr.centerLat}&lng=${nr.centerLng}`)).json;
  await call("PATCH", `/api/traffic/roads/${road.id}`, { status: "closed" }, true);
  const r2 = (await call("GET", `/api/route?lat=${nr.centerLat}&lng=${nr.centerLng}&prev=${r1.shelter.id}`)).json;
  check("M1 reroute when a road closes", r2.rerouted && r2.reason === "road_closed", `${r1.shelter.name} -> ${r2.shelter.name}`);
  await call("PATCH", `/api/traffic/roads/${road.id}`, { status: "open" }, true);
  for (const [pct, expect] of [[89, false], [90, true]] as const) {
    await call("PATCH", `/api/shelters/${r1.shelter.id}`, { occupancy: Math.ceil((r1.shelter.capacity * pct) / 100) }, true);
    const r = (await call("GET", `/api/route?lat=${nr.centerLat}&lng=${nr.centerLng}&prev=${r1.shelter.id}`)).json;
    check(`M1 shelter at ${pct}% -> reroute=${expect}`, r.rerouted === expect && (!expect || r.reason === "shelter_full"));
  }
  await call("PATCH", `/api/shelters/${r1.shelter.id}`, { occupancy: Math.floor(r1.shelter.capacity * 0.1) }, true);

  // Module 2
  const dash = (await call("GET", "/api/dashboard", undefined, true)).json;
  check("M2 dashboard (sos, shelters, teams, stats)", ["sos", "shelters", "teams", "stats", "alerts"].every((k) => k in dash));
  const xt = Z["Xətai"];
  const burst = async (n: number) => {
    for (let i = 0; i < n; i++) {
      const c = (await call("POST", "/api/citizens", { lat: xt.centerLat, lng: xt.centerLng })).json;
      await call("POST", "/api/sos", { citizenId: c.id, type: "fire", lat: xt.centerLat + i * 0.0004, lng: xt.centerLng });
    }
    await sleep(1500);
    return (await call("GET", "/api/dashboard", undefined, true)).json.alerts as Json[];
  };
  check("M2 3 distinct SOS -> no alert", !(await burst(3)).some((a) => a.kind === "sos_cluster"));
  const withAlert = await burst(1);
  const alert = withAlert.find((a) => a.kind === "sos_cluster");
  check("M2 4th distinct SOS within 500 m -> Red Alert", !!alert);
  const d = (await call("GET", "/api/dashboard", undefined, true)).json;
  const sh = d.shelters.find((s: Json) => s.occupancyPct < 50);
  await call("PATCH", `/api/shelters/${sh.id}`, { occupancy: Math.floor(sh.capacity * 0.95) }, true);
  await sleep(500);
  check("M2 exactly 95% -> no overload alert", !(await call("GET", "/api/dashboard", undefined, true)).json.alerts.some((a: Json) => a.kind === "shelter_overload"));
  await call("PATCH", `/api/shelters/${sh.id}`, { occupancy: Math.ceil(sh.capacity * 0.96) }, true);
  await sleep(500);
  check("M2 96% -> overload alert", (await call("GET", "/api/dashboard", undefined, true)).json.alerts.some((a: Json) => a.kind === "shelter_overload"));
  if (alert) {
    cookie = sup.cookie;
    check("RBAC supervisor approve -> 403", (await call("POST", `/api/alerts/${alert.id}/approve`, {}, true)).code === 403);
    cookie = disp.cookie;
    const ap = await call("POST", `/api/alerts/${alert.id}/approve`, {}, true);
    check("M2 one-click approve (team + reserve shelter)", ap.code === 200 && !!ap.json.team && !!ap.json.shelter, `by ${ap.json.approvedBy}`);
    check("M2 double approve -> 409", (await call("POST", `/api/alerts/${alert.id}/approve`, {}, true)).code === 409);
  }
  check("RBAC no session -> 401", (await call("GET", "/api/dashboard")).code === 401);

  // Drop 1
  const ns = Z["Nəsimi"];
  const pri = (await call("POST", "/api/citizens", { lat: ns.centerLat, lng: ns.centerLng, role: "priority" })).json;
  const rp = (await call("GET", `/api/route?lat=${ns.centerLat}&lng=${ns.centerLng}&citizenId=${pri.id}`)).json;
  check("D1 priority route accessible", rp.accessible === true && rp.shelter.isAccessible === true);
  const ps = await call("POST", "/api/sos", { citizenId: pri.id, type: "medical", lat: ns.centerLat, lng: ns.centerLng });
  check("D1 priority SOS -> Priority#1", ps.json?.priority === 1);

  // Drop 2
  for (const mode of ["503", "slow"]) {
    await call("PATCH", "/api/simulate/provider", { mode }, true);
    let allFallback = true;
    for (let i = 0; i < 4; i++) {
      const r = await call("GET", `/api/route?lat=${ns.centerLat}&lng=${ns.centerLng}`);
      allFallback &&= r.code === 200 && r.json.mode === "fallback";
    }
    check(`D2 provider ${mode}: routes stay up in fallback mode`, allFallback);
  }
  await call("PATCH", "/api/simulate/provider", { mode: "off" }, true);

  console.log(failed === 0 ? "\nALL PASSED" : `\n${failed} FAILED`);
  console.log("Run `npm run db:seed` to restore the demo state.");
  process.exit(failed === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
