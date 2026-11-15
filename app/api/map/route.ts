import { NextResponse } from "next/server";
import { getMapData } from "@/server/services/map.service";

export async function GET() {
  try {
    return NextResponse.json(await getMapData());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load map" }, { status: 500 });
  }
}
