import { NextResponse } from "next/server";
import { requireFifa, adminClient } from "../../../../../lib/fifa/server";

export const dynamic = "force-dynamic";
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BYTES = 256 * 1024;

export async function PUT(request, { params }) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const text = await request.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: "Too large." }, { status: 413 });
  let data;
  try { data = JSON.parse(text); } catch { return NextResponse.json({ error: "Bad JSON." }, { status: 400 }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "Bad body." }, { status: 400 });
  const { error } = await adminClient().from("fifa_mentees").upsert({ owner: g.owner, id, data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request, { params }) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const { error } = await adminClient().from("fifa_mentees").delete().eq("owner", g.owner).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
