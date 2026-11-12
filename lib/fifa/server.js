// Server-only helpers for the FIFA Mentoring area (admin-only).
// Everything under /api/fifa/* goes through requireFifa(), which re-checks the
// admin's permission against the live adminSettings on every request, so
// removing someone's access (or changing their PIN) takes effect immediately.
import { createHmac, timingSafeEqual } from "node:crypto";
import { adminClient, loadPrivateSettings, authenticate, norm, supportKey } from "../admin/server";

export { adminClient };

export const FIFA_COOKIE = "coda_fifa";
export const FIFA_BUCKET = "fifa-mentoring";
const SESSION_MS = 12 * 60 * 60 * 1000;

function secret() {
  return process.env.FIFA_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
const b64 = (s) => Buffer.from(s).toString("base64url");
const hmac = (s) => createHmac("sha256", secret()).update(s).digest("base64url");
function safeEq(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const pinTag = (pin) => createHmac("sha256", secret()).update("pin:" + pin).digest("hex").slice(0, 20);

export function signToken(payload) {
  const body = b64(JSON.stringify(payload));
  return body + "." + hmac(body);
}
export function readToken(token) {
  if (!token || !secret()) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig || !safeEq(sig, hmac(body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p && p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export function hasFifaAccess(admin) {
  if (!admin) return false;
  return admin.role === "master" || admin.role === "fifa" || admin.fifaMentoring === true;
}
// Same sign-in as CODA itself (shared lockout, support key), plus the FIFA check.
export async function verifyCredentials(name, pin) {
  const r = await authenticate(name, pin);
  if (r.error) return r;
  if (!hasFifaAccess(r.admin)) return { error: "You do not have FIFA Mentoring access.", status: 403 };
  return { admin: r.admin };
}

export function makeSessionToken(admin) {
  return signToken({ n: admin.name, k: norm(admin.name), s: !!admin.support, p: pinTag(admin.pin), exp: Date.now() + SESSION_MS });
}
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/fifa",
  maxAge: SESSION_MS / 1000,
});

// Guard for every FIFA route. Returns { ok:true, owner, name } or { ok:false, response }.
export async function requireFifa(request, { mutating = false } = {}) {
  const deny = (status, error) => ({ ok: false, response: Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } }) });
  try {
    if (mutating) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      if (origin) {
        let oh = "";
        try { oh = new URL(origin).host; } catch {}
        if (oh !== host) return deny(403, "Cross-origin request refused.");
      }
    }
    const tok = readToken(request.cookies.get(FIFA_COOKIE)?.value);
    if (!tok) return deny(401, "Sign in to FIFA Mentoring.");
    if (tok.s) {
      if (!supportKey() || tok.p !== pinTag(supportKey())) return deny(401, "Sign in to FIFA Mentoring.");
      return { ok: true, owner: tok.k, name: tok.n };
    }
    const sb = adminClient();
    const settings = await loadPrivateSettings(sb);
    const me = settings.admins.find((a) => norm(a.name) === tok.k);
    if (!me || tok.p !== pinTag(String(me.pin))) return deny(401, "Sign in to FIFA Mentoring.");
    const admin = { name: me.name, role: me.role, fifaMentoring: me.fifaMentoring === true };
    if (!hasFifaAccess(admin)) return deny(403, "You do not have FIFA Mentoring access.");
    return { ok: true, owner: tok.k, name: me.name };
  } catch (e) {
    if (e && e.code === "NOT_CONFIGURED") return deny(503, e.message);
    return deny(500, "Server error.");
  }
}
