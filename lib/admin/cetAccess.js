// Which courses a CET may see. CETs sign in by name only, so their grants must
// not live on the (browser-writable) CET record: they are kept in the server-only
// kv_settings row "cetAccess" and only an FA Admin, MF Admin (TD/CEM) or MF
// Coordinator - proven by name + PIN on each save - can change them, and only
// inside their own federation(s).
import { kvGet, kvSet, norm } from "./server";

const strs = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : []);
const uniqBy = (arr, key) => { const seen = new Set(); return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
export const cnk = (v) => String(v == null ? "" : v).trim().toLowerCase();

export async function loadCetAccess(sb) {
  const raw = (await kvGet(sb, "cetAccess")) || {};
  const by = raw.byCetId && typeof raw.byCetId === "object" ? raw.byCetId : {};
  const out = {};
  for (const [id, g] of Object.entries(by)) out[id] = { assignedCourseNumbers: strs(g && g.assignedCourseNumbers), coordinatorMfs: strs(g && g.coordinatorMfs) };
  return out;
}
export async function saveCetAccess(sb, byCetId) { await kvSet(sb, "cetAccess", { byCetId }); }

// course number -> Member Federation, from the completed-task records.
export async function loadCourseMfMap(sb) {
  const { data, error } = await sb.from("completed_tasks").select("data");
  if (error) throw new Error("course read failed: " + error.message);
  const m = new Map();
  for (const r of data || []) {
    const d = r.data || {};
    if (cnk(d.courseNumber) && !m.has(cnk(d.courseNumber))) m.set(cnk(d.courseNumber), d.memberFederation || "FV");
  }
  return m;
}

// Pure rule check. actor: { role, memberFederations }; existing: the CET's current
// grant; req: what the caller asks for. Returns { grant } or { error, status }.
export function applyCetAccessChange(actor, existing, req, courseMf) {
  const bad = (error, status = 403) => ({ error, status });
  if (!actor || !["master", "lead", "coordinator"].includes(actor.role)) return bad("Only an FA Admin, MF Admin (TD/CEM) or MF Coordinator can grant course access.");
  const cur = { assignedCourseNumbers: strs(existing && existing.assignedCourseNumbers), coordinatorMfs: strs(existing && existing.coordinatorMfs) };
  const reqCourses = uniqBy(strs(req && req.assignedCourseNumbers), cnk);
  const reqMfs = uniqBy(strs(req && req.coordinatorMfs), (x) => x);
  if (actor.role === "master") return { grant: { assignedCourseNumbers: reqCourses, coordinatorMfs: reqMfs } };
  const own = strs(actor.memberFederations);
  if (own.length === 0) return bad("You aren't assigned to a Member Federation.");
  const inScope = (n) => own.includes(courseMf.get(cnk(n)));
  const had = new Set(cur.assignedCourseNumbers.map(cnk));
  if (reqCourses.some((n) => !inScope(n) && !had.has(cnk(n)))) return bad("You can only grant courses in your own federation.");
  if (reqMfs.some((k) => !own.includes(k) && !cur.coordinatorMfs.includes(k))) return bad("You can only grant all-courses access in your own federation.");
  return { grant: {
    assignedCourseNumbers: [...cur.assignedCourseNumbers.filter((n) => !inScope(n)), ...reqCourses.filter(inScope)],
    coordinatorMfs: [...cur.coordinatorMfs.filter((k) => !own.includes(k)), ...reqMfs.filter((k) => own.includes(k))],
  } };
}
