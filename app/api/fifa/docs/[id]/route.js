import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireFifa, adminClient, FIFA_BUCKET, docPrefix, resolveMentee } from "../../../../../lib/fifa/server";

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
  const r = await resolveMentee(g, id, new URL(request.url).searchParams.get("owner"));
  if (!r) return NextResponse.json({ error: "Save the mentee first, then add the file." }, { status: 404 });
  if (r.perm === "view") return NextResponse.json({ error: "You can view this mentee but not change it." }, { status: 403 });
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: "Empty file." }, { status: 400 });
  if (buf.length > MAX_BYTES) return NextResponse.json({ error: "That file is over 4 MB." }, { status: 413 });
  let name = "document";
  try { name = decodeURIComponent(request.headers.get("x-filename") || name); } catch {}
  name = name.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").slice(0, 120) || "document";
  // PDF (starts %PDF-) or Word .docx (a zip, starts PK\x03\x04, and named .docx).
  const isPdf = buf.subarray(0, 5).toString("latin1") === "%PDF-";
  const isDocx = !isPdf && buf.subarray(0, 4).toString("latin1") === "PK\u0003\u0004" && /\.docx$/i.test(name);
  if (!isPdf && !isDocx) return NextResponse.json({ error: "Please add a PDF or a Word (.docx) file." }, { status: 400 });
  const ext = isPdf ? "pdf" : "docx";
  const doc = "d_" + randomBytes(5).toString("hex");
  const { error } = await sb.storage.from(FIFA_BUCKET).upload(docPrefix(r.owner, id) + "/" + doc + "." + ext, buf, { contentType: isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: false });
  if (error) return NextResponse.json({ error: "Could not store the file." }, { status: 500 });
  return NextResponse.json({ id: doc, name, size: buf.length, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
