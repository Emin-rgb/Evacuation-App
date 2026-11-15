import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "@/server/engine/password";
import { afterFailure, isLocked, LOCK_AFTER_FAILURES, LOCK_MS } from "@/server/engine/lockout";
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
  const tok = signJwt({ sub: "u1", name: "Nigar", role: "dispatcher" }, "s3cret", 60, now);
  const ok = verifyJwt(tok, "s3cret", now + 1000);
  assert.equal(ok?.role, "dispatcher");
  assert.equal(ok?.sub, "u1");
  assert.equal(ok?.name, "Nigar");
  assert.equal(verifyJwt(tok, "other", now + 1000), null);
  assert.equal(verifyJwt(tok, "s3cret", now + 61_000), null, "expired");
  const [h, , s] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "u1", name: "x", role: "dispatcher", iat: 1, exp: 9_999_999_999 })).toString("base64url");
  assert.equal(verifyJwt(`${h}.${forged}.${s}`, "s3cret", now), null, "tampered payload");
  const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  assert.equal(verifyJwt(`${none}.${forged}.`, "s3cret", now), null, "alg none");
  assert.equal(verifyJwt("garbage", "s3cret", now), null);
});

test("rbac matrix", () => {
  assert.equal(canDo("supervisor", "dashboard.read"), true);
  for (const a of ["alert.decide", "simulate", "road.write", "shelter.write"] as const) {
    assert.equal(canDo("supervisor", a), false);
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

test("password: right, wrong, salted, tampered", async () => {
  const h1 = await hashPassword("dispatcher123");
  const h2 = await hashPassword("dispatcher123");
  assert.notEqual(h1, h2, "random salt");
  assert.equal(await verifyPassword("dispatcher123", h1), true);
  assert.equal(await verifyPassword("wrong", h1), false);
  assert.equal(await verifyPassword("dispatcher123", "scrypt$AAAA$BBBB"), false);
  assert.equal(await verifyPassword("dispatcher123", "plaintext"), false);
});

test("lockout: counts failures, locks on the 5th, lock expires", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  let state = { failedAttempts: 0, lockedUntil: null as Date | null };
  for (let i = 1; i < LOCK_AFTER_FAILURES; i++) {
    state = afterFailure(state.failedAttempts, now);
    assert.equal(state.lockedUntil, null);
    assert.equal(state.failedAttempts, i);
  }
  state = afterFailure(state.failedAttempts, now);
  assert.equal(isLocked(state.lockedUntil, now), true);
  assert.equal(state.failedAttempts, 0);
  assert.equal(isLocked(state.lockedUntil, new Date(now.getTime() + LOCK_MS + 1)), false);
  assert.equal(isLocked(null, now), false);
});
