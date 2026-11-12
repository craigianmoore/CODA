// Server-only admin auth for CODA. This is the single place that ever sees admin
// PINs: they live in kv_settings under the key "adminSettings", which the public
// (anon) key can neither read nor write (see the 2026-11-13 migration). The
// browser only gets a PIN-free "directory" and asks the server to check a PIN.
import { createClient } from "@supabase/supabase-js";

export const LOCK_THRESHOLD = 3;
export const LOCK_MS = 30 * 60 * 1000;

let _client = null;
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const e = new Error("Admin sign-in is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
    e.code = "NOT_CONFIGURED";
    throw e;
  }
  if (!_client) _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

export async function kvGet(sb, key) {
  const { data, error } = await sb.from("kv_settings").select("data").eq("key", key).maybeSingle();
  if (error) throw new Error("kv read failed: " + error.message);
  return data ? data.data : null;
}
export async function kvSet(sb, key, value) {
  const { error } = await sb.from("kv_settings").upsert({ key, data: value, updated_at: new Date().toISOString() });
  if (error) throw new Error("kv write failed: " + error.message);
}

export const norm = (s) => String(s || "").trim().toLowerCase();
export function roleOf(a) {
  if (!a) return "master";
  if (a.role === "mf" || a.role === "lead") return "lead";
  if (["coordinator", "course", "fifa"].includes(a.role)) return a.role;
  return "master";
}
export const supportKey = () => process.env.SUPPORT_ACCESS_KEY || process.env.NEXT_PUBLIC_SUPPORT_ACCESS_KEY || "";

const strs = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

// Canonical, PIN-free shape of one admin (mirrors the client's migrateAdminSettings).
export function cleanAdmin(a) {
  const role = roleOf(a);
  const out = { name: String(a.name || "").trim(), role };
  if (role === "lead" || role === "coordinator") out.memberFederations = strs(a.memberFederations);
  if (role === "course") {
    out.memberFederations = strs(a.memberFederations).length ? strs(a.memberFederations) : (a.memberFederation ? [String(a.memberFederation)] : []);
    out.assignedCourseNumbers = strs(a.assignedCourseNumbers);
  }
  if ((role === "lead" || role === "coordinator" || role === "course") && a.fifaMentoring === true) out.fifaMentoring = true;
  return out;
}

// First-run only: when no adminSettings row exists yet. CODA_BOOTSTRAP_ADMIN_NAME /
// CODA_BOOTSTRAP_ADMIN_PIN (Vercel env) seed the first FA Admin. If they are not
// set, the original single admin is seeded so nobody is locked out of an install
// that never saved its admin settings; change that PIN straight away.
function seedSettings() {
  const name = process.env.CODA_BOOTSTRAP_ADMIN_NAME || "Craig Moore";
  const pin = process.env.CODA_BOOTSTRAP_ADMIN_PIN || "8938";
  return { admins: [{ name, pin, role: "master" }], maxAdmins: 2, sessionHostName: name };
}

// The private settings, normalised. `pin` is kept here and nowhere else.
export async function loadPrivateSettings(sb) {
  const raw = (await kvGet(sb, "adminSettings")) || seedSettings();
  const admins = (Array.isArray(raw.admins) ? raw.admins : [])
    .map((a) => (typeof a === "string" ? { name: a, pin: String(raw.pin || ""), role: "master" } : a))
    .filter((a) => a && a.name)
    .map((a) => ({ ...cleanAdmin(a), pin: String(a.pin || "") }));
  return {
    admins,
    maxAdmins: raw.maxAdmins || 2,
    maxCourseAdminsPerMf: raw.maxCourseAdminsPerMf || 4,
    mfSlots: raw.mfSlots && typeof raw.mfSlots === "object" ? raw.mfSlots : {},
    sessionHostName: raw.sessionHostName || (admins[0] && admins[0].name) || "",
  };
}

