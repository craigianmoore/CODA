import { NextResponse } from "next/server";
import { adminClient, authenticate, applySettingsChange, loadPrivateSettings, kvSet, toDirectory, sameOrigin } from "../../../../lib/admin/server";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };

// Saves a change to the admin list / PINs / slots. The caller proves who they
// are with name + PIN in the same request, and the server decides whether that
// admin is allowed to make the change. Nothing in the body is trusted for PINs
// except brand-new ones in `pins`.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403, headers: NS });
  let body = {};
  try { body = await request.json(); } catch {}
  try {
    const a = await authenticate(body.name, body.pin);
    if (a.error) return NextResponse.json({ error: a.error }, { status: a.status, headers: NS });
    const sb = adminClient();
    const stored = await loadPrivateSettings(sb);
    const r = applySettingsChange(a.admin, stored, body.settings, body.pins);
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status, headers: NS });
    await kvSet(sb, "adminSettings", r.settings);
    return NextResponse.json({ ok: true, settings: toDirectory(r.settings) }, { headers: NS });
  } catch (e) {
    if (e && e.code === "NOT_CONFIGURED") return NextResponse.json({ error: e.message }, { status: 503, headers: NS });
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: NS });
  }
}
