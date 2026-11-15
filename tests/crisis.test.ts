import { test } from "node:test";
import assert from "node:assert/strict";
import { detectAlerts, type CrisisShelter, type CrisisSos } from "@/server/engine/crisis";

const now = new Date("2026-01-01T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);

const sos = (citizenId: string, o: Partial<CrisisSos> = {}): CrisisSos => ({
  citizenId,
  zoneId: "z1",
  lat: 40.4093,
  lng: 49.8671,
  createdAt: ago(1),
  status: "new",
  ...o,
});
const run = (list: CrisisSos[], shelters: CrisisShelter[] = [], openAlerts = []) =>
  detectAlerts({ sos: list, shelters, openAlerts, now });
const clusters = (r: ReturnType<typeof run>) => r.filter((a) => a.kind === "sos_cluster");

test("cluster fires with 4 distinct citizens within 500 m / 5 min", () => {
  const r = clusters(run(["a", "b", "c", "d"].map((c) => sos(c))));
  assert.equal(r.length, 1);
  assert.equal(r[0].sosCount, 4);
});

test("cluster does not fire with 3 citizens", () => {
  assert.equal(clusters(run(["a", "b", "c"].map((c) => sos(c)))).length, 0);
});

test("cluster does not fire with 4 signals from the same citizen", () => {
  assert.equal(clusters(run([sos("a"), sos("a"), sos("a"), sos("a")])).length, 0);
});

test("cluster ignores signals older than 5 min", () => {
  const list = ["a", "b", "c"].map((c) => sos(c));
  list.push(sos("d", { createdAt: ago(6) }));
  assert.equal(clusters(run(list)).length, 0);
});

test("cluster ignores signals farther than 500 m", () => {
  const list = ["a", "b", "c"].map((c) => sos(c));
  list.push(sos("d", { lat: 40.4093 + 0.01 })); // ~1.1 km north
  assert.equal(clusters(run(list)).length, 0);
});

const shelter = (occupancy: number): CrisisShelter => ({
  id: "s1",
  name: "School 12",
  zoneId: "z1",
  capacity: 100,
  occupancy,
  isActive: true,
});

test("overload fires above 95% only", () => {
  assert.equal(run([], [shelter(96)]).length, 1);
  assert.equal(run([], [shelter(95)]).length, 0);
});

test("overload does not duplicate an open alert", () => {
  const open = [{ kind: "shelter_overload" as const, zoneId: "z1", shelterId: "s1" }];
  assert.equal(run([], [shelter(99)], open as never).length, 0);
});

test("cluster ignores resolved signals", () => {
  const list = ["a", "b", "c"].map((c) => sos(c));
  list.push(sos("d", { status: "resolved" }));
  assert.equal(clusters(run(list)).length, 0);
});

test("cluster counts a signal exactly at the 5 min boundary", () => {
  const list = ["a", "b", "c"].map((c) => sos(c));
  list.push(sos("d", { createdAt: ago(5) }));
  assert.equal(clusters(run(list)).length, 1);
});

test("cluster does not fire when an open alert exists for the zone", () => {
  const open = [{ kind: "sos_cluster" as const, zoneId: "z1", shelterId: null }];
  assert.equal(clusters(run(["a", "b", "c", "d"].map((c) => sos(c)), [], open as never)).length, 0);
});

test("cluster is per zone", () => {
  const list = [...["a", "b", "c", "d"].map((c) => sos(c, { zoneId: "z2" })), sos("e", { lat: 40.5 })];
  const r = clusters(run(list));
  assert.equal(r.length, 1);
  assert.equal(r[0].zoneId, "z2");
});

test("cluster counts duplicates from one citizen once", () => {
  const list = [sos("a"), sos("a"), sos("b"), sos("c"), sos("d")];
  assert.equal(clusters(run(list))[0].sosCount, 4);
});

test("overload ignores inactive shelters", () => {
  assert.equal(run([], [{ ...shelter(99), isActive: false }]).length, 0);
});

test("overload ignores zero-capacity shelters", () => {
  assert.equal(run([], [{ ...shelter(5), capacity: 0 }]).length, 0);
});

test("overload alert carries shelter id, zone and percentage", () => {
  const [a] = run([], [shelter(98)]);
  assert.equal(a.kind, "shelter_overload");
  assert.equal(a.shelterId, "s1");
  assert.equal(a.zoneId, "z1");
  assert.match(a.message, /98%/);
});

test("overload fires for another shelter when only one has an open alert", () => {
  const open = [{ kind: "shelter_overload" as const, zoneId: "z1", shelterId: "s1" }];
  const r = run([], [shelter(99), { ...shelter(99), id: "s2" }], open as never);
  assert.equal(r.length, 1);
  assert.equal(r[0].shelterId, "s2");
});
