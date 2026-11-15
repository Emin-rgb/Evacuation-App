import { NextResponse } from "next/server";
import { idParamSchema } from "@/lib/schemas";
import { dismissAlert } from "@/server/services/alert.service";

export async function POST(_req: Request, ctx: RouteContext<"/api/alerts/[id]/dismiss">) {
  const id = idParamSchema.safeParse(await ctx.params);
  if (!id.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const res = await dismissAlert(id.data.id);
    if (res === "not_found") return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    if (res === "not_open") return NextResponse.json({ error: "Alert already handled" }, { status: 409 });
    return NextResponse.json(res);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to dismiss alert" }, { status: 500 });
  }
}
