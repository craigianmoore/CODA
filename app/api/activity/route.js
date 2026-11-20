import { NextResponse } from "next/server";
import { adminClient, sameOrigin } from "../../../lib/admin/server";
import { logAppActivity, APP_ACTIONS } from "../../../lib/admin/activityLog";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };

// The browser reports a data change it made (delete, import, submit...). The
// server cannot verify these, so they are stored as app-reported, with a fixed
// action vocabulary and trimmed fields.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403, headers: NS });
  let body = {};
  try { body = await request.json(); } catch {}
  const action = APP_ACTIONS.has(body.action) ? body.action : "";
  const who = String(body.who || "").trim();
  if (!action || !who) return NextResponse.json({ error: "Invalid activity." }, { status: 400, headers: NS });
  try {
    await logAppActivity(adminClient(), { who, role: body.role, action, detail: body.detail });
    return NextResponse.json({ ok: true }, { headers: NS });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: NS });
  }
}
