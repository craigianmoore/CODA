import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireFifa, adminClient, FIFA_BUCKET, docPrefix } from "../../../../../lib/fifa/server";

export const dynamic = "force-dynamic";
const ID = /^[A-Za-z0-9_-]{1,64}$/;
// Vercel functions reject request bodies over ~4.5 MB, so stay under that.
const MAX_BYTES = 4 * 1024 * 1024;


// Upload one PDF for a mentee. Body is the raw PDF; the original file name
// comes in the x-filename header. The file is kept in the private bucket and
// only served back through this signed-in route.
export async function POST(request, { params }) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const sb = adminClient();
  const { data: row } = await sb.from("fifa_mentees").select("id").eq("owner", g.owner).eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Save the mentee first, then add the PDF." }, { status: 404 });
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: "Empty file." }, { status: 400 });
  if (buf.length > MAX_BYTES) return NextResponse.json({ error: "That PDF is over 4 MB." }, { status: 413 });
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") return NextResponse.json({ error: "That does not look like a PDF." }, { status: 400 });
  let name = "document.pdf";
  try { name = decodeURIComponent(request.headers.get("x-filename") || name); } catch {}
  name = name.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").slice(0, 120) || "document.pdf";
  const doc = "d_" + randomBytes(5).toString("hex");
  const { error } = await sb.storage.from(FIFA_BUCKET).upload(docPrefix(g.owner, id) + "/" + doc + ".pdf", buf, { contentType: "application/pdf", upsert: false });
  if (error) return NextResponse.json({ error: "Could not store the PDF." }, { status: 500 });
  return NextResponse.json({ id: doc, name, size: buf.length, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
