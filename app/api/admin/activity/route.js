import { NextResponse } from "next/server";
import { adminClient, authenticate, sameOrigin } from "../../../../lib/admin/server";
import { loadActivity } from "../../../../lib/admin/activityLog";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };

// FA Admin only: { name, pin } returns the merged activity log, newest first.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403, headers: NS });
  let body = {};
  try { body = await request.json(); } catch {}
  try {
    const a = await authenticate(body.name, body.pin);
    if (a.error) return NextResponse.json({ error: a.error }, { status: a.status, headers: NS });
    if (a.admin.role !== "master") return NextResponse.json({ error: "Only an FA Admin can view the activity log." }, { status: 403, headers: NS });
    return NextResponse.json({ entries: await loadActivity(adminClient()) }, { headers: NS });
  } catch (e) {
    return NextResponse.json({ error: e && e.code === "NOT_CONFIGURED" ? e.message : "Server error." }, { status: e && e.code === "NOT_CONFIGURED" ? 503 : 500, headers: NS });
  }
}
