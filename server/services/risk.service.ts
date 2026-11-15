import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { systemFlags, zones } from "@/server/db/schema";
import { CircuitBreaker, withTimeout } from "@/server/engine/circuit-breaker";
import {
  DAY_MS,
  detectSeismicAnomaly,
  fullPctFor,
  scoreEarthquake,
  scoreFlood,
  simulatedFloodDaily,
  simulatedQuakeFeatures,
  type UsgsFeature,
  type WeatherDaily,
} from "@/server/engine/risk";
import type { RiskLevel, RiskSimulation, RiskSnapshot } from "@/lib/types";

const FLAG = "risk_simulation";
const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 5000;
const BAKU = { lat: 40.4093, lng: 49.8671 };
const AZ_BBOX = { minLat: 38, maxLat: 42.5, minLon: 44, maxLon: 51 };

type Entry<T> = { at: number; value: T };

// One breaker per upstream, so a USGS outage never hides the flood score (and vice versa).
const usgsBreaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 30_000 });
const weatherBreaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 30_000 });
let usgsCache: Entry<UsgsFeature[]> | null = null;
const weatherCache = new Map<string, Entry<WeatherDaily>>();

/** Fresh cache → live call (via breaker + timeout) → stale cache → null. Never throws. */
async function cachedFetch<T>(
  entry: Entry<T> | null | undefined,
  breaker: CircuitBreaker,
  load: () => Promise<T>,
  store: (e: Entry<T>) => void,
): Promise<T | null> {
  if (entry && Date.now() - entry.at < TTL_MS) return entry.value;
  try {
    const value = await breaker.exec(() => withTimeout(load, TIMEOUT_MS));
    store({ at: Date.now(), value });
    return value;
  } catch (err) {
    console.error("risk upstream failed:", err instanceof Error ? err.message : err);
    return entry?.value ?? null;
  }
}

async function loadUsgs(): Promise<UsgsFeature[]> {
  const now = new Date();
  const params = new URLSearchParams({
    format: "geojson",
    starttime: new Date(now.getTime() - 90 * DAY_MS).toISOString().slice(0, 10),
    endtime: new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10),
    minlatitude: String(AZ_BBOX.minLat),
    maxlatitude: String(AZ_BBOX.maxLat),
    minlongitude: String(AZ_BBOX.minLon),
    maxlongitude: String(AZ_BBOX.maxLon),
    minmagnitude: "1",
    orderby: "time",
  });
  const res = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
  const json = (await res.json()) as { features?: UsgsFeature[] };
  return json.features ?? [];
}

async function loadWeather(lat: number, lng: number): Promise<WeatherDaily> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "precipitation_sum,precipitation_probability_max,snowfall_sum",
    forecast_days: "3",
    timezone: "Asia/Baku",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = (await res.json()) as { daily?: WeatherDaily };
  return json.daily ?? {};
}

export async function getRiskSimulation(): Promise<RiskSimulation> {
  const [row] = await db.select().from(systemFlags).where(eq(systemFlags.key, FLAG));
  return row?.value === "quake" || row?.value === "flood" ? row.value : "none";
}

export async function setRiskSimulation(mode: RiskSimulation): Promise<void> {
  await db
    .insert(systemFlags)
    .values({ key: FLAG, value: mode })
    .onConflictDoUpdate({ target: systemFlags.key, set: { value: mode, updatedAt: new Date() } });
}

async function coordsFor(zoneId?: string) {
  if (!zoneId) return BAKU;
  const [z] = await db
    .select({ lat: zones.centerLat, lng: zones.centerLng })
    .from(zones)
    .where(eq(zones.id, zoneId));
  return z ?? BAKU;
}

/** Daily risk for one district (weather) + the whole country (seismic). Never throws: missing sources come back as null. */
export async function getRisk(zoneId?: string): Promise<RiskSnapshot> {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const [simulation, { lat, lng }] = await Promise.all([getRiskSimulation(), coordsFor(zoneId)]);
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

  const [features, daily] = await Promise.all([
    simulation === "quake"
      ? Promise.resolve(null)
      : cachedFetch(usgsCache, usgsBreaker, loadUsgs, (e) => (usgsCache = e)),
    simulation === "flood"
      ? Promise.resolve(simulatedFloodDaily())
      : cachedFetch(
          weatherCache.get(key),
          weatherBreaker,
          () => loadWeather(lat, lng),
          (e) => weatherCache.set(key, e),
        ),
  ]);

  // The simulated quake rides on real history, so the z-score baseline stays realistic.
  const quakeInput =
    simulation === "quake"
      ? [...simulatedQuakeFeatures(now), ...(usgsCache?.value ?? [])]
      : features;
  const earthquake = quakeInput ? scoreEarthquake(quakeInput, now) : null;
  const anomaly = quakeInput ? detectSeismicAnomaly(quakeInput, now) : null;
  const flood = daily ? scoreFlood(daily, month) : null;

  return {
    generatedAt: now.toISOString(),
    source: simulation !== "none" ? "simulation" : earthquake || flood ? "live" : "unavailable",
    simulation,
    earthquake,
    flood,
    anomaly,
    rerouteThresholdPct: fullPctFor(flood?.level),
  };
}

/**
 * Cheap flood level for routing (Task 20.6): simulation flag or already-cached forecasts only, no network.
 * The risk banner warms the cache; if nothing is cached the normal 90% threshold applies.
 */
export async function peekFloodLevel(): Promise<RiskLevel | null> {
  if ((await getRiskSimulation()) === "flood") return "critical";
  const month = new Date().getUTCMonth() + 1;
  const order: RiskLevel[] = ["minimal", "low", "moderate", "high", "critical"];
  let top: RiskLevel | null = null;
  for (const e of weatherCache.values()) {
    if (Date.now() - e.at >= TTL_MS) continue;
    const level = scoreFlood(e.value, month).level;
    if (!top || order.indexOf(level) > order.indexOf(top)) top = level;
  }
  return top;
}
