import { NextResponse } from "next/server";
import { listZones } from "@/server/services/zone.service";

export async function GET() {
  try {
    return NextResponse.json(await listZones());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load zones" }, { status: 500 });
  }
}
