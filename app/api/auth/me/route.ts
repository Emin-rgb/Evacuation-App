import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";

export async function GET(req: Request) {
  return NextResponse.json({ user: getSession(req) });
}
