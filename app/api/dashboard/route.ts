import { NextResponse } from "next/server";
import { getDashboard } from "@/server/services/dashboard.service";

export async function GET() {
  try {
    return NextResponse.json(await getDashboard());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
