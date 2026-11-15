import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { SESSION_COOKIE, SESSION_TTL_SEC, clientIp, issueToken, roleForPin } from "@/server/auth";
import { RateLimiter } from "@/server/engine/rate-limit";

const limiter = new RateLimiter();

export async function POST(req: Request) {
  const rate = limiter.allow(`login:${clientIp(req)}`, 5, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many attempts" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }
  const body = loginSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const role = roleForPin(body.data.pin);
  if (!role) return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  const token = issueToken(role);
  if (!token) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  const res = NextResponse.json({ role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
  return res;
}
