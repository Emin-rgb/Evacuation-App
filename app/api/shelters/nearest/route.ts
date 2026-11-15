import { NextResponse } from "next/server";
import { nearestQuerySchema } from "@/lib/schemas";
import { findNearestShelters } from "@/server/services/shelter.service";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = nearestQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }
  try {
    return NextResponse.json(await findNearestShelters(parsed.data));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load shelters" }, { status: 500 });
  }
}
