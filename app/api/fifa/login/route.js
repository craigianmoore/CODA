import { NextResponse } from "next/server";
import { verifyCredentials, makeSessionToken, cookieOptions, FIFA_COOKIE } from "../../../../lib/fifa/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    let oh = "";
    try { oh = new URL(origin).host; } catch {}
    if (oh !== request.headers.get("host")) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403 });
  }
  let body = {};
  try { body = await request.json(); } catch {}
  try {
    const r = await verifyCredentials(body.name, body.pin);
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status, headers: { "Cache-Control": "no-store" } });
    const res = NextResponse.json({ ok: true, name: r.admin.name }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(FIFA_COOKIE, makeSessionToken(r.admin), cookieOptions());
    return res;
  } catch (e) {
    if (e && e.code === "NOT_CONFIGURED") return NextResponse.json({ error: e.message }, { status: 503 });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
