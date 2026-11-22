// Builds the read-only page a mentee sees from their share link. Pure functions:
// takes the stored mentee record, returns HTML. It deliberately reads only a few
// fields (name, format, on-site date, ticks, meeting-held dates, reflective-practice
// dates) and never the mentor's notes.
import { STAGES, TIMELINE, TASK_STEPS } from "./menteeContent";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Dates are whole days (UTC midnight) so there is no time-zone drift.
const day = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
const addD = (t, n) => t + n * 864e5;
const fmtS = (t) => { const d = new Date(t); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
const fmt = (t) => fmtS(t) + " " + new Date(t).getUTCFullYear();
const dn = (n) => (n < 0 ? "−" + -n : String(n));
export function melbourneToday(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return day(p);
}

const G2STAGE = {
  "Set-up": "s0", "Meeting 1: Relationship and shared purpose": "m1", "Meeting 2: Understanding the coach educator role": "m2",
  "Meeting 3: Performance gap and blueprint": "m3", "Meeting 4: Reflection, feedback and feedforward": "m4",
  "Meeting 5: On-site preparation": "m5", "Control point and final week": "fc", "On-site Assessment Practice": "os", "After the on-site": "os",
};

const checks = (m) => (m && m.checks && typeof m.checks === "object" ? m.checks : {});
function stepDone(id, chips, m) {
  const c = checks(m);
  if (chips) { for (let i = 0; i < chips; i++) if (!c[id + "#" + i]) return false; return true; }
  return !!c[id];
}
function stageCounts(st, m) {
  let done = 0, total = 0;
  for (const [id, , chips] of st.items) { total++; if (stepDone(id, chips, m)) done++; }
  return { done, total };
}
const rpOn = (m) => !!(m && m.rp && m.rp.on);
const activeStages = (m) => STAGES.filter((s) => !s.optional || rpOn(m));

function stageStatus(st, m, today) {
  if (st.optional && !rpOn(m)) return "optional";
  const c = stageCounts(st, m);
  if (c.total && c.done === c.total) return "done";
  if (m.held && m.held[st.id]) return "held";
  if (st.id === "rp") {
    const n = day(m.rp && m.rp.notified);
    if (n == null) return "upcoming";
    return today > addD(n, 30) ? "overdue" : "now";
  }
  const D = day(m.onsite);
  if (D == null) return "upcoming";
  const a = st.win[0], b = st.win[1];
  const s = a == null ? null : addD(D, a), e = b == null ? null : addD(D, b);
  if (e != null && today > e) return "overdue";
  if ((s == null || today >= s) && (e == null || today <= e)) return "now";
  return "upcoming";
}
const LABEL = { done: "Done", now: "Due now", overdue: "Overdue", upcoming: "Upcoming", optional: "If needed", held: "Meeting held", past: "Past", open: "" };

function dayText(win) {
  const [a, b] = win;
  if (a == null) return "Before Day " + dn(b);
  if (b == null) return "On-site day and after";
  return a === b ? "Day " + dn(a) : "Day " + dn(a) + " to " + dn(b);
}
function relText(a, b) {
  const f = (n) => (n === 0 ? "On-site day" : n < 0 ? "Day " + dn(n) : "+" + n + " days");
  if (a === b) return f(a);
  if (a < 0 && b < 0) return "Day " + dn(a) + " to " + dn(b);
  return f(a) + " to " + f(b);
}

// One row per thing the mentee does or attends, each with a status.
function taskRows(m, today) {
  const D = day(m.onsite);
  const held = (m.held && typeof m.held === "object") ? m.held : {};
  return TIMELINE.map((x) => {
    const stageId = G2STAGE[x.g];
    const start = D == null ? null : addD(D, x.a), end = D == null ? null : addD(D, x.b);
    const links = TASK_STEPS[x.t];
    let state;
    if (x.who === "both") state = held[stageId] ? "done" : null;
    else if (links) {
      if (x.t.startsWith("If Developing") && !rpOn(m)) state = "optional";
      else state = links.every((id) => stepDone(id, 0, m)) ? "done" : null;
    } else state = null;
    if (!state) {
      if (end == null) state = "upcoming";
      else if (today > end) state = x.who === "both" || links ? "overdue" : "past";
      else if (today >= start) state = "now";
      else state = "upcoming";
    }
    const dates = D == null ? "" : (x.a === x.b ? fmtS(start) : fmtS(start) + " – " + fmtS(end));
    return { ...x, stageId, state, rel: relText(x.a, x.b), dates, start, end };
  });
}

const CSS = `
:root{--bg:#F3F6FA;--surface:#fff;--ink:#0E1A2B;--muted:#56657A;--line:#D5DDE8;--accent:#004890;--on-accent:#fff;--accent-soft:#E1EBF7;--ok:#17724A;--ok-soft:#DDF0E5;--warn:#8F5200;--warn-soft:#FBEACB;--bad:#B3261E;--bad-soft:#FBE2E0}
@media (prefers-color-scheme:dark){:root{--bg:#0B1420;--surface:#111E2E;--ink:#E7EEF8;--muted:#94A5BB;--line:#25384F;--accent:#6AA6EA;--on-accent:#0B1420;--accent-soft:#182A40;--ok:#6FD3A0;--ok-soft:#133526;--warn:#F0B95A;--warn-soft:#3A2B0E;--bad:#FF8F86;--bad-soft:#401C19;color-scheme:dark}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding-block:0 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
main{max-width:760px;margin:0 auto;display:grid;gap:14px;padding-top:max(16px,env(safe-area-inset-top,0px))}
header{padding:18px 0 4px}
.eyebrow{color:var(--accent);font-weight:700;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}
h1{font-size:1.65rem;line-height:1.2;margin:4px 0 2px;text-wrap:balance}h2{font-size:1.05rem;margin:0 0 10px}
.sub{color:var(--muted);margin:0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0}
.row{display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between;align-items:flex-end}
.big{font-size:2.3rem;font-weight:800;line-height:1}.muted{color:var(--muted);font-size:.9rem}
.bar{height:10px;background:var(--accent-soft);border-radius:99px;overflow:hidden;margin-top:12px}.bar i{display:block;height:100%;background:var(--accent);border-radius:99px}
.bar.ok i{background:var(--ok)}
.pill{display:inline-block;font-size:.74rem;font-weight:700;padding:2px 9px;border-radius:99px;background:var(--accent-soft);color:var(--accent);white-space:nowrap}
.pill.done{background:var(--ok-soft);color:var(--ok)}.pill.overdue{background:var(--bad-soft);color:var(--bad)}.pill.now{background:var(--warn-soft);color:var(--warn)}
ul.clean{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.todo{display:grid;gap:2px;padding:12px;border:1px solid var(--line);border-radius:10px}
.todo b{font-weight:600}.todo .meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:.85rem}
.j{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.j:first-child{border-top:0}
.j .t{font-weight:600}.j .d{grid-column:1;color:var(--muted);font-size:.85rem}.j .bar{grid-column:1/-1;margin-top:6px;height:6px}
details.tli{border-top:1px solid var(--line);padding:10px 0}details.tli:first-of-type{border-top:0}
details.tli summary{cursor:pointer;display:flex;gap:8px;flex-wrap:wrap;align-items:center;list-style:none}details.tli summary::-webkit-details-marker{display:none}
details.tli summary::before{content:"\\25B8";color:var(--muted)}details[open].tli summary::before{content:"\\25BE"}
details.tli ul{margin:8px 0 0;padding-left:22px;color:var(--ink)}.grp{font-weight:700;margin:14px 0 2px;font-size:.92rem}.grp:first-of-type{margin-top:0}
footer{color:var(--muted);font-size:.82rem;text-align:center;padding:8px 0}
`;

export function renderMenteePage(m, { today, updatedAt } = {}) {
  today = today || melbourneToday();
  m = m && typeof m === "object" ? m : {};
  const D = day(m.onsite);
  const stages = activeStages(m);
  let done = 0, total = 0;
  for (const st of stages) { const c = stageCounts(st, m); done += c.done; total += c.total; }
  const pct = total ? Math.round((done / total) * 100) : 0;
  const rows = taskRows(m, today);
  const toDo = rows.filter((r) => r.state !== "done" && r.state !== "optional" && r.state !== "past");
  const rank = { overdue: 0, now: 1, upcoming: 2 };
  const next = [...toDo].sort((a, b) => (rank[a.state] - rank[b.state]) || (a.a - b.a)).slice(0, 4);
  const left = D == null ? null : Math.round((D - today) / 864e5);
  const pill = (s) => (LABEL[s] ? `<span class="pill ${esc(s)}">${esc(LABEL[s])}</span>` : "");

  let h = `<header><div class="eyebrow">FIFA Coach Educators’ Mentoring Programme</div><h1>${esc(m.name || "Your mentoring journey")}</h1><p class="sub">Your journey and what to prepare next. Shared by your mentor${m.format ? " · " + esc(m.format) + " format" : ""}.</p></header>`;
  h += `<section class="card"><div class="row"><div><div class="muted">Overall progress</div><div class="big">${pct}%</div></div><div style="text-align:right">`
    + (D == null ? `<div class="muted">On-site date to be confirmed</div>` : `<div class="muted">On-site Assessment Practice</div><div style="font-weight:700;font-size:1.15rem">${esc(fmt(D))}</div><div class="muted">${left > 0 ? left + " day" + (left === 1 ? "" : "s") + " to go" : left === 0 ? "Today" : Math.abs(left) + " day" + (Math.abs(left) === 1 ? "" : "s") + " ago"}</div>`)
    + `</div></div><div class="bar${pct === 100 ? " ok" : ""}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Overall progress"><i style="width:${pct}%"></i></div><div class="muted" style="margin-top:6px">${done} of ${total} steps complete (yours and your mentor’s)</div></section>`;

  h += `<section class="card"><h2>Coming up for you</h2>`;
  if (!next.length) h += `<p class="muted" style="margin:0">Nothing outstanding right now. Your mentor will update this as you go.</p>`;
  else h += `<ul class="clean">` + next.map((r) => `<li class="todo"><div><b>${esc(r.t)}</b></div><div class="meta">${pill(r.state)}<span>${esc(r.rel)}${r.dates ? " · " + esc(r.dates) : ""}</span>${r.who === "both" ? "<span>With your mentor</span>" : ""}</div>${r.m.length ? `<div class="muted">${esc(r.m[0])}</div>` : ""}</li>`).join("") + `</ul>`;
  h += `</section>`;

  h += `<section class="card"><h2>Your journey</h2>` + stages.map((st) => {
    const c = stageCounts(st, m), s = stageStatus(st, m, today), p = c.total ? Math.round((c.done / c.total) * 100) : 0;
    const a = st.win[0], b = st.win[1];
    let when = st.id === "rp" ? "Within 30 days of the outcome" : dayText(st.win);
    if (D != null && st.id !== "rp") when += " · " + (a == null ? "by " + fmtS(addD(D, b)) : b == null ? fmtS(D) + " onwards" : a === b ? fmtS(addD(D, a)) : fmtS(addD(D, a)) + " – " + fmtS(addD(D, b)));
    const heldOn = m.held && m.held[st.id] && day(m.held[st.id]) != null ? ` · held ${esc(fmt(day(m.held[st.id])))}` : "";
    return `<div class="j"><span class="t">${esc(st.short)}</span>${pill(s)}<span class="d">${esc(when)}${heldOn}</span><span class="bar${s === "done" ? " ok" : ""}"><i style="width:${p}%"></i></span></div>`;
  }).join("") + `</section>`;

  h += `<section class="card"><h2>All your tasks and meetings</h2>`;
  let last = "";
  for (const r of rows) {
    if (r.g !== last) { last = r.g; h += `<div class="grp">${esc(r.g)}</div>`; }
    h += `<details class="tli"><summary><b>${esc(r.t)}</b>${pill(r.state)}<span class="muted">${esc(r.rel)}${r.dates ? " · " + esc(r.dates) : ""}</span></summary>${r.m.length ? `<ul>${r.m.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}</details>`;
  }
  h += `</section>`;
  if (rpOn(m) && day(m.rp && m.rp.notified) != null) {
    const dl = addD(day(m.rp.notified), 30), dleft = Math.round((dl - today) / 864e5);
    h += `<section class="card"><h2>Reflective practice deadline</h2><p style="margin:0"><b>${esc(fmt(dl))}</b> · ${dleft >= 0 ? dleft + " day" + (dleft === 1 ? "" : "s") + " left" : Math.abs(dleft) + " day" + (Math.abs(dleft) === 1 ? "" : "s") + " overdue"}. Late submissions are not considered.</p></section>`;
  }
  h += `<footer>Read-only view from your mentor${updatedAt ? " · updated " + esc(fmt(day(String(updatedAt).slice(0, 10)) ?? today)) : ""}. This link is private to you; please don’t share it.</footer>`;

  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Your mentoring journey</title><style>${CSS}</style></head><body><main>${h}</main></body></html>`;
}

export function renderUnavailable() {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Link not available</title><style>${CSS}</style></head><body><main><header><div class="eyebrow">FIFA Coach Educators’ Mentoring Programme</div><h1>This link is no longer active</h1><p class="sub">It may have expired or been replaced. Please ask your mentor for a new link.</p></header></main></body></html>`;
}
