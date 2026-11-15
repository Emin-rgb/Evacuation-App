import { NextResponse } from "next/server";
import { riskSimulationSchema } from "@/lib/schemas";
import { setRiskSimulation } from "@/server/services/risk.service";

export async function PATCH(req: Request) {
  const body = riskSimulationSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    await setRiskSimulation(body.data.mode);
    return NextResponse.json({ mode: body.data.mode });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to set risk simulation" }, { status: 500 });
  }
}
