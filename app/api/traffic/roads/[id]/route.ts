import { NextResponse } from "next/server";
import { guard } from "@/server/auth";
import { idParamSchema, roadPatchSchema } from "@/lib/schemas";
import { setRoadStatus } from "@/server/services/simulator.service";

export async function PATCH(req: Request, ctx: RouteContext<"/api/traffic/roads/[id]">) {
  const denied = guard(req, "road.write");
  if (denied) return denied;
  const id = idParamSchema.safeParse(await ctx.params);
  const body = roadPatchSchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const road = await setRoadStatus(id.data.id, body.data.status);
    if (!road) return NextResponse.json({ error: "Road not found" }, { status: 404 });
    return NextResponse.json(road);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update road" }, { status: 500 });
  }
}
