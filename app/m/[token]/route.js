import { resolveShare } from "../../../lib/fifa/share";
import { renderMenteePage, renderUnavailable } from "../../../lib/fifa/menteeView";

export const dynamic = "force-dynamic";
const HEAD = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

export async function GET(_request, { params }) {
  const { token } = await params;
  let r = null;
  try { r = await resolveShare(token); } catch {}
  if (!r) return new Response(renderUnavailable(), { status: 404, headers: HEAD });
  return new Response(renderMenteePage(r.data, { updatedAt: r.updatedAt }), { headers: HEAD });
}
