import { NextResponse } from "next/server";
import { guard } from "@/server/auth";
import { getDashboard } from "@/server/services/dashboard.service";

export async function GET(req: Request) {
  const denied = guard(req, "dashboard.read");
  if (denied) return denied;
  try {
    return NextResponse.json(await getDashboard());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
