import { NextResponse } from "next/server";
import { getFailureMode, trafficProvider } from "@/server/providers/traffic.provider";

export async function GET() {
  try {
    return NextResponse.json({ ...trafficProvider.health(), mode: await getFailureMode() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load provider health" }, { status: 500 });
  }
}
