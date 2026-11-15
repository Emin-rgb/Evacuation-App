import { NextResponse } from "next/server";
import { riskQuerySchema } from "@/lib/schemas";
import { getRisk } from "@/server/services/risk.service";

export async function GET(req: Request) {
  const q = riskQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await getRisk(q.data.zoneId));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load risk" }, { status: 500 });
  }
}