// What the browser is allowed to see: everything except PINs.
export function toDirectory(settings) {
  return { ...settings, admins: settings.admins.map(({ pin, ...rest }) => rest) };
}

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let oh = "";
  try { oh = new URL(origin).host; } catch {}
  return oh === request.headers.get("host");
}

// Checks name + PIN (or the Vercel-only support key) and enforces the lockout:
// 3 wrong PINs for a name locks that name for 30 minutes. Returns
// { admin } or { error, status }. `admin` has no PIN except as `pin` for callers
// that need to derive a session tag; never send it to the browser.
export async function authenticate(name, pin) {
  const sb = adminClient();
  const key = norm(name);
  const p = String(pin || "").trim();
  if (!key || !p) return { error: "Enter your name and PIN.", status: 400 };

  const locks = (await kvGet(sb, "adminLockouts")) || {};
  const lock = locks[key];
  if (lock && lock.lockedUntil > Date.now()) {
    const mins = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
    return { error: `Too many incorrect attempts. Locked for ${mins} more minute${mins === 1 ? "" : "s"}.`, status: 429, lockedUntil: lock.lockedUntil };
  }

  let admin = null;
  const sk = supportKey();
  if (sk && p === sk) {
    admin = { name: String(name).trim() || "Support Access", role: "master", support: true, pin: p };
  } else {
    const settings = await loadPrivateSettings(sb);
    const hit = settings.admins.find((a) => norm(a.name) === key && a.pin && a.pin === p);
    if (hit) admin = hit;
  }

  if (!admin) {
    const failCount = (lock?.failCount || 0) + 1;
    const next = failCount >= LOCK_THRESHOLD ? { failCount: 0, lockedUntil: Date.now() + LOCK_MS } : { failCount, lockedUntil: lock?.lockedUntil || 0 };
    await kvSet(sb, "adminLockouts", { ...locks, [key]: next });
    return { error: "Incorrect name or PIN.", status: 401, ...(next.lockedUntil > Date.now() ? { lockedUntil: next.lockedUntil } : {}) };
  }
  if (lock && (lock.failCount || lock.lockedUntil)) await kvSet(sb, "adminLockouts", { ...locks, [key]: { failCount: 0, lockedUntil: 0 } });
  return { admin };
}

// What the browser stores as its sign-in "match" (no PIN).
export function publicAdmin(admin) {
  const { pin, support, ...rest } = admin;
  return { ...rest, ...(support ? { support: true } : {}) };
}

const PIN_RE = /^\d{4}$/;
const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((kk) => [kk, x[kk]])) : x));
const same = (a, b) => stable(a) === stable(b);
const subset = (arr, of) => (arr || []).every((x) => (of || []).includes(x));

