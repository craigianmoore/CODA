import { requireFifa, adminClient, FIFA_BUCKET } from "../../../../../lib/fifa/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  const { n } = await params;
  if (!/^[1-5]$/.test(n)) return new Response("Not found", { status: 404 });
  const { data, error } = await adminClient().storage.from(FIFA_BUCKET).download(`meeting-${n}.pdf`);
  if (error || !data) return new Response("That toolkit PDF has not been uploaded yet.", { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Mentoring_Toolkit_Meeting_${n}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
