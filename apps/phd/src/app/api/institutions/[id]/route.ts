import { NextResponse } from "next/server";
import { getInstitution } from "@/data/institutions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const institution = getInstitution(id);
  if (!institution) return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  return NextResponse.json({ data: institution });
}
