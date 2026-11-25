import { NextResponse } from "next/server";
import { requireFifa, adminClient, hasFifaAccess } from "../../../../../../lib/fifa/server";
import { loadPrivateSettings, norm } from "../../../../../../lib/admin/server";
import { logActivity } from "../../../../../../lib/admin/activityLog";

export const dynamic = "force-dynamic";
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const H = { "Cache-Control": "no-store" };

// Owner only: give another FIFA admin View or Edit access to this mentee, change it, or take it away.
// Body: { action: "set", k, w: "view"|"edit" } or { action: "remove", k }.
export async function POST(request, { params }) {
  const g = await requireFifa(request, { mutating: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  let b;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON." }, { status: 400 }); }
  const sb = adminClient();
  const { data: row } = await sb.from("fifa_mentees").select("data").eq("owner", g.owner).eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Save this mentee first, then share." }, { status: 404 });
  const data = row.data && typeof row.data === "object" ? { ...row.data } : {};
  let list = Array.isArray(data.sharedWith) ? data.sharedWith.filter((x) => x && x.k) : [];
  const k = norm(b && b.k);
  if (!k || k === g.owner) return NextResponse.json({ error: "Pick another admin." }, { status: 400 });
  let detail;
  if (b.action === "set") {
    const w = b.w === "edit" ? "edit" : "view";
    const s = await loadPrivateSettings(sb);
    const a = s.admins.find((x) => norm(x.name) === k);
    if (!a || !hasFifaAccess({ name: a.name, role: a.role, fifaMentoring: a.fifaMentoring === true })) return NextResponse.json({ error: "That person does not have FIFA CE access." }, { status: 400 });
    list = list.filter((x) => x.k !== k).concat([{ k, n: a.name, w }]);
    detail = "Shared a mentee with " + a.name + " (" + w + ")";
  } else if (b.action === "remove") {
    list = list.filter((x) => x.k !== k);
    detail = "Stopped sharing a mentee with " + k;
  } else return NextResponse.json({ error: "Bad action." }, { status: 400 });
  data.sharedWith = list;
  data.ownerName = g.name;
  const { error } = await sb.from("fifa_mentees").update({ data, updated_at: new Date().toISOString() }).eq("owner", g.owner).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  try { await logActivity(sb, { who: g.name, role: "fifa", action: "FIFA CE share with admin", detail }); } catch {}
  return NextResponse.json({ grants: list }, { headers: H });
}
