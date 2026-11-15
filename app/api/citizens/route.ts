import { NextResponse } from "next/server";
import { citizenCreateSchema } from "@/lib/schemas";
import { createCitizen } from "@/server/services/citizen.service";

export async function POST(req: Request) {
  const body = citizenCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await createCitizen(body.data), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create citizen" }, { status: 500 });
  }
}
