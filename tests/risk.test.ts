import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  FULL_PCT_DEFAULT,
  FULL_PCT_FLOOD,
  detectSeismicAnomaly,
  floodDayScore,
  fullPctFor,
  riskLevel,
  scoreEarthquake,
  scoreFlood,
  seasonalFactor,
  simulatedFloodDaily,
  simulatedQuakeFeatures,
  type UsgsFeature,
} from "@/server/engine/risk";
import { pickShelter } from "@/server/engine/routing";

const NOW = new Date("2026-11-15T12:00:00Z");
const quake = (mag: number, daysAgo: number): UsgsFeature => ({
  properties: { mag, time: NOW.getTime() - daysAgo * DAY_MS },
});

test("riskLevel thresholds", () => {
  assert.deepEqual([0, 10, 25, 50, 70].map(riskLevel), [
    "minimal",
    "low",
    "moderate",
    "high",
    "critical",
  ]);
  assert.equal(riskLevel(9.9), "minimal");
});

test("earthquake: no events gives the baseline score", () => {
  const r = scoreEarthquake([], NOW);
  assert.equal(r.score, 5);
  assert.equal(r.level, "minimal");
});

test("earthquake: recent events count double, old ones (>30d) are ignored", () => {
  assert.equal(scoreEarthquake([quake(4.5, 20)], NOW).score, 10);
  assert.equal(scoreEarthquake([quake(4.5, 2)], NOW).score, 20);
  assert.equal(scoreEarthquake([quake(6, 60)], NOW).score, 5);
  assert.equal(scoreEarthquake([quake(6.2, 1), quake(5.1, 1)], NOW).score, 100); // capped
});

test("earthquake: M5+ adds the aftershock factor", () => {
  assert.ok(scoreEarthquake([quake(5.2, 3)], NOW).factors.some((f) => f.key === "eq_aftershock"));
  assert.ok(!scoreEarthquake([quake(4.2, 3)], NOW).factors.some((f) => f.key === "eq_aftershock"));
});

test("seasonal factor peaks in April, is low in summer", () => {
  assert.equal(seasonalFactor(4).factor, 1.7);
  assert.equal(seasonalFactor(7).season, "summer");
  assert.equal(seasonalFactor(11).season, "autumn");
});

test("flood: bands, saturation bonus and cap", () => {
  assert.equal(floodDayScore(0, 0, 1), 3);
  assert.equal(floodDayScore(20, 0, 1), 25);
  assert.equal(floodDayScore(20, 100, 1), 35); // +10 saturation
  assert.equal(floodDayScore(90, 500, 1.7), 100); // capped
});

test("flood: a dry day is minimal, heavy rain is elevated", () => {
  const dry = scoreFlood({ precipitation_sum: [0, 0, 0], precipitation_probability_max: [5] }, 11);
  assert.equal(dry.level, "minimal");
  const wet = scoreFlood(simulatedFloodDaily(), 11);
  assert.ok(wet.level === "high" || wet.level === "critical");
  assert.ok(scoreFlood({ snowfall_sum: [3] }, 3).factors.some((f) => f.key === "flood_snow"));
});

test("flood: missing / null forecast values do not crash", () => {
  assert.equal(scoreFlood({}, 5).level, "minimal");
  assert.equal(
    scoreFlood({ precipitation_sum: [null, null] }, 5).score,
    Math.round(3 * 1.5 * 10) / 10,
  );
});

test("anomaly: a quiet history with a normal day is not anomalous", () => {
  const history = Array.from({ length: 30 }, (_, i) => quake(2.5, i + 1));
  const r = detectSeismicAnomaly([...history, quake(2.5, 0)], NOW);
  assert.equal(r.isAnomalous, false);
  assert.equal(r.metrics.length, 3);
});

test("anomaly: a big burst today is flagged on count, magnitude and energy", () => {
  const history = Array.from({ length: 40 }, (_, i) => quake(2 + (i % 3) * 0.3, i + 1));
  const burst = Array.from({ length: 15 }, () => quake(5.8, 0));
  const r = detectSeismicAnomaly([...history, ...burst], NOW);
  assert.equal(r.isAnomalous, true);
  assert.ok(r.metrics.every((m) => m.isAnomalous));
});

test("anomaly: no data at all never gives NaN or Infinity", () => {
  const r = detectSeismicAnomaly([], NOW);
  assert.equal(r.isAnomalous, false);
  assert.ok(r.metrics.every((m) => Number.isFinite(m.zScore)));
});

test("anomaly: uses UTC days (an event at 23:30 UTC yesterday is not today)", () => {
  const lateYesterday: UsgsFeature = {
    properties: { mag: 6, time: new Date("2026-11-14T23:30:00Z").getTime() },
  };
  const r = detectSeismicAnomaly([lateYesterday], NOW);
  assert.equal(r.metrics[0].todayValue, 0);
});

test("simulated quake is clearly anomalous and critical", () => {
  const f = simulatedQuakeFeatures(NOW);
  assert.equal(detectSeismicAnomaly(f, NOW).isAnomalous, true);
  assert.ok(scoreEarthquake(f, NOW).score >= 70);
});

test("20.6: reroute threshold drops to 80% only while flood risk is high/critical", () => {
  assert.equal(fullPctFor("high"), FULL_PCT_FLOOD);
  assert.equal(fullPctFor("critical"), FULL_PCT_FLOOD);
  for (const l of ["moderate", "low", "minimal", null, undefined] as const)
    assert.equal(fullPctFor(l), FULL_PCT_DEFAULT);
});

test("20.6: a shelter at 85% is usable normally but skipped under flood risk", () => {
  const near = { id: "near", nodeId: "a", capacity: 100, occupancy: 85 };
  const far = { id: "far", nodeId: "b", capacity: 100, occupancy: 10 };
  const dist = new Map([
    ["a", 1],
    ["b", 5],
  ]);
  const cost = (_s: unknown, d: number) => d;
  assert.equal(pickShelter([near, far], dist, cost)?.shelter.id, "near");
  assert.equal(
    pickShelter([near, far], dist, cost, { fullPct: fullPctFor("high") })?.shelter.id,
    "far",
  );
});
