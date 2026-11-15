import { NextResponse } from "next/server";
import { sosCreateSchema } from "@/lib/schemas";
import { createSos } from "@/server/services/sos.service";

export async function POST(req: Request) {
  const body = sosCreateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const row = await createSos(body.data);
    if (!row) return NextResponse.json({ error: "Citizen not found" }, { status: 404 });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send SOS" }, { status: 500 });
  }
}
