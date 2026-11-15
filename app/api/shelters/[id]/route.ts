import { NextResponse } from "next/server";
import { guard } from "@/server/auth";
import { idParamSchema, shelterPatchSchema } from "@/lib/schemas";
import { setShelterOccupancy } from "@/server/services/simulator.service";

export async function PATCH(req: Request, ctx: RouteContext<"/api/shelters/[id]">) {
  const denied = guard(req, "shelter.write");
  if (denied) return denied;
  const id = idParamSchema.safeParse(await ctx.params);
  const body = shelterPatchSchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const shelter = await setShelterOccupancy(id.data.id, body.data.occupancy);
    if (!shelter) return NextResponse.json({ error: "Shelter not found" }, { status: 404 });
    return NextResponse.json(shelter);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update shelter" }, { status: 500 });
  }
}
