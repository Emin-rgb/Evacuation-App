import { NextResponse } from "next/server";
import { signJwt, verifyJwt } from "@/server/engine/jwt";
import { canDo, isRole, type Action } from "@/server/engine/rbac";
import type { SessionUser } from "@/server/services/user.service";

export const SESSION_COOKIE = "dac_session";
export const SESSION_TTL_SEC = 8 * 60 * 60;

const isProd = process.env.NODE_ENV === "production";

// Dev-only fallback so `npm run dev` works without setup; production must set JWT_SECRET.
function secret(): string | null {
  return process.env.JWT_SECRET ?? (isProd ? null : "dev-only-secret");
}

export function issueToken(user: SessionUser): string | null {
  const s = secret();
  return s ? signJwt({ sub: user.id, name: user.name, role: user.role }, s, SESSION_TTL_SEC) : null;
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

export function getSession(req: Request): SessionUser | null {
  const s = secret();
  const token = readCookie(req, SESSION_COOKIE);
  if (!s || !token) return null;
  const p = verifyJwt(token, s);
  return p && isRole(p.role) ? { id: p.sub, name: p.name, role: p.role } : null;
}

/** Returns an error response (401 / 403) or null when the caller may proceed. */
export function guard(req: Request, action: Action): NextResponse | null {
  if (!secret()) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  const user = getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDo(user.role, action)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
