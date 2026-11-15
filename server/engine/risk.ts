import type { RiskFactor, RiskLevel, SeismicAnomaly } from "@/lib/types";

/** Pure scoring for the Daily Risk module: no I/O, injectable clock. Scores are indicative, not predictions. */

export type UsgsFeature = { properties?: { mag?: number | null; time?: number | null } };
export type WeatherDaily = {
  precipitation_sum?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  snowfall_sum?: (number | null)[];
};

export const DAY_MS = 86_400_000;
export const ANOMALY_SIGMA = 2;
/** Shelter "full" threshold used by routing: lowered while flood risk is high (Task 20.6). */
export const FULL_PCT_DEFAULT = 90;
export const FULL_PCT_FLOOD = 80;

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  if (score >= 10) return "low";
  return "minimal";
}

export function isElevated(level: RiskLevel | null | undefined): boolean {
  return level === "high" || level === "critical";
}

/** Routing threshold: 80% while flood risk is high/critical, otherwise 90%. */
export function fullPctFor(floodLevel: RiskLevel | null | undefined): number {
  return isElevated(floodLevel) ? FULL_PCT_FLOOD : FULL_PCT_DEFAULT;
}

export type Season = "winter" | "spring" | "summer" | "autumn";

/** Azerbaijan flood drivers: spring snowmelt (Mar–May) and autumn fronts (Sep–Nov). `month` is 1–12. */
export function seasonalFactor(month: number): { factor: number; season: Season } {
  const table: Record<number, [number, Season]> = {
    1: [0.6, "winter"],
    2: [0.7, "winter"],
    3: [1.5, "spring"],
    4: [1.7, "spring"],
    5: [1.5, "spring"],
    6: [0.9, "summer"],
    7: [0.7, "summer"],
    8: [0.7, "summer"],
    9: [1.0, "autumn"],
    10: [1.3, "autumn"],
    11: [1.1, "autumn"],
    12: [0.7, "winter"],
  };
  const [factor, season] = table[month] ?? [1, "autumn"];
  return { factor, season };
}

export type HazardScore = { score: number; level: RiskLevel; factors: RiskFactor[] };

/** Earthquake score 0–100 from the last 30 days of M1+ events; the last 7 days count double. */
export function scoreEarthquake(features: UsgsFeature[], now: Date = new Date()): HazardScore {
  const since30 = now.getTime() - 30 * DAY_MS;
  const since7 = now.getTime() - 7 * DAY_MS;
  const recent = features.filter((f) => num(f.properties?.time) >= since30);
  if (recent.length === 0) {
    return { score: 5, level: "minimal", factors: [{ key: "eq_none" }, { key: "eq_baseline" }] };
  }
  let score = 0;
  let maxMag = 0;
  let count7 = 0;
  for (const f of recent) {
    const mag = num(f.properties?.mag);
    maxMag = Math.max(maxMag, mag);
    let pts = mag >= 6 ? 50 : mag >= 5 ? 25 : mag >= 4 ? 10 : mag >= 3 ? 3 : 0.5;
    if (num(f.properties?.time) > since7) {
      pts *= 2;
      count7 += 1;
    }
    score += pts;
  }
  score = Math.round(Math.min(score, 100) * 10) / 10;
  const factors: RiskFactor[] = [
    { key: "eq_count_30d", value: recent.length },
    { key: "eq_count_7d", value: count7 },
    { key: "eq_max_mag", value: Math.round(maxMag * 10) / 10 },
  ];
  if (maxMag >= 5) factors.push({ key: "eq_aftershock" });
  return { score, level: riskLevel(score), factors };
}

export function floodDayScore(precipMm: number, precip3dMm: number, factor: number): number {
  const base =
    precipMm >= 80
      ? 85
      : precipMm >= 50
        ? 65
        : precipMm >= 30
          ? 45
          : precipMm >= 15
            ? 25
            : precipMm >= 5
              ? 10
              : 3;
  const saturation = Math.min(precip3dMm / 10, 20);
  return Math.round(Math.min((base + saturation) * factor, 100) * 10) / 10;
}

