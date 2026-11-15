import { after, NextResponse } from "next/server";
import { sosCreateSchema } from "@/lib/schemas";
import { clientIp } from "@/server/auth";
import { RateLimiter } from "@/server/engine/rate-limit";
import { SOS_LIMITS } from "@/server/engine/sos-guard";
import { runDetectionCoalesced } from "@/server/services/alert.service";
import { createSos } from "@/server/services/sos.service";

const limiter = new RateLimiter();

function tooMany(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } },
  );
}

export async function POST(req: Request) {
  // Cheapest checks first: a flood is rejected before parsing the body or touching the DB.
  const ip = limiter.allow(`ip:${clientIp(req)}`, SOS_LIMITS.perIp.limit, SOS_LIMITS.perIp.windowMs);
  if (!ip.ok) return tooMany(ip.retryAfterMs);

  const body = sosCreateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const who = limiter.allow(
    `citizen:${body.data.citizenId}`,
    SOS_LIMITS.perCitizen.limit,
    SOS_LIMITS.perCitizen.windowMs,
  );
  if (!who.ok) return tooMany(who.retryAfterMs);

  try {
    const row = await createSos(body.data);
    if (!row) return NextResponse.json({ error: "Citizen not found" }, { status: 404 });
    if (!row.duplicate) after(runDetectionCoalesced); // off the response path: keeps latency flat under flood
    return NextResponse.json(row, { status: row.duplicate ? 200 : 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send SOS" }, { status: 500 });
  }
}
