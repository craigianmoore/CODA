import { NextResponse } from "next/server";
import { authenticate, publicAdmin, sameOrigin } from "../../../../lib/admin/server";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };

// Checks an admin name + PIN on the server (with the lockout) and returns the
// admin's role and scope. The PIN list itself never leaves the server.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403, headers: NS });
  let body = {};
  try { body = await request.json(); } catch {}
  try {
    const r = await authenticate(body.name, body.pin);
    if (r.error) return NextResponse.json({ error: r.error, ...(r.lockedUntil ? { lockedUntil: r.lockedUntil } : {}) }, { status: r.status, headers: NS });
    return NextResponse.json({ ok: true, admin: publicAdmin(r.admin) }, { headers: NS });
  } catch (e) {
    if (e && e.code === "NOT_CONFIGURED") return NextResponse.json({ error: e.message }, { status: 503, headers: NS });
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: NS });
  }
}
