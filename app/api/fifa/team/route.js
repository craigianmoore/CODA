import { NextResponse } from "next/server";
import { requireFifa, adminClient, hasFifaAccess } from "../../../../lib/fifa/server";
import { loadPrivateSettings, norm } from "../../../../lib/admin/server";

export const dynamic = "force-dynamic";

// The other admins who have FIFA CE access (names only) so a mentee can be shared with them.
export async function GET(request) {
  const g = await requireFifa(request);
  if (!g.ok) return g.response;
  try {
    const s = await loadPrivateSettings(adminClient());
    const people = s.admins
      .filter((a) => norm(a.name) !== g.owner && hasFifaAccess({ name: a.name, role: a.role, fifaMentoring: a.fifaMentoring === true }))
      .map((a) => ({ k: norm(a.name), n: a.name }));
    return NextResponse.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}
