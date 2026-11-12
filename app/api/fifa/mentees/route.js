import { NextResponse } from "next/server";
import { requireFifa, adminClient } from "../../../../lib/fifa/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  const { data, error } = await adminClient().from("fifa_mentees").select("id,data").eq("owner", g.owner);
  if (error) return NextResponse.json({ error: "Could not load." }, { status: 500 });
  const mentees = {};
  (data || []).forEach((r) => { mentees[r.id] = r.data; });
  return NextResponse.json({ mentees }, { headers: { "Cache-Control": "no-store" } });
}
