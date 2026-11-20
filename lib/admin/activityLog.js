// Activity log for CODA. Two stores, both private (service-role only):
//  - "activityLog": written by the server itself while it does the thing
//    (sign-ins, admin/PIN changes, CET access, course renames). Trustworthy: the
//    actor was PIN-verified in the same request.
//  - "activityLogApp": reported by the browser after a data change made straight
//    to Supabase (deletes, imports, submits, close/reopen). The server cannot
//    prove these happened, so they are tagged app-reported and kept apart so
//    spam can never push server entries out.
import { kvGet, kvSet, norm } from "./server";

export const SERVER_KEY = "activityLog";
export const APP_KEY = "activityLogApp";
export const MAX_ENTRIES = 3000;

// Actions the browser may report (anything else is refused).
export const APP_ACTIONS = new Set([
  "Deleted observation", "Deleted CET", "Deleted course data", "Cleared data",
  "Imported data", "Merged records", "Submitted observation", "Edited observation",
  "Submitted joint observation", "Closed course", "Reopened course", "Reopened observation",
  "Created course", "Signed in (CET)", "Exported data", "Other",
]);

const clip = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

export function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const s = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return s.toUpperCase();
}

function makeEntry(e, source) {
  return {
    t: Date.now(),
    who: clip(e.who, 80),
    initials: initialsOf(e.who),
    role: clip(e.role, 20),
    action: clip(e.action, 60),
    detail: clip(e.detail, 300),
    source,
    ...(e.ok === false ? { ok: false } : {}),
  };
}

async function append(sb, key, entry) {
  const cur = (await kvGet(sb, key)) || [];
  const list = Array.isArray(cur) ? cur : [];
  list.push(entry);
  await kvSet(sb, key, list.length > MAX_ENTRIES ? list.slice(list.length - MAX_ENTRIES) : list);
}

// Never throws: a logging problem must not block the action being logged.
export async function logActivity(sb, e) {
  try { await append(sb, SERVER_KEY, makeEntry(e, "server")); } catch {}
}
export async function logAppActivity(sb, e) {
  try { await append(sb, APP_KEY, makeEntry(e, "app")); } catch {}
}

export async function loadActivity(sb) {
  const [a, b] = await Promise.all([kvGet(sb, SERVER_KEY), kvGet(sb, APP_KEY)]);
  return [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].sort((x, y) => y.t - x.t);
}

// Plain-English summary of what changed between two private settings objects.
export function diffSettings(before, after) {
  const out = [];
  const bm = new Map((before.admins || []).map((a) => [norm(a.name), a]));
  const am = new Map((after.admins || []).map((a) => [norm(a.name), a]));
  const roleName = { master: "FA Admin", lead: "MF Admin", coordinator: "MF Coordinator", course: "Course Admin", fifa: "FIFA" };
  for (const [k, a] of am) {
    const b = bm.get(k);
    if (!b) { out.push(`Added ${a.name} as ${roleName[a.role] || a.role}`); continue; }
    if (b.pin !== a.pin) out.push(`Changed PIN for ${a.name}`);
    const strip = ({ pin, ...r }) => JSON.stringify(r, Object.keys(r).sort());
    if (strip(b) !== strip(a)) out.push(`Changed access for ${a.name}`);
  }
  for (const [k, b] of bm) if (!am.has(k)) out.push(`Removed ${b.name}`);
  for (const key of ["maxAdmins", "maxCourseAdminsPerMf", "sessionHostName", "mfSlots"]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out.push(`Changed ${key}`);
  }
  return out;
}
