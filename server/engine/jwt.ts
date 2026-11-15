import { createHmac, timingSafeEqual } from "node:crypto";

export type JwtPayload = { role: string; iat: number; exp: number };

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

function mac(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest();
}

/** HS256 token. `nowMs` is injectable for tests. */
export function signJwt(role: string, secret: string, ttlSec: number, nowMs = Date.now()): string {
  const iat = Math.floor(nowMs / 1000);
  const body = Buffer.from(JSON.stringify({ role, iat, exp: iat + ttlSec })).toString("base64url");
  const data = `${HEADER}.${body}`;
  return `${data}.${mac(data, secret).toString("base64url")}`;
}

/** Returns the payload, or null for any malformed / tampered / expired token. */
export function verifyJwt(token: string, secret: string, nowMs = Date.now()): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== HEADER) return null; // also rejects alg:none
  const given = Buffer.from(parts[2], "base64url");
  const expected = mac(`${parts[0]}.${parts[1]}`, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof p.role !== "string" || typeof p.exp !== "number" || typeof p.iat !== "number") return null;
    if (p.exp * 1000 <= nowMs) return null;
    return p as JwtPayload;
  } catch {
    return null;
  }
}
