import { NextResponse } from "next/server";
import { getSessionRole } from "@/server/auth";

export async function GET(req: Request) {
  return NextResponse.json({ role: getSessionRole(req) });
}
