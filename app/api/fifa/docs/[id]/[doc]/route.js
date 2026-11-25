import { NextResponse } from "next/server";
import { requireFifa, adminClient, FIFA_BUCKET, docPrefix } from "../../../../../../lib/fifa/server";

export const dynamic = "force-dynamic";
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DOC = /^d_[a-f0-9]{10}$/;

export async function GET(request, { params }) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  const { id, doc } = await params;
  if (!ID.test(id) || !DOC.test(doc)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const { data, error } = await adminClient().storage.from(FIFA_BUCKET).download(docPrefix(g.owner, id) + "/" + doc + ".pdf");
  if (error || !data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const name = new URL(request.url).searchParams.get("name") || "document.pdf";
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(name.replace(/[\u0000-\u001f"\\]/g, "_").slice(0, 120)),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request, { params }) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  const { id, doc } = await params;
  if (!ID.test(id) || !DOC.test(doc)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const { error } = await adminClient().storage.from(FIFA_BUCKET).remove([docPrefix(g.owner, id) + "/" + doc + ".pdf"]);
  if (error) return NextResponse.json({ error: "Could not remove the PDF." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
