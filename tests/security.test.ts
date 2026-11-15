import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "@/server/engine/rate-limit";
import { signJwt, verifyJwt } from "@/server/engine/jwt";
import { canDo } from "@/server/engine/rbac";
import { isDuplicateSos, SOS_DUPLICATE_WINDOW_MS } from "@/server/engine/sos-guard";

test("rate limiter blocks over the limit and resets after the window", () => {
  let t = 1000;
  const rl = new RateLimiter(() => t);
  assert.equal(rl.allow("a", 2, 60_000).ok, true);
  assert.equal(rl.allow("a", 2, 60_000).ok, true);
  const blocked = rl.allow("a", 2, 60_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterMs, 60_000);
  assert.equal(rl.allow("b", 2, 60_000).ok, true, "keys are independent");
  t += 60_000;
  assert.equal(rl.allow("a", 2, 60_000).ok, true);
});

test("jwt: valid, tampered, wrong secret, expired, alg none", () => {
  const now = 1_700_000_000_000;
  const tok = signJwt("dispatcher", "s3cret", 60, now);
  assert.equal(verifyJwt(tok, "s3cret", now + 1000)?.role, "dispatcher");
  assert.equal(verifyJwt(tok, "other", now + 1000), null);
  assert.equal(verifyJwt(tok, "s3cret", now + 61_000), null, "expired");
  const [h, , s] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ role: "dispatcher", iat: 1, exp: 9_999_999_999 })).toString("base64url");
  assert.equal(verifyJwt(`${h}.${forged}.${s}`, "s3cret", now), null, "tampered payload");
  const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  assert.equal(verifyJwt(`${none}.${forged}.`, "s3cret", now), null, "alg none");
  assert.equal(verifyJwt("garbage", "s3cret", now), null);
});

test("rbac matrix", () => {
  assert.equal(canDo("viewer", "dashboard.read"), true);
  for (const a of ["alert.decide", "simulate", "road.write", "shelter.write"] as const) {
    assert.equal(canDo("viewer", a), false);
    assert.equal(canDo("dispatcher", a), true);
  }
});

test("duplicate SOS: fresh unresolved is a duplicate, old or resolved is not", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  assert.equal(isDuplicateSos([{ createdAt: ago(60_000), status: "new" }], now), true);
  assert.equal(isDuplicateSos([{ createdAt: ago(SOS_DUPLICATE_WINDOW_MS + 1), status: "new" }], now), false);
  assert.equal(isDuplicateSos([{ createdAt: ago(1000), status: "resolved" }], now), false);
  assert.equal(isDuplicateSos([], now), false);
});
