import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineM, nearestNode } from "@/server/engine/geo";

test("haversine of identical points is 0", () => {
  assert.equal(haversineM({ lat: 40.4, lng: 49.8 }, { lat: 40.4, lng: 49.8 }), 0);
});

test("haversine: 1 degree of latitude is about 111 km", () => {
  const d = haversineM({ lat: 40, lng: 49 }, { lat: 41, lng: 49 });
  assert.ok(Math.abs(d - 111_195) < 300);
});

test("haversine is symmetric", () => {
  const a = { lat: 40.41, lng: 49.87 };
  const b = { lat: 40.38, lng: 49.84 };
  assert.equal(haversineM(a, b), haversineM(b, a));
});

test("nearestNode picks the closest node", () => {
  const nodes = [
    { id: "far", lat: 40.5, lng: 49.9 },
    { id: "near", lat: 40.401, lng: 49.801 },
  ];
  assert.equal(nearestNode({ lat: 40.4, lng: 49.8 }, nodes)?.id, "near");
});

test("nearestNode returns null for an empty list", () => {
  assert.equal(nearestNode({ lat: 0, lng: 0 }, []), null);
});
