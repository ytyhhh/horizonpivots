import { NextRequest, NextResponse } from "next/server";
import { INSTITUTIONS } from "@/data/institutions";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const region = request.nextUrl.searchParams.get("region")?.toUpperCase() ?? "ALL";
  const cursor = Number(request.nextUrl.searchParams.get("cursor") ?? 0);
  const limit = Math.min(20, Number(request.nextUrl.searchParams.get("limit") ?? 20));

  const filtered = INSTITUTIONS.filter((institution) => {
    const matchesRegion = region === "ALL" || institution.region === region;
    const haystack = `${institution.name} ${institution.nameZh} ${institution.shortName} ${institution.city}`.toLowerCase();
    return matchesRegion && (!q || haystack.includes(q));
  });

  return NextResponse.json({
    data: filtered.slice(cursor, cursor + limit),
    nextCursor: cursor + limit < filtered.length ? cursor + limit : null,
    total: filtered.length,
  });
}
