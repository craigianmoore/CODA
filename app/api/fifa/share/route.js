import { NextResponse } from "next/server";
import { requireFifa, adminClient } from "../../../../lib/fifa/server";
import { logActivity } from "../../../../lib/admin/activityLog";
import { MENTEE_ID, shareStatus, createShare, revokeShare } from "../../../../lib/fifa/share";

export const dynamic = "force-dynamic";
const H = { "Cache-Control": "no-store" };

export async function POST(request) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  let b;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON." }, { status: 400 }); }
  const id = b && b.menteeId;
  if (typeof id !== "string" || !MENTEE_ID.test(id)) return NextResponse.json({ error: "Bad mentee." }, { status: 400 });
  const origin = new URL(request.url).origin;
  try {
    const { data } = await adminClient().from("fifa_mentees").select("id").eq("owner", g.owner).eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Save this mentee first, then share." }, { status: 404 });
    if (b.action === "create") {
      const s = await createShare(g.owner, id, b.days, origin);
      await logActivity(adminClient(), { who: g.name, role: "fifa", action: "FIFA CE share link", detail: "Created a mentee share link" });
      return NextResponse.json(s, { headers: H });
    }
    if (b.action === "revoke") {
      await revokeShare(g.owner, id);
      await logActivity(adminClient(), { who: g.name, role: "fifa", action: "FIFA CE share link", detail: "Turned off a mentee share link" });
      return NextResponse.json({ active: false }, { headers: H });
    }
    return NextResponse.json(await shareStatus(g.owner, id, origin), { headers: H });
  } catch {
    return NextResponse.json({ error: "Sharing is not set up yet (run the share migration)." }, { status: 500, headers: H });
  }
}
