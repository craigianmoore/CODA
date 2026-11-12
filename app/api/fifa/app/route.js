import { requireFifa, adminClient, FIFA_BUCKET } from "../../../../lib/fifa/server";

export const dynamic = "force-dynamic";

// Serves the tracker page itself, only to a signed-in FIFA admin. The page is
// kept in a private storage bucket (not in this public repo).
export async function GET(request) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  const { data, error } = await adminClient().storage.from(FIFA_BUCKET).download("tracker.html");
  if (error || !data) {
    return new Response("<p style='font-family:sans-serif;padding:24px'>The tracker page has not been uploaded yet. Upload <b>tracker.html</b> to the private <b>fifa-mentoring</b> storage bucket in Supabase.</p>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
  const page = await data.text();
  const html = "<!doctype html><html lang=\"en-GB\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>html,body{margin:0}</style><script>window.__FIFA_API__=true;</script></head><body>" + page + "</body></html>";
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
