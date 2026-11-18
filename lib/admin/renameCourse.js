// Renaming a course changes its Course Number / Name everywhere it is stored: the
// records themselves (completed_tasks, observations, cet_assessments), the closed-course
// lists, the "numbered sessions" flags, and the private access lists (Course Admin
// assignments in adminSettings, CET grants in cetAccess) so nobody loses access.
import { kvGet, kvSet } from "./server";
import { cnk, loadCourseMfMap } from "./cetAccess";

const TABLES = ["completed_tasks", "observations", "cet_assessments"];

async function rewriteRows(sb, table, from, to) {
  const { data, error } = await sb.from(table).select("id, data");
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  let n = 0;
  for (const r of data || []) {
    const d = r.data || {};
    if (cnk(d.courseNumber) !== from) continue;
    const { error: e2 } = await sb.from(table).upsert({ id: r.id, data: { ...d, courseNumber: to }, updated_at: new Date().toISOString() });
    if (e2) throw new Error(`${table} write failed: ${e2.message}`);
    n++;
  }
  return n;
}
const swapList = (list, from, to) => {
  if (!Array.isArray(list)) return list;
  const out = list.map((x) => (cnk(x) === from ? to : x));
  return out.filter((x, i) => out.findIndex((y) => cnk(y) === cnk(x)) === i);
};
const swapKey = (obj, from, to) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  Object.keys(obj).forEach((k) => { out[cnk(k) === from ? to : k] = obj[k]; });
  return out;
};

export async function renameCourse(sb, actor, oldName, newName) {
  const bad = (error, status = 400) => ({ error, status });
  if (!actor || !["master", "lead", "coordinator"].includes(actor.role)) return bad("Only an FA Admin, MF Admin (TD/CEM) or MF Coordinator can rename a course.", 403);
  const from = cnk(oldName);
  const to = String(newName || "").trim();
  if (!from) return bad("Missing course.");
  if (!to) return bad("Enter the new Course Number / Name.");
  const mfMap = await loadCourseMfMap(sb);
  if (!mfMap.has(from)) return bad("That course wasn't found.", 404);
  if (actor.role !== "master" && !(actor.memberFederations || []).includes(mfMap.get(from))) return bad("You can only rename courses in your own federation.", 403);
  if (cnk(to) !== from && mfMap.has(cnk(to))) return bad("A course with that Course Number / Name already exists.", 409);

  let records = 0;
  for (const t of TABLES) records += await rewriteRows(sb, t, from, to);

  const closed = await kvGet(sb, "closedCourseNumbers");
  if (Array.isArray(closed)) await kvSet(sb, "closedCourseNumbers", swapList(closed, from, to));
  for (const key of ["closedCourseBlocks", "newLabelCourses"]) {
    const v = await kvGet(sb, key);
    if (v && typeof v === "object") await kvSet(sb, key, swapKey(v, from, to));
  }
  const settings = await kvGet(sb, "adminSettings");
  if (settings && Array.isArray(settings.admins)) {
    await kvSet(sb, "adminSettings", { ...settings, admins: settings.admins.map((a) => (a && Array.isArray(a.assignedCourseNumbers) ? { ...a, assignedCourseNumbers: swapList(a.assignedCourseNumbers, from, to) } : a)) });
  }
  const access = await kvGet(sb, "cetAccess");
  if (access && access.byCetId) {
    const by = {};
    Object.entries(access.byCetId).forEach(([id, g]) => { by[id] = g && Array.isArray(g.assignedCourseNumbers) ? { ...g, assignedCourseNumbers: swapList(g.assignedCourseNumbers, from, to) } : g; });
    await kvSet(sb, "cetAccess", { ...access, byCetId: by });
  }
  return { ok: true, records, courseNumber: to };
}
