import { NextResponse } from "next/server";
import { routeQuerySchema } from "@/lib/schemas";
import { findRoute } from "@/server/services/routing.service";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = routeQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }
  try {
    const route = await findRoute({ lat: parsed.data.lat, lng: parsed.data.lng }, parsed.data.prev, parsed.data.citizenId);
    if (!route) return NextResponse.json({ error: "No reachable shelter" }, { status: 404 });
    return NextResponse.json(route);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to compute route" }, { status: 500 });
  }
}
