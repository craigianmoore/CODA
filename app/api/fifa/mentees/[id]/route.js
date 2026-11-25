import { NextResponse } from "next/server";
import { requireFifa, adminClient, FIFA_BUCKET, docPrefix, resolveMentee } from "../../../../../lib/fifa/server";

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
  // Who is saving: the owner, or someone this mentee was shared with (edit only).
  const ownerParam = new URL(request.url).searchParams.get("owner");
  const sb = adminClient();
  const own = await resolveMentee(g, id, null);
  let owner = g.owner;
  let prev = own && own.row;
  if (ownerParam && ownerParam !== g.owner) {
    const r = await resolveMentee(g, id, ownerParam);
    if (!r || r.perm !== "edit") return NextResponse.json({ error: "You can view this mentee but not change it." }, { status: 403 });
    owner = r.owner; prev = r.row;
  }
  // The share list and owner label are managed only by the share route, never by a save.
  delete data.sharedWith; delete data.ownerName;
  if (prev && prev.data) {
    if (Array.isArray(prev.data.sharedWith)) data.sharedWith = prev.data.sharedWith;
    if (prev.data.ownerName) data.ownerName = prev.data.ownerName;
  }
  const { error } = await sb.from("fifa_mentees").upsert({ owner, id, data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request, { params }) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const sb = adminClient();
  // Only the owner can delete a mentee; people it was shared with cannot.
  const { error } = await sb.from("fifa_mentees").delete().eq("owner", g.owner).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  // Also remove any PDFs kept for this mentee (best effort).
  try {
    const dir = docPrefix(g.owner, id);
    const { data: files } = await sb.storage.from(FIFA_BUCKET).list(dir);
    if (files && files.length) await sb.storage.from(FIFA_BUCKET).remove(files.map((f) => dir + "/" + f.name));
  } catch {}
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
