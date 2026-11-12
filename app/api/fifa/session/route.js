import { NextResponse } from "next/server";
import { requireFifa, FIFA_COOKIE, cookieOptions } from "../../../../lib/fifa/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  return NextResponse.json({ ok: true, name: g.name }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FIFA_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return res;
}
