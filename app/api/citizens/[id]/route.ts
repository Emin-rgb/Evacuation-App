import { NextResponse } from "next/server";
import { citizenPatchSchema, idParamSchema } from "@/lib/schemas";
import { updateCitizen } from "@/server/services/citizen.service";

export async function PATCH(req: Request, ctx: RouteContext<"/api/citizens/[id]">) {
  const id = idParamSchema.safeParse(await ctx.params);
  const body = citizenPatchSchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const row = await updateCitizen(id.data.id, body.data);
    if (!row) return NextResponse.json({ error: "Citizen not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update citizen" }, { status: 500 });
  }
}
