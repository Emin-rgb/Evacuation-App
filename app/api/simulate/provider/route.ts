import { NextResponse } from "next/server";
import { guard } from "@/server/auth";
import { providerModeSchema } from "@/lib/schemas";
import { setFailureMode } from "@/server/providers/traffic.provider";

export async function PATCH(req: Request) {
  const denied = guard(req, "simulate");
  if (denied) return denied;
  const body = providerModeSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    await setFailureMode(body.data.mode);
    return NextResponse.json({ mode: body.data.mode });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to set provider mode" }, { status: 500 });
  }
}
