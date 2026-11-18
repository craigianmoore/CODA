import { NextResponse } from "next/server";
import { adminClient, authenticate, sameOrigin } from "../../../../lib/admin/server";
import { renameCourse } from "../../../../lib/admin/renameCourse";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };

// { name, pin, courseNumber, newCourseNumber }: the server re-checks who the caller is and
// which federation the course belongs to; nothing in the body is trusted.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403, headers: NS });
  let body = {};
  try { body = await request.json(); } catch {}
  try {
    const a = await authenticate(body.name, body.pin);
    if (a.error) return NextResponse.json({ error: a.error }, { status: a.status, headers: NS });
    const r = await renameCourse(adminClient(), a.admin, body.courseNumber, body.newCourseNumber);
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status, headers: NS });
    return NextResponse.json(r, { headers: NS });
  } catch (e) {
    return NextResponse.json({ error: e && e.code === "NOT_CONFIGURED" ? e.message : "Server error." }, { status: e && e.code === "NOT_CONFIGURED" ? 503 : 500, headers: NS });
  }
}