// Validates and applies an admin-settings change on behalf of `actor` (already
// authenticated). `proposed` is a PIN-free settings object from the browser;
// `pins` maps lower-cased admin name -> a NEW 4-digit PIN (new admins, PIN
// changes). Existing PINs are never taken from the browser. Returns
// { settings } (private, with PINs) or { error, status }.
export function applySettingsChange(actor, stored, proposed, pins) {
  const bad = (error, status = 400) => ({ error, status });
  if (!proposed || typeof proposed !== "object" || !Array.isArray(proposed.admins)) return bad("Invalid settings.");
  pins = pins && typeof pins === "object" ? pins : {};
  const isMaster = actor.role === "master";
  const actorKey = norm(actor.name);

  const oldBy = new Map(stored.admins.map((a) => [norm(a.name), a]));
  const nextClean = [];
  const seen = new Set();
  for (const raw of proposed.admins) {
    if (!raw || typeof raw !== "object" || !String(raw.name || "").trim()) return bad("Every admin needs a name.");
    const c = cleanAdmin(raw);
    const k = norm(c.name);
    if (seen.has(k)) return bad("Duplicate admin name.");
    seen.add(k);
    nextClean.push(c);
  }
  const nextBy = new Map(nextClean.map((a) => [norm(a.name), a]));

  for (const [k, pin] of Object.entries(pins)) {
    if (!PIN_RE.test(String(pin))) return bad("PINs must be exactly 4 digits.");
    if (!nextBy.has(k)) return bad("PIN supplied for an unknown admin.");
  }

  const strip = ({ pin, ...rest }) => rest;
  const ownMfs = actor.memberFederations || [];
  const mfsOk = (a) => !!a && (a.memberFederations || []).length > 0 && subset(a.memberFederations, ownMfs);
  const lowRole = (a) => !!a && (a.role === "course" || a.role === "coordinator");

  // Admin-by-admin diff.
  for (const k of new Set([...oldBy.keys(), ...nextBy.keys()])) {
    const before = oldBy.get(k) ? strip(oldBy.get(k)) : null;
    const after = nextBy.get(k) || null;
    const pinChanged = Object.prototype.hasOwnProperty.call(pins, k);
    if (before && after && same(before, after) && !pinChanged) continue;
    if (isMaster) {
      if (!before && !pinChanged) return bad("A new admin needs a PIN.");
      continue;
    }
    // Everyone may change their own PIN and nothing else about themselves.
    if (before && after && k === actorKey && same(before, after) && pinChanged) continue;
    // MF Admins manage Course Admins / Coordinators inside their own federation(s).
    if (actor.role === "lead") {
      if (before && !(lowRole(before) && mfsOk(before))) return bad("You don't have permission to change that admin.", 403);
      if (after && !(lowRole(after) && mfsOk(after))) return bad("You can only manage Course Admins and Coordinators in your own federation.", 403);
      if ((before && before.fifaMentoring) || (after && after.fifaMentoring)) return bad("Only an FA Admin can change FIFA Mentoring access.", 403);
      if (before && after && pinChanged) return bad("Only an FA Admin can change another admin's PIN.", 403);
      if (!before && !pinChanged) return bad("A new admin needs a PIN.");
      continue;
    }
    return bad("You don't have permission to change admin settings.", 403);
  }

  // Everything that is not the admin list.
  const topKeys = new Set([...Object.keys(stored), ...Object.keys(proposed)]);
  topKeys.delete("admins");
  for (const key of topKeys) {
    if (same(stored[key], proposed[key])) continue;
    if (isMaster) continue;
    if (key === "mfSlots" && actor.role === "lead") {
      const a = stored.mfSlots || {}, b = proposed.mfSlots || {};
      for (const mf of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!same(a[mf], b[mf]) && !ownMfs.includes(mf)) return bad("You can only change slots for your own Member Federation.", 403);
      }
      continue;
    }
    return bad("Only an FA Admin can change that setting.", 403);
  }

  if (!nextClean.some((a) => a.role === "master")) return bad("There must always be at least one FA Admin.");
  const maxAdmins = proposed.maxAdmins || stored.maxAdmins;
  if (nextClean.length > Math.max(maxAdmins, stored.admins.length)) return bad("That would exceed the maximum number of admins.");

  const admins = nextClean.map((c) => {
    const k = norm(c.name);
    const pin = pinChanged(pins, k) ? String(pins[k]) : oldBy.get(k)?.pin;
    return { ...c, pin };
  });
  if (admins.some((a) => !a.pin)) return bad("A new admin needs a PIN.");

  const settings = {
    admins,
    maxAdmins: proposed.maxAdmins || stored.maxAdmins,
    maxCourseAdminsPerMf: proposed.maxCourseAdminsPerMf || stored.maxCourseAdminsPerMf,
    mfSlots: proposed.mfSlots && typeof proposed.mfSlots === "object" ? proposed.mfSlots : stored.mfSlots,
    sessionHostName: proposed.sessionHostName || stored.sessionHostName,
  };
  return { settings };
}
function pinChanged(pins, k) {
  return Object.prototype.hasOwnProperty.call(pins, k);
}
