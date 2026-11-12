import { NextResponse } from "next/server";
import { adminClient, loadPrivateSettings, toDirectory } from "../../../../lib/admin/server";

export const dynamic = "force-dynamic";
const NS = { "Cache-Control": "no-store" };

// The admin list as the browser may see it: names, roles and scope, no PINs.
export async function GET() {
  try {
    const settings = await loadPrivateSettings(adminClient());
    return NextResponse.json({ settings: toDirectory(settings) }, { headers: NS });
  } catch (e) {
    if (e && e.code === "NOT_CONFIGURED") return NextResponse.json({ error: e.message }, { status: 503, headers: NS });
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: NS });
  }
}
