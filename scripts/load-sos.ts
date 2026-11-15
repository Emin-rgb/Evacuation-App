/**
 * SOS flood simulation. Usage: [SPREAD=1] npx tsx scripts/load-sos.ts [baseUrl] [total=600] [concurrency=50]
 * Needs a running server and a seeded DB. Prints status counts and latency percentiles.
 * Sends mixed junk: fresh citizens, repeat SOS from one citizen, out-of-bounds coordinates.
 */
const base = process.argv[2] ?? "http://localhost:3000";
const total = Number(process.argv[3] ?? 600);
const concurrency = Number(process.argv[4] ?? 50);
// SPREAD=1 simulates a botnet (many IPs) so the per-IP limit does not hide the DB path.
const SPREAD = process.env.SPREAD === "1";
const TYPES = ["fire", "collapse", "flood", "medical"];

const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] ?? 0;

async function main() {
  const citizens: string[] = [];
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${base}/api/citizens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: 40.41, lng: 49.87 }),
    });
    if (r.ok) citizens.push(((await r.json()) as { id: string }).id);
  }
  if (citizens.length === 0) throw new Error("Could not create citizens (is the server running and seeded?)");

  const lat = (i: number) => (i % 10 === 0 ? 10 : 40.4 + Math.random() * 0.05); // 10% out of bounds
  const jobs = Array.from({ length: total }, (_, i) => ({
    citizenId: citizens[i % 3 === 0 ? 0 : Math.floor(Math.random() * citizens.length)], // 1/3 repeat one citizen
    type: TYPES[i % 4],
    lat: lat(i),
    lng: 49.8 + Math.random() * 0.1,
  }));

  const latencies: number[] = [];
  const counts = new Map<string, number>();
  let next = 0;
  let probe = -1;

  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const t0 = performance.now();
      const res = await fetch(`${base}/api/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": SPREAD ? `203.0.113.${(next % 250) + 1}` : "203.0.113.7" },
        body: JSON.stringify(job),
      }).catch(() => null);
      latencies.push(performance.now() - t0);
      const key = res ? String(res.status) : "network-error";
      counts.set(key, (counts.get(key) ?? 0) + 1);
      await res?.text();
    }
  }
  // Probe a legit citizen-facing read halfway through the flood.
  const probeTimer = setTimeout(async () => {
    const t0 = performance.now();
    await fetch(`${base}/api/shelters/nearest?lat=40.41&lng=49.87`).then((r) => r.text()).catch(() => null);
    probe = performance.now() - t0;
  }, 300);

  const start = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  clearTimeout(probeTimer);
  const secs = (performance.now() - start) / 1000;

  latencies.sort((a, b) => a - b);
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  console.log(`\n${total} requests, concurrency ${concurrency}, ${secs.toFixed(1)} s (${(total / secs).toFixed(0)} req/s)`);
  console.log("status counts:", Object.fromEntries([...counts].sort()));
  console.log(
    `latency ms: mean ${mean.toFixed(0)}  p50 ${pct(latencies, 50).toFixed(0)}  p95 ${pct(latencies, 95).toFixed(0)}  max ${latencies.at(-1)?.toFixed(0)}`,
  );
  if (probe >= 0) console.log(`citizen read during flood: ${probe.toFixed(0)} ms`);
  console.log(mean < 300 ? "PASS: mean < 300 ms" : "FAIL: mean >= 300 ms");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
