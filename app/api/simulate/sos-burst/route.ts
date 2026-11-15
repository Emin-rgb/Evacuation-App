import { NextResponse } from "next/server";
import { guard } from "@/server/auth";
import { sosBurstSchema } from "@/lib/schemas";
import { createSosBurst } from "@/server/services/simulator.service";

export async function POST(req: Request) {
  const denied = guard(req, "simulate");
  if (denied) return denied;
  const body = sosBurstSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await createSosBurst(body.data), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to simulate SOS burst" }, { status: 500 });
  }
}
