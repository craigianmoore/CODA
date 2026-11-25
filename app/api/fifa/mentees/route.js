import { NextResponse } from "next/server";
import { requireFifa, adminClient } from "../../../../lib/fifa/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  const sb = adminClient();
  const { data, error } = await sb.from("fifa_mentees").select("id,data").eq("owner", g.owner);
  if (error) return NextResponse.json({ error: "Could not load." }, { status: 500 });
  const mentees = {};
  (data || []).forEach((r) => { mentees[r.id] = r.data; });
  // Mentees other FIFA admins have shared with this person (view or edit).
  const shared = {};
  try {
    const { data: sh } = await sb.from("fifa_mentees").select("id,owner,data").neq("owner", g.owner).contains("data", { sharedWith: [{ k: g.owner }] });
    (sh || []).forEach((r) => {
      const mine = ((r.data && r.data.sharedWith) || []).find((x) => x && x.k === g.owner);
      if (!mine) return;
      const d = { ...r.data };
      delete d.sharedWith; delete d.ownerName;
      shared[r.id] = { owner: r.owner, by: (r.data.ownerName || r.owner), w: mine.w === "edit" ? "edit" : "view", data: d };
    });
  } catch {}
  // The people this admin has shared each of their own mentees with.
  const grants = {};
  Object.keys(mentees).forEach((id) => {
    const d = mentees[id] || {};
    if (Array.isArray(d.sharedWith) && d.sharedWith.length) grants[id] = d.sharedWith;
    delete d.sharedWith; delete d.ownerName;
  });
  return NextResponse.json({ mentees, shared, grants }, { headers: { "Cache-Control": "no-store" } });
}
