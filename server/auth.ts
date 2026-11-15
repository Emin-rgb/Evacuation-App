import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { signJwt, verifyJwt } from "@/server/engine/jwt";
import { canDo, isRole, type Action, type Role } from "@/server/engine/rbac";

export const SESSION_COOKIE = "dac_session";
export const SESSION_TTL_SEC = 8 * 60 * 60;

const isProd = process.env.NODE_ENV === "production";

// Dev-only defaults so `npm run dev` works without setup; production must set real values.
function secret(): string | null {
  return process.env.JWT_SECRET ?? (isProd ? null : "dev-only-secret");
}
function pins(): Record<Role, string | undefined> {
  return {
    dispatcher: process.env.DISPATCHER_PIN ?? (isProd ? undefined : "2222"),
    viewer: process.env.VIEWER_PIN ?? (isProd ? undefined : "1111"),
  };
}

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time PIN check → role, or null. */
export function roleForPin(pin: string): Role | null {
  const configured = pins();
  for (const role of ["dispatcher", "viewer"] as const) {
    const expected = configured[role];
    if (expected && timingSafeEqual(sha(pin), sha(expected))) return role;
  }
  return null;
}

export function issueToken(role: Role): string | null {
  const s = secret();
  return s ? signJwt(role, s, SESSION_TTL_SEC) : null;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function getSessionRole(req: Request): Role | null {
  const s = secret();
  const token = readCookie(req, SESSION_COOKIE);
  if (!s || !token) return null;
  const p = verifyJwt(token, s);
  return p && isRole(p.role) ? p.role : null;
}

/** Returns an error response (401 / 403) or null when the caller may proceed. */
export function guard(req: Request, action: Action): NextResponse | null {
  if (!secret()) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  const role = getSessionRole(req);
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDo(role, action)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
