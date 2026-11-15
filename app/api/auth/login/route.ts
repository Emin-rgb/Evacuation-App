import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { SESSION_COOKIE, SESSION_TTL_SEC, clientIp, issueToken } from "@/server/auth";
import { RateLimiter } from "@/server/engine/rate-limit";
import { verifyLogin } from "@/server/services/user.service";

const limiter = new RateLimiter();

function tooMany(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many attempts" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } },
  );
}

export async function POST(req: Request) {
  const byIp = limiter.allow(`login-ip:${clientIp(req)}`, 10, 60_000);
  if (!byIp.ok) return tooMany(byIp.retryAfterMs);
  const body = loginSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const byEmail = limiter.allow(`login-email:${body.data.email}`, 10, 60_000);
  if (!byEmail.ok) return tooMany(byEmail.retryAfterMs);

  try {
    const result = await verifyLogin(body.data.email, body.data.password);
    if (!result.ok && result.reason === "locked") {
      return NextResponse.json(
        { error: "Account locked", retryAfterSec: result.retryAfterSec },
        { status: 423, headers: { "Retry-After": String(result.retryAfterSec) } },
      );
    }
    if (!result.ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
    const token = issueToken(result.user);
    if (!token) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
    const res = NextResponse.json({ user: result.user });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SEC,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
