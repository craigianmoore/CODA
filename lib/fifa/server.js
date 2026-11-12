// Server-only helpers for the FIFA Mentoring area (admin-only).
// Everything under /api/fifa/* goes through requireFifa(), which re-checks the
// admin's permission against the live adminSettings on every request, so
// removing someone's access (or changing their PIN) takes effect immediately.
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const FIFA_COOKIE = "coda_fifa";
export const FIFA_BUCKET = "fifa-mentoring";
const SESSION_MS = 12 * 60 * 60 * 1000;
const LOCK_THRESHOLD = 3;
const LOCK_MS = 30 * 60 * 1000;

let _client = null;
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const e = new Error("FIFA mentoring is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
    e.code = "NOT_CONFIGURED";
    throw e;
  }
  if (!_client) _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

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

async function kvGet(sb, key) {
  const { data, error } = await sb.from("kv_settings").select("data").eq("key", key).maybeSingle();
  if (error || !data) return null;
  return data.data;
}
async function kvSet(sb, key, value) {
  await sb.from("kv_settings").upsert({ key, data: value, updated_at: new Date().toISOString() });
}

const norm = (s) => String(s || "").trim().toLowerCase();
function roleOf(a) {
  return ["lead", "coordinator", "course", "fifa"].includes(a.role) ? a.role : (a.role === "mf" ? "lead" : "master");
}
export function hasFifaAccess(admin) {
  if (!admin) return false;
  return admin.role === "master" || admin.role === "fifa" || admin.fifaMentoring === true;
}
function supportKey() {
  return process.env.NEXT_PUBLIC_SUPPORT_ACCESS_KEY || "";
}

// Verifies name + PIN exactly the way CODA's own sign-in does (adminSettings
// admins, or the Vercel-only support key). Returns { admin } | { error, status }.
export async function verifyCredentials(name, pin) {
  const sb = adminClient();
  const key = norm(name);
  const p = String(pin || "").trim();
  if (!key || !p) return { error: "Enter your name and PIN.", status: 400 };

  const locks = (await kvGet(sb, "adminLockouts")) || {};
  const lock = locks[key];
  if (lock && lock.lockedUntil > Date.now()) {
    const mins = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
    return { error: `Too many incorrect attempts. Locked for ${mins} more minute${mins === 1 ? "" : "s"}.`, status: 429 };
  }

  let admin = null;
  const sk = supportKey();
  if (sk && p === sk) {
    admin = { name: String(name).trim() || "Support Access", role: "master", support: true, pin: p };
  } else {
    const settings = await kvGet(sb, "adminSettings");
    const list = Array.isArray(settings?.admins) ? settings.admins : [];
    const hit = list.find((a) => a && norm(a.name) === key && String(a.pin) === p);
    if (hit) admin = { name: hit.name, role: roleOf(hit), fifaMentoring: hit.fifaMentoring === true, pin: String(hit.pin) };
  }

  if (!admin) {
    const failCount = (lock?.failCount || 0) + 1;
    const next = failCount >= LOCK_THRESHOLD ? { failCount: 0, lockedUntil: Date.now() + LOCK_MS } : { failCount, lockedUntil: lock?.lockedUntil || 0 };
    await kvSet(sb, "adminLockouts", { ...locks, [key]: next });
    return { error: "Incorrect name or PIN.", status: 401 };
  }
  if (lock && lock.failCount) await kvSet(sb, "adminLockouts", { ...locks, [key]: { failCount: 0, lockedUntil: 0 } });
  if (!hasFifaAccess(admin)) return { error: "You do not have FIFA Mentoring access.", status: 403 };
  return { admin };
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
    const settings = await kvGet(sb, "adminSettings");
    const me = (Array.isArray(settings?.admins) ? settings.admins : []).find((a) => a && norm(a.name) === tok.k);
    if (!me || tok.p !== pinTag(String(me.pin))) return deny(401, "Sign in to FIFA Mentoring.");
    const admin = { name: me.name, role: roleOf(me), fifaMentoring: me.fifaMentoring === true };
    if (!hasFifaAccess(admin)) return deny(403, "You do not have FIFA Mentoring access.");
    return { ok: true, owner: tok.k, name: me.name };
  } catch (e) {
    if (e && e.code === "NOT_CONFIGURED") return deny(503, e.message);
    return deny(500, "Server error.");
  }
}