/** Flood score for today from the daily forecast (today + next two days as the saturation window). `month` is 1–12 (UTC). */
export function scoreFlood(daily: WeatherDaily, month: number): HazardScore {
  const p = daily.precipitation_sum ?? [];
  const today = num(p[0]);
  const window = num(p[0]) + num(p[1]) + num(p[2]);
  const prob = num(daily.precipitation_probability_max?.[0]);
  const snow = num(daily.snowfall_sum?.[0]);
  const { factor, season } = seasonalFactor(month);
  const score = floodDayScore(today, window, factor);
  const factors: RiskFactor[] = [
    { key: "flood_precip_today", value: Math.round(today * 10) / 10 },
    { key: "flood_precip_3d", value: Math.round(window * 10) / 10 },
    { key: "flood_prob", value: Math.round(prob) },
    { key: `season_${season}` },
  ];
  if (snow > 0) factors.push({ key: "flood_snow", value: Math.round(snow * 10) / 10 });
  return { score, level: riskLevel(score), factors };
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
/** Sample std; returns 1 (not 0) with too little data or no variance, so z-scores never explode to Infinity. */
function sampleStd(v: number[], m: number) {
  if (v.length < 2) return 1;
  const variance = v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(variance) || 1;
}

type DayStats = { count: number; maxMag: number; energy: number };

/**
 * Compares today's activity with the previous 89 UTC days (quiet days count as zeros) using z-scores on
 * event count, max magnitude and energy (10^1.5M). A metric is anomalous above ANOMALY_SIGMA.
 */
export function detectSeismicAnomaly(
  features: UsgsFeature[],
  now: Date = new Date(),
): SeismicAnomaly {
  const days = new Map<string, DayStats>();
  for (const f of features) {
    const t = num(f.properties?.time);
    if (!t) continue;
    const mag = num(f.properties?.mag);
    const key = dayKey(t);
    const d = days.get(key) ?? { count: 0, maxMag: 0, energy: 0 };
    d.count += 1;
    d.maxMag = Math.max(d.maxMag, mag);
    d.energy += 10 ** (1.5 * mag);
    days.set(key, d);
  }
  const empty: DayStats = { count: 0, maxMag: 0, energy: 0 };
  const today = days.get(dayKey(now.getTime())) ?? empty;
  const baseline: DayStats[] = [];
  for (let ago = 89; ago >= 1; ago--)
    baseline.push(days.get(dayKey(now.getTime() - ago * DAY_MS)) ?? empty);

  const specs = [
    { metric: "count", pick: (d: DayStats) => d.count },
    { metric: "magnitude", pick: (d: DayStats) => d.maxMag },
    { metric: "energy", pick: (d: DayStats) => d.energy },
  ] as const;
  const metrics = specs.map(({ metric, pick }) => {
    const values = baseline.map(pick);
    const m = mean(values);
    const s = sampleStd(values, m);
    const todayValue = pick(today);
    const z = (todayValue - m) / s;
    return {
      metric,
      todayValue: Math.round(todayValue * 100) / 100,
      baselineMean: Math.round(m * 100) / 100,
      zScore: Math.round(z * 100) / 100,
      isAnomalous: z > ANOMALY_SIGMA,
    };
  });
  return { isAnomalous: metrics.some((x) => x.isAnomalous), metrics };
}

/** Demo input: a fresh M6.1 mainshock today plus aftershocks, on top of real history. */
export function simulatedQuakeFeatures(now: Date = new Date()): UsgsFeature[] {
  const t = now.getTime();
  const mags = [6.1, 4.8, 4.2, 3.9, 3.6, 3.4, 3.1, 2.9];
  return mags.map((mag, i) => ({ properties: { mag, time: t - i * 20 * 60_000 } }));
}

/** Demo input: a heavy-rain forecast (62 / 48 / 35 mm, 95% probability). */
export function simulatedFloodDaily(): WeatherDaily {
  return {
    precipitation_sum: [62, 48, 35, 10, 4, 2, 0],
    precipitation_probability_max: [95, 90, 80, 50, 30, 20, 10],
    snowfall_sum: [0, 0, 0, 0, 0, 0, 0],
  };
}
