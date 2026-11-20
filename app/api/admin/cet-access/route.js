import { NextResponse } from "next/server";
import { logActivity } from "../../../../lib/admin/activityLog";
import { adminClient, authenticate, sameOrigin } from "../../../../lib/admin/server";
import { loadCetAccess, saveCetAccess, loadCourseMfMap, applyCetAccessChange } from "../../../../lib/admin/cetAccess";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };
const clipName = (v) => String(v || "").slice(0, 80);
const fail = (e) => (e && e.code === "NOT_CONFIGURED"
  ? NextResponse.json({ error: e.message }, { status: 503, headers: NS })
  : NextResponse.json({ error: "Server error." }, { status: 500, headers: NS }));

// A CET asking for their OWN grant (they sign in by name only). Returns just that
// one CET's grant, never the whole table.
export async function GET(request) {
  const cetId = new URL(request.url).searchParams.get("cetId") || "";
  if (!cetId) return NextResponse.json({ grant: { assignedCourseNumbers: [], coordinatorMfs: [] } }, { headers: NS });
  try {
    const all = await loadCetAccess(adminClient());
    return NextResponse.json({ grant: all[cetId] || { assignedCourseNumbers: [], coordinatorMfs: [] } }, { headers: NS });
  } catch (e) { return fail(e); }
}

// Admins: { name, pin, action: "list" } returns every grant; { name, pin, cetId,
// assignedCourseNumbers, coordinatorMfs } changes one. The server re-checks who
// the caller is and what they may grant; nothing in the body is trusted.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403, headers: NS });
  let body = {};
  try { body = await request.json(); } catch {}
  try {
    const a = await authenticate(body.name, body.pin);
    if (a.error) return NextResponse.json({ error: a.error }, { status: a.status, headers: NS });
    const sb = adminClient();
    const all = await loadCetAccess(sb);
    if (body.action === "list") return NextResponse.json({ grants: all }, { headers: NS });
    const cetId = String(body.cetId || "");
    if (!cetId) return NextResponse.json({ error: "Missing CET." }, { status: 400, headers: NS });
    const r = applyCetAccessChange(a.admin, all[cetId], body, await loadCourseMfMap(sb));
    if (r.error) return NextResponse.json({ error: r.error, }, { status: r.status, headers: NS });
    const next = { ...all, [cetId]: r.grant };
    await saveCetAccess(sb, next);
    const g = r.grant || {};
    await logActivity(sb, { who: a.admin.name, role: a.admin.role, action: "CET course access", detail: `${clipName(body.cetName) || cetId}: courses [${(g.assignedCourseNumbers || []).join(", ")}]${(g.coordinatorMfs || []).length ? `, coordinator of [${g.coordinatorMfs.join(", ")}]` : ""}` });
    return NextResponse.json({ ok: true, grants: next }, { headers: NS });
  } catch (e) { return fail(e); }
}
