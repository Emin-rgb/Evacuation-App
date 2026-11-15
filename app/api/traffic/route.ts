import { NextResponse } from "next/server";
import { trafficProvider } from "@/server/providers/traffic.provider";

export async function GET() {
  try {
    return NextResponse.json(await trafficProvider.getEdges());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load traffic" }, { status: 500 });
  }
}
