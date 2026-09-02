"use client";

import { useState, useEffect, useRef } from "react";
import { Users, BookOpen, ClipboardList, FileText, Plus, ChevronLeft, ChevronRight, Check, X, Calendar, Award, TrendingUp, ArrowRight, Loader2, ListChecks, Pencil, Upload, AlertCircle, PenLine, Search, Trash2, Settings, Clock, Smartphone, Tablet, Laptop, Lock, LogOut, Mic } from "lucide-react";
import Papa from "papaparse";
import * as mammoth from "mammoth";
import { supabase } from "../lib/supabase";

const ASSESSMENT_AREAS = [
  {
    key: "objective",
    label: "Objective",
    desc: "Clarity, appropriateness and communication of the session objective",
    descriptors: {
      0: "Objectives are vague or not communicated effectively.",
      1: "Objectives are identified but lack clarity and communication is inconsistent or only partially effective.",
      2: "Objectives are clear and achievable, and communicated effectively.",
      3: "Objectives are clear and concise, have specific detail, are measurable and communicated effectively to all players.",
    },
  },
  {
    key: "content",
    label: "Content",
    desc: "Relevance · Realism · Repetition · Rewards · Reflection — quality, relevance and progression of the session content",
    descriptors: {
      0: "Content is irrelevant, or is vague to linking with objective, failing to address one or more of the five R's (Relevance, Realism, Repetition, Rewards, Reflection).",
      1: "Content shows some relevance to the objective but lacks consistency or clarity. Some of the five R's are addressed, but application is incomplete. Limited connection to technical actions/principles of play, with minimal or unclear visual cues.",
      2: "Content is relevant and aligns with the objective and clearly addresses all five R's. Content aligns with the technical actions/principles of play with detail on the specific visual cues linked to player actions and habits.",
      3: "Content is highly relevant, meets the objective, covering all five R's extremely well. Detailed insights of the Technical Actions/Principles of Play, with exceptional detail on the specific visual cues linked to player actions and habits.",
    },
  },
  {
    key: "organisation",
    label: "Organisation",
    desc: "Set-up, organisation and use of space, time, and resources",
    descriptors: {
      0: "Session is poorly organised and lacks structure and flow.",
      1: "Session shows some structure but lacks consistency in organisation and flow. Transitions are occasionally unclear or slow, and player grouping only partially supports the learning experience.",
      2: "Organisation is adequate; session is structured with clear and smooth transitions. Players are adequately grouped to ensure their learning experience.",
      3: "Organisation is exemplary; session is well-structured, with clear, logical progression, smooth transitions and players are grouped to enhance their learning, directly linked to the game.",
    },
  },
  {
    key: "presenting",
    label: "Presenting",
    desc: "Explain · Engage · Exit — how the coach presents and delivers activities",
    descriptors: {
      0: "Presentation is unclear or ineffective with no demonstration or representation of the 3E's (Engage, Explain and Exit), hindering understanding and engagement.",
      1: "Presentation shows some clarity but is inconsistent in delivery. Limited or inconsistent use of the 3E's, and few methods are used to support player understanding.",
      2: "Presentation is clear and effective, various methods are used to aid the players' understanding. The 3E's (Engage, Explain and Exit) are clearly utilised in delivering advanced concepts.",
      3: "Presentation is highly effective, engaging, and adaptable. Multiple methods are used seamlessly to enhance understanding. The 3E's are embedded purposefully, with precise timing and delivery that maximises player engagement and learning.",
    },
  },
  {
    key: "coaching",
    label: "Coaching",
    desc: "Enter · Enhance/Educate · Ensure — how the coach coaches within activities",
    descriptors: {
      0: "Coaching methods are ineffective, or do not identify the correct time to enter. Coach has an inability to enhance the shape of both teams or the realism within the practice, or educate throughout the session.",
      1: "Coaching methods show some effectiveness but are inconsistent or not always aligned to the session objective. Timing of interventions is irregular or not always appropriate. Limited ability to enhance learning through shape/realism management within the practice, with inconsistent links between visual cues and player actions.",
      2: "Coaching methods are effective, consistent, and aligned with the session objective. Clear identification of when to enter, and shows an ability to enhance the shape/realism within the practice and educate throughout the session, with some specific coaching points and visual cues to player actions given to the players.",
      3: "Coaching methods are highly effective, efficient, content is consistent, language used is clear. Coach identifies an ability to enhance the shape and realism quickly and effectively. Coach is able to enter the practice consistently in the moment and provide a high level of detail in coaching points backed up with clear cues for the players. Coach consistently ensures that learning is taking place through high levels of observation and reinforcement on the run.",
    },
  },
  {
    key: "motivationalClimate",
    label: "Motivational Climate",
    desc: "The environment, culture and motivational climate created for learners",
    descriptors: {
      0: "Environment is poorly managed, with issues in safety, inclusivity, or motivation.",
      1: "Environment is inconsistently managed. Some engagement or inclusive practices are evident, but safety, motivation, or control may be inconsistent. Limited use of strategies to maintain or enhance learning conditions.",
      2: "Environment is managed adequately, with good engagement and inclusive practices but may lack advanced motivational strategies.",
      3: "Environment is expertly managed, ensuring optimal engagement and motivation, creating an ideal setting for advanced development and self-directed learners.",
    },
  },
];

const MAX_SCORE_PER_AREA = 3;
const MAX_TOTAL_SCORE = ASSESSMENT_AREAS.length * MAX_SCORE_PER_AREA;

const SCORE_LEVELS = [
  { value: 0, label: "Not Evident", color: "bg-red-100 text-red-700 border-red-300" },
  { value: 1, label: "Developing", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: 2, label: "Proficient", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: 3, label: "Expertise", color: "bg-green-100 text-green-700 border-green-300" },
];

const DIPLOMA_THRESHOLDS = { "c diploma": 9, "b diploma": 12, "a diploma": 16 };
const HIGHLY_COMPETENT_THRESHOLD = 16;
const POTENTIAL_PATHWAY_OPTIONS = ["Analyst", "High Performance Coach", "S&C Coach"];

function diplomaThresholdFor(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (DIPLOMA_THRESHOLDS[key] !== undefined) return DIPLOMA_THRESHOLDS[key];
  for (const k of Object.keys(DIPLOMA_THRESHOLDS)) {
    if (key.includes(k)) return DIPLOMA_THRESHOLDS[k];
  }
  return null;
}

const COURSE_TITLE_OPTIONS = [
  "Foundation of Football (FoF)",
  "Foundation of Futsal (FoFu)",
  "Foundation of Goalkeeping (FoGK)",
  "AFC/FA C Diploma",
  "AFC/FA B Diploma",
  "AFC/FA A Diploma",
  "AFC/FA Pro Diploma",
  "Workshop",
];

const COURSE_LEVEL_GROUP_ORDER = ["Pro Diploma", "A Diploma", "B Diploma", "C Diploma", "Foundation Courses (FoF)", "Workshops", "Other"];

function courseLevelGroup(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("pro diploma")) return "Pro Diploma";
  if (/\ba diploma\b/.test(t)) return "A Diploma";
  if (/\bb diploma\b/.test(t)) return "B Diploma";
  if (/\bc diploma\b/.test(t)) return "C Diploma";
  if (t.includes("foundation of")) return "Foundation Courses (FoF)";
  if (t.includes("workshop")) return "Workshops";
  return "Other";
}

const PROVIDER_OPTIONS = ["AFC/FA", "FA", "FIFA"];
const LEVEL_OPTIONS = ["Foundation", "Developing", "Performance", "Elite"];

const AGE_GROUP_OPTIONS = [
  "MiniRoos (up to U11)",
  "Junior (U12-U13)",
  "Youth (U14-U20)",
  "Senior (U21 & above)",
  "Mixed age",
];

const FORMAL_CONTEXT_OPTIONS = ["Players", "Coaches"];

const C_DIP_SESSION_TOPICS = ["Dribbling", "Finishing", "Passing", "Receiving", "Delay (1st Defender)", "Cover (2nd Defender)"];

function orderedCDipTopics(preferred) {
  if (!preferred) return C_DIP_SESSION_TOPICS;
  const match = C_DIP_SESSION_TOPICS.find(t => t.toLowerCase() === preferred.trim().toLowerCase());
  if (!match) return C_DIP_SESSION_TOPICS;
  return [match, ...C_DIP_SESSION_TOPICS.filter(t => t !== match)];
}

const COACHING_ACTIVITY_OPTIONS = ["1", "2", "3", "4"];
const COACHING_ACTIVITY_OBJECTIVES = {
  "Dribbling": {
    "1": "Improve my players ability to keep the ball central when dribbling",
    "2": "Improve my players ability to dribble into space and create attacking overloads in a 2v2 situation",
    "3": "Improve my players ability to dribble the ball quickly when they have time and space",
    "4": "Improve my players ability to dribble in various 1v1 situations",
  },
  "Finishing": {
    "1": "Improve my players ability to finish with power",
    "2": "Improve my players ability to finish first time",
    "3": "Improve my players ability to finish with placement",
    "4": "Improve my players ability to finish using smart positioning and different techniques",
  },
  "Passing": {
    "1": "Improve my players ability to pass the ball into feet and into space",
    "2": "Improve my players ability to pass forwards quickly",
    "3": "Improve my players ability to play long driven passes",
    "4": "Improve my players ability to maintain possession and score",
  },
  "Receiving": {
    "1": "Improve my players ability to receive the ball away from pressure and maintain possession",
    "2": "Improve my players ability to receive out of tackling range and maintain possession",
    "3": "Improve my players ability to receive the ball and face forwards",
    "4": "Improve my players ability to receive the ball and face forwards",
  },
  "Delay (1st Defender)": {
    "1": "Improve my players ability to delay when the attacker is running towards them",
    "2": "Improve my players ability to defend in a 1v1 situation to prevent the ball carrier playing forwards",
    "3": "Improve my players ability to defend in a 1v1 situation to delay the ball carrier playing forwards or to intercept the ball",
    "4": "Improve my players ability to delay the ball carrier and force them away from goal",
  },
  "Cover (2nd Defender)": {
    "1": "Improve my players ability to provide cover and intercept forward passes",
    "2": "Improve my players ability to be ready to become the first defender",
    "3": "Improve my players ability to provide cover in a 2v2 situation",
    "4": "Improve my players ability to provide cover and prevent forward actions",
  },
};

const DIPLOMA_BLOCK_OPTIONS_B = ["Block 1", "Block 2", "Block 3"];
const DIPLOMA_BLOCK_OPTIONS_A = ["Block 1", "Block 2", "Block 3", "Block 4"];

function isBDiploma(name) {
  return /\bb diploma\b/i.test(name || "");
}
function isADiploma(name) {
  return /\ba diploma\b/i.test(name || "");
}
function isCDiploma(name) {
  return /\bc diploma\b/i.test(name || "");
}

function groupCoursesByNumber(completedTasks) {
  const map = {};
  completedTasks.forEach(t => {
    const num = (t.courseNumber || "").trim();
    if (!num) return;
    if (!map[num]) map[num] = { courseNumber: num, courseTitle: t.courseTitle, records: [] };
    map[num].records.push(t);
  });
  return Object.values(map);
}

function courseNumericSort(a, b) {
  const na = parseInt(a.courseNumber, 10);
  const nb = parseInt(b.courseNumber, 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.courseNumber.localeCompare(b.courseNumber);
}

function isCoachFullyComplete(record, coachTopics) {
  const { done, total } = courseworkProgress(record, coachTopics);
  if (total === 0) return false;
  const items = courseworkItems(record, coachTopics);
  const hasNYC = items.some(i => i.outcome === "Not Yet Competent") || record.practicalSessionOutcome === "Not Yet Competent";
  return record.attendancePercent >= 100 && done === total && !hasNYC;
}

function outstandingRequirements(t, coachTopics) {
  const reqs = [];
  if (t.attendancePercent < 100) reqs.push("Attendance");
  if ((t.onlineModulesPercent || 0) < 100) reqs.push("Online Modules");
  if (!t.formativeAssessmentDone) reqs.push("Formative Assessment");
  if (isCDiploma(t.courseTitle)) {
    if (t.practicalSessionOutcome === "Not Yet Competent") reqs.push("redo Practical");
    else if (!t.practicalSessionDone) reqs.push("Practical");
  } else if (isBDiploma(t.courseTitle)) {
    const { done, total } = courseworkProgress(t, coachTopics);
    if (done < total) reqs.push("Coursework");
  }
  return reqs;
}

function outcomeBadgeClass(outcome) {
  if (outcome === "Highly Competent") return "bg-violet-100 text-violet-700";
  if (outcome === "Competent") return "bg-emerald-100 text-emerald-700";
  if (outcome === "Not Yet Competent") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-500";
}

function courseworkItems(record, coachTopics, team) {
  const onlineModulesItem = { label: "Online Modules", done: (record.onlineModulesPercent || 0) >= 100, outcome: "", percent: record.onlineModulesPercent || 0 };
  const formativeAssessmentItem = { label: "Formative Assessment", done: !!record.formativeAssessmentDone, outcome: "" };
  if (isCDiploma(record.courseTitle)) {
    return [{ label: "Practical Session", done: !!record.practicalSessionDone, outcome: record.practicalSessionOutcome || "", team: team || "" }, onlineModulesItem, formativeAssessmentItem];
  }
  if (isBDiploma(record.courseTitle)) {
    const topics = (coachTopics || []).slice(0, 4);
    const sessionItems = topics.map(t => ({
      label: t,
      done: !!(record.sessionPlansDone && record.sessionPlansDone[t]),
      outcome: (record.sessionPlansOutcomes && record.sessionPlansOutcomes[t]) || "",
    }));
    const fixedItems = [
      { label: "Goalscoring Presentation", done: !!record.goalscoringPresentationDone, outcome: "", team: team || "" },
      { label: "Game Plan", done: !!record.gamePlanDone, outcome: "" },
      { label: "Analysis Session Plan", done: !!record.analysisSessionPlanDone, outcome: "" },
      { label: "Annual (Yearly) Plan", done: !!record.annualPlanDone, outcome: "" },
      { label: "6WC (6 Week Cycle)", done: !!record.sixWeekCycleDone, outcome: "" },
      { label: "with FC (football conditioning) details", done: !!record.fcDetailsDone, outcome: "" },
    ];
    return [...sessionItems, ...fixedItems, onlineModulesItem, formativeAssessmentItem];
  }
  return [];
}

function computeSessionNumber(observations, coachId, courseNumber, currentId, currentDate) {
  const norm = (courseNumber || "").trim();
  if (!coachId || !norm) return null;
  let pool = observations.filter(o =>
    o.coachId === coachId &&
    (o.courseNumber || "").trim() === norm &&
    (o.status !== "draft" || o.id === currentId)
  );
  if (!pool.some(o => o.id === currentId)) {
    pool = [...pool, { id: currentId, date: currentDate }];
  }
  const sorted = [...pool].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    return a.id === currentId ? 1 : -1;
  });
  const idx = sorted.findIndex(o => o.id === currentId);
  return idx === -1 ? sorted.length : idx + 1;
}

// Member Federations for the PDF header logo — alphabetised by display name,
// defaulting to Football Victoria. Logo URLs are hotlinked from Football
// Australia's own member-federations page (footballaustralia.com.au) —
// same approach as the FV logo already used in the bulk History PDF export
// — rather than recreated graphics. If that page's images ever move, these
// would need updating the same way.
const MEMBER_FEDERATIONS = [
  { key: "Capital", label: "Capital Football", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2020-03/caplognpl.png?itok=72Yn6G9K" },
  { key: "FNSW", label: "Football NSW", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-07/FNSW%20-%20500x500_0.png?itok=gZT5_9tI" },
  { key: "FNT", label: "Football Northern Territory", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FFNT-500x500.png?itok=4jv-0bEU" },
  { key: "FQ", label: "Football Queensland", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FQ-500x500.png?itok=1tFQhETo" },
  { key: "FSA", label: "Football South Australia", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-11/FootballSA-520x520.png?itok=7701s1eg" },
  { key: "FTas", label: "Football Tasmania", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FT-500x500.png?itok=ApnEG5Y_" },
  { key: "FV", label: "Football Victoria", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2022-05/FFV-Memfed-BrandedCard.png?itok=XO8-QVPx" },
  { key: "FWest", label: "Football West", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2019-06/FW-500x500.png?itok=u-RYKimY" },
  { key: "NNSWF", label: "Northern NSW Football", logoUrl: "https://footballaustralia.com.au/sites/default/files/styles/image_600x/public/2020-06/Untitled-14.jpg?itok=Df5mdHPr" },
];
const DEFAULT_MEMBER_FEDERATION = "FV";
function memberFederationLogo(key) {
  return (MEMBER_FEDERATIONS.find(m => m.key === key) || MEMBER_FEDERATIONS.find(m => m.key === DEFAULT_MEMBER_FEDERATION)).logoUrl;
}

const COACH_LEVEL_OPTIONS = [
  "AFC/FA C Diploma",
  "AFC/FA B Diploma",
  "AFC/FA A Diploma",
  "AFC/FA Pro Diploma",
  "UEFA C Licence",
  "UEFA B Licence",
  "UEFA A Licence",
  "UEFA Pro Licence",
];

function isOverseasLicence(level) {
  return /uefa/i.test(level || "");
}

const EDUCATOR_ROLES = {
  informal: ["Coach Education Tutor (CET)", "Technical Director / Coaching Coordinator"],
  formal: ["Coach Education Tutor (CET)"],
};

const ADMIN_LOCKOUT_THRESHOLD = 3;
const ADMIN_LOCKOUT_MS = 30 * 60 * 1000;
const DEFAULT_ADMIN_SETTINGS = { admins: [{ name: "Craig Moore", pin: "8938" }], maxAdmins: 2, leadAdminName: "Craig Moore" };
const MAX_ADMINS = 2;

function migrateAdminSettings(raw) {
  if (!raw) return DEFAULT_ADMIN_SETTINGS;
  const admins = Array.isArray(raw.admins) ? raw.admins : DEFAULT_ADMIN_SETTINGS.admins;
  const migratedAdmins = admins.map(a => {
    if (typeof a === "string") return { name: a, pin: raw.pin || DEFAULT_ADMIN_SETTINGS.admins[0].pin };
    return { name: a.name || "", pin: a.pin || "" };
  }).filter(a => a.name);
  return {
    admins: migratedAdmins.length ? migratedAdmins : DEFAULT_ADMIN_SETTINGS.admins,
    maxAdmins: raw.maxAdmins || MAX_ADMINS,
    leadAdminName: raw.leadAdminName || (migratedAdmins[0] && migratedAdmins[0].name) || DEFAULT_ADMIN_SETTINGS.leadAdminName,
  };
}

function findAdminMatch(admins, name, pin) {
  const trimmedName = (name || "").trim().toLowerCase();
  const trimmedPin = (pin || "").trim();
  if (!trimmedName || !trimmedPin) return null;
  return (admins || []).find(a => a.name.trim().toLowerCase() === trimmedName && a.pin === trimmedPin) || null;
}

function isLockedOut(adminLockouts, name) {
  const key = (name || "").trim().toLowerCase();
  if (!key) return false;
  const entry = adminLockouts[key];
  return !!(entry && entry.lockedUntil > Date.now());
}

function lockoutRemainingMinutes(adminLockouts, name) {
  const key = (name || "").trim().toLowerCase();
  const entry = adminLockouts[key];
  if (!entry || !entry.lockedUntil) return 0;
  return Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 60000));
}

function isLeadAdmin(adminSettings, name) {
  return (adminSettings.leadAdminName || "").trim().toLowerCase() === (name || "").trim().toLowerCase();
}

const VIEW_MODES = [
  { id: "phone", label: "Phone", Icon: Smartphone, maxWidth: "max-w-sm" },
  { id: "tablet", label: "Tablet", Icon: Tablet, maxWidth: "max-w-2xl" },
  { id: "laptop", label: "Laptop", Icon: Laptop, maxWidth: "max-w-5xl" },
];
function maxWidthForViewMode(viewMode) {
  return VIEW_MODES.find(v => v.id === viewMode)?.maxWidth || "max-w-5xl";
}

const SOCHANGEIT_ITEMS = [
  { key: "safeStart", label: "Safe / Start" },
  { key: "observationOrganisation", label: "Observation / Organisation" },
  { key: "coachingStyle", label: "Coaching Style" },
  { key: "howToScore", label: "How to Score" },
  { key: "area", label: "Area" },
  { key: "numbers", label: "Numbers" },
  { key: "gameRules", label: "Game Rules" },
  { key: "engagement", label: "Engagement" },
  { key: "inclusion", label: "Inclusion" },
  { key: "time", label: "Time" },
];

function emptySochangeit() {
  const o = {};
  SOCHANGEIT_ITEMS.forEach(i => o[i.key] = false);
  return o;
}

function emptySessionPlan() {
  return {
    sessionObjective: "",
    numberOfPlayers: "", pitchLength: "", pitchWidth: "", additionalAreas: "", rulesConstraints: "", others: "",
    pitchGeography: [], pitchGeographyOther: "", zonesUsed: [], typeOfSession: [], progressiveType: [], pppType: [],
  };
}

function emptyIdp() {
  return {
    yearsCoaching: "",
    qualifications: "",
    mentor: "",
    strengths: "",
    performanceGap: "",
    goalsPlan: "",
    fileName: "",
    fileText: "",
    updatedAt: "",
  };
}

function idpHasContent(idp) {
  if (!idp) return false;
  return !!(idp.strengths || idp.performanceGap || idp.goalsPlan || idp.fileText);
}

function isTopicSuggestedByGap(topic, performanceGap) {
  if (!topic || !performanceGap) return false;
  const gapLower = performanceGap.toLowerCase();
  const topicWords = topic.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 4);
  return topicWords.some(w => gapLower.includes(w));
}

const SESSION_PLAN_FIELDS = [
  { key: "numberOfPlayers", label: "Number of Players", required: true },
  { key: "sizeOfPitch", label: "Size of Pitch", required: true },
  { key: "additionalAreas", label: "Additional Areas used (i.e. zones)", required: false },
  { key: "rulesConstraints", label: "Rules or Constraints", required: false },
  { key: "others", label: "Others", required: false },
];

const PITCH_GEOGRAPHY_OPTIONS = ["D3", "M3", "F3"];

function zoneThird(n) {
  if (n <= 6) return "D3";
  if (n <= 12) return "M3";
  return "F3";
}

function zoneNeighbors(n) {
  const cols = 6, rows = 3;
  const col = Math.floor((n - 1) / rows);
  const row = (n - 1) % rows;
  const neighbors = [];
  if (col > 0) neighbors.push((col - 1) * rows + row + 1);
  if (col < cols - 1) neighbors.push((col + 1) * rows + row + 1);
  if (row > 0) neighbors.push(col * rows + (row - 1) + 1);
  if (row < rows - 1) neighbors.push(col * rows + (row + 1) + 1);
  return neighbors;
}

const TYPE_OF_SESSION_OPTIONS = [
  "Progressive (PP/PG/GT/TG)",
  "Play / Practice / Play (PPP)",
  "Small Sided Game (SSG)",
  "Coach within Game",
  "Position Specific",
];

const PROGRESSIVE_SUBOPTIONS = ["Positioning Game (PG)", "Game Training (GT)"];
const PPP_SUBOPTIONS = ["Play / Practice", "Practice / Play"];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function downloadCsv(rows, filename) {
  const hasTopics = rows.some(r => Array.isArray(r.topics) && r.topics.length > 0);
  const hasFaNumbers = rows.some(r => (r.faNumber || "").toString().trim());
  const csv = Papa.unparse(rows.map(r => {
    const base = { Name: r.name || "", Club: r.club || "", Level: r.level || "" };
    if (hasTopics) base.Topics = (r.topics || []).join("; ");
    if (hasFaNumbers) base["FA Number"] = r.faNumber || "";
    return base;
  }));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadGenericCsv(rows, filename) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadHtml(html, filename) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function coursesToCsvRows(courses) {
  return courses.map(c => ({
    Title: c.title || "",
    Provider: c.provider || "",
    Level: c.level || "",
    Description: c.description || "",
    "Assessment Areas": (c.areas || []).map(k => ASSESSMENT_AREAS.find(a => a.key === k)?.label).filter(Boolean).join("; "),
  }));
}

function sanitizeAlphanumeric(value) {
  return value.replace(/[^a-zA-Z0-9\s]/g, "");
}

function emptyAreas() {
  const o = {};
  ASSESSMENT_AREAS.forEach(a => o[a.key] = { score: null, notes: "" });
  return o;
}

function areasTotal(areas) {
  if (!areas) return 0;
  return ASSESSMENT_AREAS.reduce((sum, a) => sum + (typeof areas[a.key]?.score === "number" ? areas[a.key].score : 0), 0);
}

function totalForObs(o) {
  if (o.areas) return areasTotal(o.areas);
  return null;
}

function lowerFirst(s) {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

const ACTION_LEAD_INS = {
  0: [
    (label) => `Your ${label} was not evident in this session. This needs direct attention — start by`,
    (label) => `Your ${label} did not meet the required standard here. To address this,`,
    (label) => `There was no clear evidence of ${label} in this session. Prioritise`,
    (label) => `Your ${label} needs to be rebuilt from the fundamentals. Focus first on`,
  ],
  1: [
    (label) => `Your ${label} is below the standard required and needs focused work. Start with`,
    (label) => `Your ${label} is inconsistent and needs to improve. A clear next step is`,
    (label) => `Your ${label} is not yet where it needs to be. Address this directly by`,
    (label) => `Your ${label} requires targeted improvement. The priority now is`,
  ],
  2: [
    (label) => `Your ${label} is in a genuinely good place — what do you think made it click today, and how could you repeat that? If you wanted to push it further, it might be worth considering`,
    (label) => `Solid work on your ${label}. If you had to explain your approach to another coach, what would you tell them? To take it to the next level, you could try`,
    (label) => `Your ${label} is working well for you — what's one small thing you noticed today that you could build on? One refinement that might add even more value is`,
    (label) => `You've got a good handle on your ${label} — how did it feel compared to your last few sessions? A small tweak worth exploring could be`,
  ],
  3: [
    (label) => `Your ${label} is a real strength — what do you think makes it click so consistently for you? Something worth reflecting on to keep it that way is`,
    (label) => `Excellent ${label}! If you had to explain your approach to another coach starting out, what would you say? To maintain that high standard, it could help to keep an eye on`,
    (label) => `Your ${label} stands out as a highlight — how do you keep that level up week to week? Worth thinking about going forward is`,
    (label) => `You're clearly confident with your ${label} — what's next for you to keep growing here? One thing to stay mindful of as you keep developing is`,
  ],
};

function actionLeadIn(score, areaLabel, variantIndex) {
  const label = areaLabel.toLowerCase();
  const templates = ACTION_LEAD_INS[score] || ACTION_LEAD_INS[1];
  const template = templates[variantIndex % templates.length];
  return template(label);
}

const NOTE_LEAD_INS = [
  (snippet) => `Here's something that needs direct attention: ${snippet}`,
  (snippet) => `This needs to be addressed: ${snippet}`,
  (snippet) => `A clear priority coming out of this session: ${snippet}`,
  (snippet) => `This requires focused follow-up: ${snippet}`,
];

const PLAN_LEAD_INS = [
  (snippet) => `Picking up from the plan, take a moment to reflect honestly: ${snippet}`,
  (snippet) => `Building on the session plan notes, ask yourself how this landed: ${snippet}`,
  (snippet) => `Following on from the plan, a good next step to think about could be: ${snippet}`,
  (snippet) => `As flagged in the plan notes, it may help to sit with this: ${snippet}`,
];

function generateActionPlan(areas, areasForDevelopmentText, planNotesText, isNotYetCompetent) {
  const scored = ASSESSMENT_AREAS
    .filter(a => typeof areas[a.key]?.score === "number")
    .map(a => ({ area: a, score: areas[a.key].score }))
    .sort((a, b) => a.score - b.score);

  const actions = scored.slice(0, 3).map(({ area, score }, i) => {
    const targetLevel = Math.min(score + 1, 3);
    const target = lowerFirst(area.descriptors[targetLevel].replace(/\.$/, ""));
    const variantIndex = Math.floor(Math.random() * 4) + i;
    const toneScore = isNotYetCompetent ? Math.min(score, 1) : score;
    return `${actionLeadIn(toneScore, area.label, variantIndex)} ${target}.`;
  });

  const note = (areasForDevelopmentText || "").trim();
  if (actions.length < 3 && note) {
    const snippet = note.length > 110 ? `${note.slice(0, 110).trim()}…` : note;
    const template = NOTE_LEAD_INS[Math.floor(Math.random() * NOTE_LEAD_INS.length)];
    actions.push(template(snippet));
  }

  const plan = (planNotesText || "").trim();
  if (actions.length < 3 && plan) {
    const snippet = plan.length > 110 ? `${plan.slice(0, 110).trim()}…` : plan;
    const template = PLAN_LEAD_INS[Math.floor(Math.random() * PLAN_LEAD_INS.length)];
    actions.push(template(snippet));
  }

  while (actions.length < 3) {
    actions.push("Take a moment to reflect on today's session as a whole — what's one thing you'd carry forward, and what might you try differently next time?");
  }
  return actions.slice(0, 3);
}

function pitchGeometry() {
  const cols = 6, rows = 3;
  const w = 600, h = 320, pad = 16;
  const innerW = w - pad * 2, innerH = h - pad * 2;
  const colW = innerW / cols, rowH = innerH / rows;
  const thirdW = innerW / 3;
  const cx = pad + innerW / 2, cy = pad + innerH / 2;

  const stripeCount = cols;
  const stripeW = innerW / stripeCount;
  const stripes = Array.from({ length: stripeCount }, (_, i) => ({ x: pad + i * stripeW, w: stripeW, dark: i % 2 === 0 }));

  const boxH = innerH * 0.62, boxW = innerW * 0.155;
  const sixH = innerH * 0.30, sixW = innerW * 0.055;
  const goalH = innerH * 0.18, goalW = 8;
  const arcR = innerH * 0.16;
  const cornerR = 10;

  return {
    cols, rows, w, h, pad, innerW, innerH, colW, rowH, thirdW, cx, cy, stripes,
    penaltyBoxes: [
      { x: pad, y: cy - boxH / 2, w: boxW, h: boxH },
      { x: pad + innerW - boxW, y: cy - boxH / 2, w: boxW, h: boxH },
    ],
    sixYardBoxes: [
      { x: pad, y: cy - sixH / 2, w: sixW, h: sixH },
      { x: pad + innerW - sixW, y: cy - sixH / 2, w: sixW, h: sixH },
    ],
    goals: [
      { x: pad - goalW, y: cy - goalH / 2, w: goalW, h: goalH },
      { x: pad + innerW, y: cy - goalH / 2, w: goalW, h: goalH },
    ],
    penaltySpots: [
      { x: pad + boxW * 0.62, y: cy },
      { x: pad + innerW - boxW * 0.62, y: cy },
    ],
    penaltyArcs: [
      `M ${pad + boxW} ${cy - arcR} A ${arcR} ${arcR} 0 0 1 ${pad + boxW} ${cy + arcR}`,
      `M ${pad + innerW - boxW} ${cy - arcR} A ${arcR} ${arcR} 0 0 0 ${pad + innerW - boxW} ${cy + arcR}`,
    ],
    cornerR,
    cornerArcs: [
      `M ${pad + cornerR} ${pad} A ${cornerR} ${cornerR} 0 0 1 ${pad} ${pad + cornerR}`,
      `M ${pad + innerW - cornerR} ${pad} A ${cornerR} ${cornerR} 0 0 0 ${pad + innerW} ${pad + cornerR}`,
      `M ${pad} ${pad + innerH - cornerR} A ${cornerR} ${cornerR} 0 0 0 ${pad + cornerR} ${pad + innerH}`,
      `M ${pad + innerW - cornerR} ${pad + innerH} A ${cornerR} ${cornerR} 0 0 1 ${pad + innerW} ${pad + innerH - cornerR}`,
    ],
    circleR: rowH * 0.75,
  };
}

function PitchZoneDiagram({ selectedZones = [], onToggleZone }) {
  const g = pitchGeometry();
  const { cols, rows, w, h, pad, innerW, innerH, colW, rowH, thirdW } = g;
  const interactive = typeof onToggleZone === "function";
  let zone = 0;
  const zones = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      zone += 1;
      zones.push({ n: zone, x: pad + c * colW, y: pad + r * rowH });
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h + 36}`} className="w-full max-w-lg mx-auto">
      {g.stripes.map((s, i) => (
        <rect key={i} x={s.x} y={pad} width={s.w} height={innerH} fill={s.dark ? "#15a34a" : "#1cb355"} style={{ pointerEvents: "none" }} />
      ))}
      <rect x={pad} y={pad} width={innerW} height={innerH} fill="none" stroke="#ffffff" strokeWidth="2" style={{ pointerEvents: "none" }} />
      <line x1={pad + innerW / 2} y1={pad} x2={pad + innerW / 2} y2={pad + innerH} stroke="#ffffff" strokeWidth="2" style={{ pointerEvents: "none" }} />
      <circle cx={g.cx} cy={g.cy} r={g.circleR} fill="none" stroke="#ffffff" strokeWidth="2" style={{ pointerEvents: "none" }} />
      <circle cx={g.cx} cy={g.cy} r="3" fill="#ffffff" style={{ pointerEvents: "none" }} />
      {g.penaltyBoxes.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#ffffff" strokeWidth="2" style={{ pointerEvents: "none" }} />
      ))}
      {g.sixYardBoxes.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#ffffff" strokeWidth="2" style={{ pointerEvents: "none" }} />
      ))}
      {g.penaltySpots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ffffff" style={{ pointerEvents: "none" }} />
      ))}
      {g.penaltyArcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#ffffff" strokeWidth="2" style={{ pointerEvents: "none" }} />
      ))}
      {g.cornerArcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#ffffff" strokeWidth="1.5" style={{ pointerEvents: "none" }} />
      ))}
      {g.goals.map((gl, i) => (
        <rect key={i} x={gl.x} y={gl.y} width={gl.w} height={gl.h} fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" style={{ pointerEvents: "none" }} />
      ))}
      {zones.map(z => {
        const selected = selectedZones.includes(z.n);
        return (
          <rect key={z.n} x={z.x} y={z.y} width={colW} height={rowH}
            onClick={interactive ? () => onToggleZone(z.n) : undefined}
            fill={selected ? "#f59e0b" : "transparent"}
            fillOpacity={selected ? 0.65 : 1}
            stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1"
            style={{ cursor: interactive ? "pointer" : "default", pointerEvents: interactive ? "all" : "none" }}
          />
        );
      })}
      {zones.map(z => {
        const selected = selectedZones.includes(z.n);
        return (
          <text key={z.n} x={z.x + colW / 2} y={z.y + rowH / 2 + 5} textAnchor="middle" fontSize="14"
            fill={selected ? "#78350f" : "#ffffff"} fontWeight={selected ? "700" : "500"}
            style={{ pointerEvents: "none", userSelect: "none" }}>{z.n}</text>
        );
      })}
      <line x1={pad + thirdW} y1={pad} x2={pad + thirdW} y2={pad + innerH} stroke="#ffffff" strokeWidth="2" strokeDasharray="6,4" strokeOpacity="0.6" style={{ pointerEvents: "none" }} />
      <line x1={pad + thirdW * 2} y1={pad} x2={pad + thirdW * 2} y2={pad + innerH} stroke="#ffffff" strokeWidth="2" strokeDasharray="6,4" strokeOpacity="0.6" style={{ pointerEvents: "none" }} />
      <text x={pad + thirdW / 2} y={h + 22} textAnchor="middle" fontSize="14" fontWeight="600" fill="#475569">Defensive Third (D3)</text>
      <text x={pad + thirdW * 1.5} y={h + 22} textAnchor="middle" fontSize="14" fontWeight="600" fill="#475569">Middle Third (M3)</text>
      <text x={pad + thirdW * 2.5} y={h + 22} textAnchor="middle" fontSize="14" fontWeight="600" fill="#475569">Final Third (F3)</text>
    </svg>
  );
}

function buildPitchZoneSvg(selectedZones) {
  const g = pitchGeometry();
  const { cols, rows, w, h, pad, innerW, innerH, colW, rowH, thirdW } = g;
  let zone = 0;
  let rects = "", texts = "";
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      zone += 1;
      const x = pad + c * colW, y = pad + r * rowH;
      const selected = (selectedZones || []).includes(zone);
      rects += `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" fill="${selected ? "#f59e0b" : "transparent"}" fill-opacity="${selected ? 0.65 : 1}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1" />`;
      texts += `<text x="${x + colW / 2}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="14" fill="${selected ? "#78350f" : "#ffffff"}" font-weight="${selected ? "700" : "500"}">${zone}</text>`;
    }
  }
  const stripes = g.stripes.map(s => `<rect x="${s.x}" y="${pad}" width="${s.w}" height="${innerH}" fill="${s.dark ? "#15a34a" : "#1cb355"}" />`).join("");
  const boxes = [...g.penaltyBoxes, ...g.sixYardBoxes].map(b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="#ffffff" stroke-width="2" />`).join("");
  const spots = g.penaltySpots.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#ffffff" />`).join("");
  const arcs = [...g.penaltyArcs, ...g.cornerArcs].map(d => `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="2" />`).join("");
  const goals = g.goals.map(gl => `<rect x="${gl.x}" y="${gl.y}" width="${gl.w}" height="${gl.h}" fill="#cbd5e1" stroke="#475569" stroke-width="1.5" />`).join("");
  return `<svg viewBox="0 0 ${w} ${h + 36}" style="width:100%;max-width:500px;display:block;margin:0 auto;">
    ${stripes}
    <rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" fill="none" stroke="#ffffff" stroke-width="2" />
    <line x1="${pad + innerW / 2}" y1="${pad}" x2="${pad + innerW / 2}" y2="${pad + innerH}" stroke="#ffffff" stroke-width="2" />
    <circle cx="${g.cx}" cy="${g.cy}" r="${g.circleR}" fill="none" stroke="#ffffff" stroke-width="2" />
    <circle cx="${g.cx}" cy="${g.cy}" r="3" fill="#ffffff" />
    ${boxes}${spots}${arcs}${goals}
    ${rects}${texts}
    <line x1="${pad + thirdW}" y1="${pad}" x2="${pad + thirdW}" y2="${pad + innerH}" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,4" stroke-opacity="0.6" />
    <line x1="${pad + thirdW * 2}" y1="${pad}" x2="${pad + thirdW * 2}" y2="${pad + innerH}" stroke="#ffffff" stroke-width="2" stroke-dasharray="6,4" stroke-opacity="0.6" />
    <text x="${pad + thirdW / 2}" y="${h + 22}" text-anchor="middle" font-size="14" font-weight="600" fill="#475569">Defensive Third (D3)</text>
    <text x="${pad + thirdW * 1.5}" y="${h + 22}" text-anchor="middle" font-size="14" font-weight="600" fill="#475569">Middle Third (M3)</text>
    <text x="${pad + thirdW * 2.5}" y="${h + 22}" text-anchor="middle" font-size="14" font-weight="600" fill="#475569">Final Third (F3)</text>
  </svg>`;
}

// ── Supabase-backed storage layer ────────────────────────────────
// Every array-of-records collection (coaches, courses, cets/educators,
// observations, completedTasks) now gets ONE ROW PER RECORD in its own
// table — this is the actual fix for the multi-user data-loss issue, since
// two people editing different coaches/observations at once now touch
// different rows instead of racing to overwrite one shared JSON blob.
// Small singleton settings (admin list, lockouts, closed course numbers,
// the Lead-Admin session lock) live in one shared kv_settings table,
// keyed by name — low-traffic, admin-only writes, so blob-per-key is fine
// there.
const COLLECTION_TABLE_MAP = {
  coaches: "coaches",
  courses: "courses",
  educators: "cets",
  observations: "observations",
  completedTasks: "completed_tasks",
};
const CODA_STORAGE_KEYS = ["coaches", "courses", "educators", "observations", "completedTasks", "closedCourseNumbers", "adminLockouts", "adminSettings"];

async function loadCollectionSb(table) {
  const { data, error } = await supabase.from(table).select("id, data");
  if (error) { console.error(`Load ${table} failed:`, error); return []; }
  return (data || []).map(row => ({ ...row.data, id: row.id }));
}

async function writeRecordSb(table, item) {
  const { error } = await supabase.from(table).upsert({ id: item.id, data: item, updated_at: new Date().toISOString() });
  if (error) { console.error(`Write to ${table} failed:`, error); throw error; }
}

async function removeRecordSb(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) { console.error(`Delete from ${table} failed:`, error); throw error; }
}

async function syncCollectionSb(table, oldArray, newArray) {
  const newIds = new Set(newArray.map(i => i.id));
  await Promise.all(newArray.map(i => writeRecordSb(table, i)));
  await Promise.all((oldArray || []).filter(i => !newIds.has(i.id)).map(i => removeRecordSb(table, i.id)));
}

// Used by the Import Data tool specifically — adds/updates records from the
// imported file but never deletes anything already in the table. Restoring
// a backup should never be able to silently wipe out real data that was
// added after that backup was taken (e.g. a coach added directly in the
// live app since the export was made).
async function mergeCollectionSb(table, newArray) {
  await Promise.all(newArray.map(i => writeRecordSb(table, i)));
}

async function kvGet(key) {
  const { data, error } = await supabase.from("kv_settings").select("data").eq("key", key).maybeSingle();
  if (error || !data) return null;
  return data.data;
}

async function kvSet(key, value) {
  const { error } = await supabase.from("kv_settings").upsert({ key, data: value, updated_at: new Date().toISOString() });
  if (error) console.error(`kvSet ${key} failed:`, error);
}

async function kvDelete(key) {
  const { error } = await supabase.from("kv_settings").delete().eq("key", key);
  if (error) console.error(`kvDelete ${key} failed:`, error);
}

export default function CoachObservationApp() {
  const [tab, setTab] = useState("dashboard");

  function detectViewMode() {
    if (typeof window === "undefined") return "laptop";
    const w = window.innerWidth;
    if (w < 640) return "phone";
    if (w < 1024) return "tablet";
    return "laptop";
  }
  const [viewMode, setViewMode] = useState(detectViewMode);
  const [viewModeOverridden, setViewModeOverridden] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (viewModeOverridden) return;
      setViewMode(detectViewMode());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewModeOverridden]);

  function handleViewModeChange(mode) {
    setViewModeOverridden(true);
    setViewMode(mode);
  }
  const [coaches, setCoaches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [educators, setEducators] = useState([]);
  const [observations, setObservations] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [closedCourseNumbers, setClosedCourseNumbers] = useState([]);
  const [adminLockouts, setAdminLockouts] = useState({});
  const [adminSettings, setAdminSettings] = useState(DEFAULT_ADMIN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [historyCoachId, setHistoryCoachId] = useState(null);
  const [editingObservationId, setEditingObservationId] = useState(null);
  const [historyAdminAutoOpen, setHistoryAdminAutoOpen] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, co, ed, ob, ct, cc, al, adm] = await Promise.all([
        loadCollectionSb("coaches"),
        loadCollectionSb("courses"),
        loadCollectionSb("cets"),
        loadCollectionSb("observations"),
        loadCollectionSb("completed_tasks"),
        kvGet("closedCourseNumbers"),
        kvGet("adminLockouts"),
        kvGet("adminSettings"),
      ]);
      setCoaches(c || []);
      setCourses(co || []);
      setEducators(ed || []);
      setObservations(ob || []);
      setCompletedTasks(ct || []);
      setClosedCourseNumbers(cc || []);
      setAdminLockouts(al || {});
      try {
        setAdminSettings(migrateAdminSettings(adm));
      } catch (e) {
        setAdminSettings(DEFAULT_ADMIN_SETTINGS);
      }
    } catch (e) {
      setError("Could not load data.");
    }
    setLoading(false);
  }

  const saveCoaches = async (v) => { setCoaches(v); await syncCollectionSb("coaches", coaches, v); };
  const saveCourses = async (v) => { setCourses(v); await syncCollectionSb("courses", courses, v); };
  const saveEducators = async (v) => { setEducators(v); await syncCollectionSb("cets", educators, v); };
  const saveObservations = async (v) => { setObservations(v); await syncCollectionSb("observations", observations, v); };
  const saveCompletedTasks = async (v) => { setCompletedTasks(v); await syncCollectionSb("completed_tasks", completedTasks, v); };
  const saveClosedCourseNumbers = async (v) => { setClosedCourseNumbers(v); await kvSet("closedCourseNumbers", v); };
  const saveAdminLockouts = async (v) => { setAdminLockouts(v); await kvSet("adminLockouts", v); };
  const saveAdminSettings = async (v) => { setAdminSettings(v); await kvSet("adminSettings", v); };

  async function recordAdminAttempt(name, success) {
    const key = (name || "").trim().toLowerCase();
    if (!key) return;
    const current = adminLockouts[key] || { failCount: 0, lockedUntil: 0 };
    let next;
    if (success) {
      next = { failCount: 0, lockedUntil: 0 };
    } else {
      const failCount = current.failCount + 1;
      if (failCount >= ADMIN_LOCKOUT_THRESHOLD) {
        next = { failCount: 0, lockedUntil: Date.now() + ADMIN_LOCKOUT_MS };
      } else {
        next = { failCount, lockedUntil: current.lockedUntil };
      }
    }
    await saveAdminLockouts({ ...adminLockouts, [key]: next });
  }

  const visibleObservations = observations.filter(o => o.status !== "draft");
  const drafts = observations.filter(o => o.status === "draft");
  const editingObservation = editingObservationId ? observations.find(o => o.id === editingObservationId) : null;

  async function handleObservationSaved(obs) {
    const existingIndex = observations.findIndex(o => o.id === obs.id);
    const nextObservations = existingIndex !== -1
      ? observations.map(o => o.id === obs.id ? obs : o)
      : [...observations, obs];
    await saveObservations(nextObservations);

    if (obs.status === "submitted" && obs.coachId) {
      const matchIdx = completedTasks.findIndex(t =>
        t.coachId === obs.coachId &&
        ((obs.courseNumber && (t.courseNumber || "").trim() === obs.courseNumber.trim()) ||
         (!obs.courseNumber && t.courseTitle === obs.formalCourseName))
      );
      if (matchIdx !== -1) {
        const task = completedTasks[matchIdx];
        const updatedTask = { ...task };
        if (isBDiploma(task.courseTitle) && obs.sessionTopic) {
          updatedTask.sessionPlansDone = { ...(task.sessionPlansDone || {}), [obs.sessionTopic]: true };
          updatedTask.sessionPlansOutcomes = { ...(task.sessionPlansOutcomes || {}), [obs.sessionTopic]: obs.assessmentOutcome || "" };
        } else if (isCDiploma(task.courseTitle)) {
          updatedTask.practicalSessionDone = true;
          updatedTask.practicalSessionOutcome = obs.assessmentOutcome || "";
        }
        updatedTask.updatedAt = new Date().toISOString();
        await saveCompletedTasks(completedTasks.map((t, i) => i === matchIdx ? updatedTask : t));
      }
    }

    setEditingObservationId(null);
    setReportId(obs.id);
    setTab("report");
  }

  function handleEditDraft(obs) {
    setEditingObservationId(obs.id);
    setTab("newObs");
  }

  function handleSubmitDraft(obsId) {
    saveObservations(observations.map(o => o.id === obsId ? { ...o, status: "submitted" } : o));
  }

  async function handleDeleteObservation(obsId) {
    const obsToDelete = observations.find(o => o.id === obsId);
    const nextObservations = observations.filter(o => o.id !== obsId);
    await saveObservations(nextObservations);

    if (obsToDelete && obsToDelete.status === "submitted" && obsToDelete.coachId) {
      const matchIdx = completedTasks.findIndex(t =>
        t.coachId === obsToDelete.coachId &&
        ((obsToDelete.courseNumber && (t.courseNumber || "").trim() === obsToDelete.courseNumber.trim()) ||
         (!obsToDelete.courseNumber && t.courseTitle === obsToDelete.formalCourseName))
      );
      if (matchIdx !== -1) {
        const task = completedTasks[matchIdx];
        const updatedTask = { ...task };

        const sameSlot = (o) => o.status === "submitted" && o.coachId === obsToDelete.coachId &&
          ((obsToDelete.courseNumber && (o.courseNumber || "").trim() === obsToDelete.courseNumber.trim()) ||
           (!obsToDelete.courseNumber && o.formalCourseName === obsToDelete.formalCourseName));

        if (isBDiploma(task.courseTitle) && obsToDelete.sessionTopic) {
          const remaining = nextObservations
            .filter(o => sameSlot(o) && o.sessionTopic === obsToDelete.sessionTopic)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          const nextDone = { ...(task.sessionPlansDone || {}) };
          const nextOutcomes = { ...(task.sessionPlansOutcomes || {}) };
          if (remaining.length > 0) {
            nextDone[obsToDelete.sessionTopic] = true;
            nextOutcomes[obsToDelete.sessionTopic] = remaining[0].assessmentOutcome || "";
          } else {
            delete nextDone[obsToDelete.sessionTopic];
            delete nextOutcomes[obsToDelete.sessionTopic];
          }
          updatedTask.sessionPlansDone = nextDone;
          updatedTask.sessionPlansOutcomes = nextOutcomes;
        } else if (isCDiploma(task.courseTitle)) {
          const remaining = nextObservations.filter(sameSlot).sort((a, b) => new Date(b.date) - new Date(a.date));
          if (remaining.length > 0) {
            updatedTask.practicalSessionDone = true;
            updatedTask.practicalSessionOutcome = remaining[0].assessmentOutcome || "";
          } else {
            updatedTask.practicalSessionDone = false;
            updatedTask.practicalSessionOutcome = "";
          }
        }

        updatedTask.updatedAt = new Date().toISOString();
        await saveCompletedTasks(completedTasks.map((t, i) => i === matchIdx ? updatedTask : t));
      }
    }

    if (reportId === obsId) setTab("dashboard");
  }

  function handleBulkDeleteCompletedTasks(ids) {
    const idSet = new Set(ids);
    saveCompletedTasks(completedTasks.filter(t => !idSet.has(t.id)));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header tab={tab} setTab={setTab} viewMode={viewMode} onViewModeChange={handleViewModeChange}
        onAdminClick={() => { setTab("history"); setHistoryAdminAutoOpen(true); }} />
      {error && (
        <div className={`${maxWidthForViewMode(viewMode)} mx-auto px-4 pt-3`}>
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex justify-between items-center gap-3">
            <span>{error}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={loadAll} className="text-xs font-semibold text-red-700 border border-red-300 px-2.5 py-1 rounded-md hover:bg-red-100">Retry</button>
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
      <main className={`${maxWidthForViewMode(viewMode)} mx-auto px-4 py-6`}>
        {tab === "dashboard" && (
          <Dashboard
            coaches={coaches} educators={educators} observations={visibleObservations} courses={courses} drafts={drafts}
            completedTasks={completedTasks} saveCompletedTasks={saveCompletedTasks}
            closedCourseNumbers={closedCourseNumbers} saveClosedCourseNumbers={saveClosedCourseNumbers}
            goNewObs={() => { setEditingObservationId(null); setTab("newObs"); }}
            goHistory={(cid) => { setHistoryCoachId(cid); setTab("history"); }}
            onEditDraft={handleEditDraft}
            onSubmitDraft={handleSubmitDraft}
            onViewDraft={(id) => { setReportId(id); setTab("report"); }}
          />
        )}
        {tab === "newObs" && (
          <NewObservation
            coaches={coaches} courses={courses} educators={educators}
            saveCoaches={saveCoaches} saveEducators={saveEducators}
            observations={observations} saveObservations={saveObservations}
            completedTasks={completedTasks}
            existingObservation={editingObservation}
            onSaved={handleObservationSaved}
            onCancel={() => { setEditingObservationId(null); setTab("dashboard"); }}
          />
        )}
        {tab === "tasks" && (
          <CompletedTasksTab
            coaches={coaches} courses={courses} saveCoaches={saveCoaches}
            completedTasks={completedTasks} saveCompletedTasks={saveCompletedTasks}
            onBulkDelete={handleBulkDeleteCompletedTasks}
            observations={observations}
            onViewReport={(id) => { setReportId(id); setTab("report"); }}
          />
        )}
        {tab === "logistics" && (
          <div className="space-y-8">
            <div className="flex justify-end gap-2">
              <a href="/CODA_Course_Candidate_Sheet_Template.xlsx" download
                className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 border border-emerald-300 px-3 py-2 rounded-lg hover:bg-emerald-50">
                <FileText className="w-4 h-4" /> Course Candidate Sheet Template
              </a>
              <a href="/CODA_How_To_Use.docx" download
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50">
                <FileText className="w-4 h-4" /> How to Use CODA
              </a>
            </div>
            <div>
              <RemoveAllBar
                label="Remove All CETs" count={educators.length} onClear={() => saveEducators([])}
                warningText={`This will permanently delete all ${educators.length} CET${educators.length === 1 ? "" : "s"}. Past observations will remain in History but will no longer show a linked CET profile. This cannot be undone and is restricted to App Admins.`}
                adminSettings={adminSettings} adminLockouts={adminLockouts} recordAdminAttempt={recordAdminAttempt}
              />
              <CetTab educators={educators} saveEducators={saveEducators} observations={visibleObservations} />
            </div>
            <CoursesTab
              courses={courses} saveCourses={saveCourses} adminSettings={adminSettings}
              adminLockouts={adminLockouts} recordAdminAttempt={recordAdminAttempt}
            />
            <div>
              <RemoveAllBar
                label="Remove All Coaches" count={coaches.length} onClear={() => saveCoaches([])}
                warningText={`This will permanently delete all ${coaches.length} coach${coaches.length === 1 ? "" : "es"}. Past observations will remain in History but will no longer show a linked coach profile. This cannot be undone and is restricted to App Admins.`}
                adminSettings={adminSettings} adminLockouts={adminLockouts} recordAdminAttempt={recordAdminAttempt}
              />
              <CoachesTab
                coaches={coaches} observations={visibleObservations}
                saveCoaches={saveCoaches}
                goHistory={(cid) => { setHistoryCoachId(cid); setTab("history"); }}
              />
            </div>
          </div>
        )}
        {tab === "report" && reportId && (
          <ReportView
            observations={observations}
            reportId={reportId}
            coaches={coaches}
            onBack={() => setTab("dashboard")}
            onEditDraft={handleEditDraft}
            onSubmitDraft={handleSubmitDraft}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            coaches={coaches} educators={educators} observations={visibleObservations}
            coachId={historyCoachId} setCoachId={setHistoryCoachId}
            onView={(id) => { setReportId(id); setTab("report"); }}
            onClearHistory={() => saveObservations(observations.filter(o => o.status === "draft"))}
            onDeleteObservation={handleDeleteObservation}
            adminSettings={adminSettings}
            saveAdminSettings={saveAdminSettings}
            adminLockouts={adminLockouts} recordAdminAttempt={recordAdminAttempt}
            autoOpenAdmin={historyAdminAutoOpen} onAutoOpenHandled={() => setHistoryAdminAutoOpen(false)}
          />
        )}
      </main>
    </div>
  );
}

function Header({ tab, setTab, viewMode, onViewModeChange, onAdminClick }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "newObs", label: "New Observation", icon: ClipboardList },
    { id: "tasks", label: "Completed Tasks", icon: ListChecks },
    { id: "logistics", label: "Logistics", icon: Settings },
    { id: "history", label: "History", icon: FileText },
  ];
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className={`${maxWidthForViewMode(viewMode)} mx-auto px-4`}>
        <div className="flex items-center justify-between py-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity" title="Back to CODA home">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">Coach Session Observation</h1>
              <p className="text-xs text-slate-400 leading-tight">Coach Observation Development App</p>
            </div>
          </a>
          {onViewModeChange && (
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {VIEW_MODES.map(v => {
                const Icon = v.Icon;
                const active = viewMode === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => onViewModeChange(v.id)}
                    title={v.label}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 -mb-px">
          {items.map(it => {
            const Icon = it.icon;
            const active = tab === it.id || (tab === "report" && it.id === "history");
            return (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-colors ${
                  active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </button>
            );
          })}
          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 mb-2 text-sm font-semibold text-blue-700 border-2 border-blue-500 rounded-lg whitespace-nowrap hover:bg-blue-50 transition-colors shrink-0"
            >
              <Lock className="w-3.5 h-3.5" /> Admin
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function Dashboard({ coaches, educators, observations, courses, drafts, completedTasks, saveCompletedTasks, closedCourseNumbers, saveClosedCourseNumbers, goNewObs, goHistory, onEditDraft, onSubmitDraft, onViewDraft }) {
  const coachSummaries = Object.values(
    observations.reduce((acc, o) => {
      if (!acc[o.coachId]) {
        acc[o.coachId] = { coachId: o.coachId, coachName: o.coachName, count: 0, lastDate: o.date };
      }
      acc[o.coachId].count += 1;
      if (new Date(o.date) > new Date(acc[o.coachId].lastDate)) acc[o.coachId].lastDate = o.date;
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500">Shared workspace for all Coach Educators</p>
        </div>
        <button onClick={goNewObs} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
          <Plus className="w-4 h-4" /> New Observation
        </button>
      </div>

      {(courses.length === 0 || coaches.length === 0 || educators.length === 0) && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Some data appears to be missing</p>
              <p className="text-xs text-amber-700 mt-0.5">This usually happens the first time you open the published link, or after a storage reset. Upload your backup files to restore everything.</p>
            </div>
          </div>
          <div className="pl-8 flex flex-wrap gap-2 text-xs font-semibold">
            {courses.length === 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">⚠ Course Library is empty — go to Course Library → Bulk Upload</span>
            )}
            {coaches.length === 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">⚠ No coaches found — go to Coaches &amp; CETs → Bulk Upload</span>
            )}
            {educators.length === 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">⚠ No CETs found — go to Coaches &amp; CETs → Bulk Upload</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Coaches Tracked" value={coaches.length} icon={Users} />
        <StatCard label="Observations Logged" value={observations.length} icon={ClipboardList} />
        <StatCard label="Courses in Library" value={courses.length} icon={BookOpen} />
      </div>

      {drafts && drafts.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-1.5"><Clock className="w-4 h-4" /> Drafts ({drafts.length})</h3>
            <p className="text-xs text-amber-600">Saved but not yet submitted</p>
          </div>
          <div className="divide-y divide-slate-100">
            {[...drafts].sort((a, b) => new Date(b.date) - new Date(a.date)).map(d => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div onClick={() => onViewDraft(d.id)} className="cursor-pointer flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.coachName || "Unnamed coach"}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {d.sessionType === "formal" ? `Formal · ${d.formalCourseName || "Course"}` : "Informal"} · {new Date(d.date).toLocaleDateString("en-GB")} · {d.coachEducatorName || "No CET set"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onEditDraft(d)} className="flex items-center gap-1 text-xs font-semibold text-amber-700 border border-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-50">
                    <Pencil className="w-3 h-3" /> Continue
                  </button>
                  <button onClick={() => onSubmitDraft(d.id)} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 border border-emerald-300 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50">
                    <Check className="w-3 h-3" /> Submit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Recent Observations</h3>
        </div>
        {coachSummaries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No observations yet. Start your first one above.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {coachSummaries.map(c => (
              <div key={c.coachId} onClick={() => goHistory(c.coachId)} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.coachName}</p>
                  <p className="text-xs text-slate-400">Last observed {new Date(c.lastDate).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{c.count} session{c.count === 1 ? "" : "s"} observed</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CourseTrackingSections
        coaches={coaches} completedTasks={completedTasks} saveCompletedTasks={saveCompletedTasks}
        closedCourseNumbers={closedCourseNumbers} saveClosedCourseNumbers={saveClosedCourseNumbers}
        goHistory={goHistory}
      />
    </div>
  );
}

function CourseTrackingSections({ coaches, completedTasks, saveCompletedTasks, closedCourseNumbers, saveClosedCourseNumbers, goHistory }) {
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [expandedOpenCourse, setExpandedOpenCourse] = useState(null);
  const [groupDaysInputs, setGroupDaysInputs] = useState({});
  const [individualDaysInputs, setIndividualDaysInputs] = useState({});
  const groups = groupCoursesByNumber(completedTasks);
  const openGroups = groups.filter(g => !closedCourseNumbers.includes(g.courseNumber)).sort(courseNumericSort);
  const completedGroups = groups.filter(g => closedCourseNumbers.includes(g.courseNumber)).sort(courseNumericSort);

  function maxDaysFor(courseTitle) {
    return isCDiploma(courseTitle) ? 4 : 9;
  }

  function daysFromPercent(pct, maxDays) {
    return Math.round((pct / 100) * maxDays);
  }

  function applyGroupAttendance(group) {
    const maxDays = maxDaysFor(group.courseTitle);
    const raw = groupDaysInputs[group.courseNumber];
    if (raw === undefined || raw === "") return;
    const days = Math.max(0, Math.min(maxDays, Number(raw)));
    if (isNaN(days)) return;
    const pct = Math.round((days / maxDays) * 100);
    const idsInGroup = new Set(group.records.map(r => r.id));
    saveCompletedTasks(completedTasks.map(t => idsInGroup.has(t.id) ? { ...t, attendancePercent: pct, updatedAt: new Date().toISOString() } : t));
  }

  function applyIndividualAttendance(task) {
    const maxDays = maxDaysFor(task.courseTitle);
    const raw = individualDaysInputs[task.id];
    if (raw === undefined || raw === "") return;
    const days = Math.max(0, Math.min(maxDays, Number(raw)));
    if (isNaN(days)) return;
    const pct = Math.round((days / maxDays) * 100);
    saveCompletedTasks(completedTasks.map(t => t.id === task.id ? { ...t, attendancePercent: pct, updatedAt: new Date().toISOString() } : t));
  }

  function closeCourse(courseNumber) {
    saveClosedCourseNumbers([...closedCourseNumbers, courseNumber]);
  }

  function coachTopicsFor(coachId) {
    return coaches.find(c => c.id === coachId)?.topics;
  }

  const incompleteEntries = completedGroups.flatMap(g =>
    g.records
      .filter(t => !isCoachFullyComplete(t, coachTopicsFor(t.coachId)))
      .map(t => {
        const { done, total } = courseworkProgress(t, coachTopicsFor(t.coachId));
        return { ...t, courseNumber: g.courseNumber, done, total };
      })
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Open Courses</h3>
        </div>
        {openGroups.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No open courses yet — these appear once a Completed Tasks record has a Course Number set.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {openGroups.map(g => {
              const maxDays = maxDaysFor(g.courseTitle);
              const isExpanded = expandedOpenCourse === g.courseNumber;
              return (
                <div key={g.courseNumber}>
                  <div className="px-5 py-3 flex items-center justify-between gap-3">
                    <button onClick={() => setExpandedOpenCourse(isExpanded ? null : g.courseNumber)}
                      className="flex-1 min-w-0 text-left flex items-center gap-2 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">#{g.courseNumber} — {g.courseTitle}</p>
                        <p className="text-xs text-slate-400">{g.records.length} coach{g.records.length === 1 ? "" : "es"} tracked · out of {maxDays} days</p>
                      </div>
                    </button>
                    <button onClick={() => closeCourse(g.courseNumber)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 whitespace-nowrap shrink-0">
                      <Check className="w-3.5 h-3.5" /> Close Course
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3">
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                        <p className="text-xs font-semibold text-indigo-800 mb-1.5">Update attendance for all coaches in this course</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input type="number" min="0" max={maxDays} placeholder={`Days completed (0–${maxDays})`}
                            value={groupDaysInputs[g.courseNumber] ?? ""}
                            onChange={e => setGroupDaysInputs(prev => ({ ...prev, [g.courseNumber]: e.target.value }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44 bg-white" />
                          <button onClick={() => applyGroupAttendance(g)}
                            className="bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-indigo-700">
                            Apply to All
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-500">Or update individually</p>
                        {[...g.records].sort((a, b) => a.coachName.localeCompare(b.coachName)).map(t => {
                          const currentDays = daysFromPercent(t.attendancePercent, maxDays);
                          return (
                            <div key={t.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{t.coachName}</p>
                                <p className="text-xs text-slate-400">Currently {currentDays}/{maxDays} days ({t.attendancePercent}%)</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <input type="number" min="0" max={maxDays}
                                  value={individualDaysInputs[t.id] ?? currentDays}
                                  onChange={e => setIndividualDaysInputs(prev => ({ ...prev, [t.id]: e.target.value }))}
                                  className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center" />
                                <button onClick={() => applyIndividualAttendance(t)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">Update</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Completed Courses</h3>
        </div>
        {completedGroups.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No completed courses yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedGroups.map(g => (
              <div key={g.courseNumber}>
                <button onClick={() => setExpandedCourse(expandedCourse === g.courseNumber ? null : g.courseNumber)}
                  className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">#{g.courseNumber} — {g.courseTitle}</p>
                    <p className="text-xs text-slate-400">{g.records.length} coach{g.records.length === 1 ? "" : "es"} tracked</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${expandedCourse === g.courseNumber ? "rotate-90" : ""}`} />
                </button>
                {expandedCourse === g.courseNumber && (
                  <div className="px-5 pb-3 space-y-2">
                    {[...g.records].sort((a, b) => a.coachName.localeCompare(b.coachName)).map(t => {
                      const { done, total } = courseworkProgress(t, coachTopicsFor(t.coachId));
                      const complete = isCoachFullyComplete(t, coachTopicsFor(t.coachId));
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{t.coachName}</p>
                            <p className="text-xs text-slate-400">
                              Attendance {t.attendancePercent}%{total > 0 ? ` · Coursework ${done}/${total}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {complete ? "Completed" : "Incomplete"}
                            </span>
                            <button onClick={() => goHistory(t.coachId)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">History</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Incompleted Course</h3>
          <p className="text-xs text-slate-400">Coaches from Completed Courses who still have outstanding attendance or coursework.</p>
        </div>
        {incompleteEntries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No outstanding coaches on any completed course.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {incompleteEntries.map(t => {
              const reqs = outstandingRequirements(t, coachTopicsFor(t.coachId));
              return (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.coachName}</p>
                    <p className="text-xs text-slate-400">
                      #{t.courseNumber} — {t.courseTitle} · Attendance {t.attendancePercent}%{t.total > 0 ? ` · Coursework ${t.done}/${t.total}` : ""}
                    </p>
                    {reqs.length > 0 && (
                      <p className="text-xs font-semibold text-red-600 mt-0.5">Still needed: {reqs.join(", ")}</p>
                    )}
                  </div>
                  <button onClick={() => goHistory(t.coachId)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">History</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function RemoveAllBar({ label, count, onClear, warningText, adminSettings, adminLockouts, recordAdminAttempt }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [pin, setPin] = useState("");
  const [clearError, setClearError] = useState(false);

  function handleOpenConfirm() {
    setConfirmClear(true);
    setAdminName("");
    setPin("");
    setClearError(false);
  }

  function handleConfirmClear() {
    if (isLockedOut(adminLockouts, adminName)) {
      setClearError(true);
      return;
    }
    const match = findAdminMatch(adminSettings.admins, adminName, pin);
    if (!match) {
      recordAdminAttempt(adminName, false);
      setClearError(true);
      return;
    }
    recordAdminAttempt(adminName, true);
    onClear();
    setConfirmClear(false);
    setAdminName("");
    setPin("");
    setClearError(false);
  }

  function handleCancelClear() {
    setConfirmClear(false);
    setAdminName("");
    setPin("");
    setClearError(false);
  }

  if (count === 0) return null;

  return (
    <div className="space-y-3 mb-3">
      <div className="flex justify-end">
        <button onClick={handleOpenConfirm} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> {label}
        </button>
      </div>
      {confirmClear && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 flex-1">{warningText}</p>
          </div>
          <div className="pl-6 grid sm:grid-cols-2 gap-2">
            <input value={adminName} onChange={e => { setAdminName(e.target.value); setClearError(false); }} placeholder="Admin name"
              className={`border rounded-lg px-3 py-2 text-sm ${clearError ? "border-red-400" : "border-red-200"}`} />
            <input type="password" inputMode="numeric" maxLength={4} value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setClearError(false); }} placeholder="Admin PIN"
              className={`border rounded-lg px-3 py-2 text-sm text-center tracking-widest ${clearError ? "border-red-400" : "border-red-200"}`} />
          </div>
          <div className="pl-6 flex items-center gap-2">
            <button onClick={handleConfirmClear} className="text-sm font-semibold text-red-700 hover:text-red-800 whitespace-nowrap">Remove All</button>
            <button onClick={handleCancelClear} className="text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
          </div>
          {clearError && (
            <p className="text-xs text-red-600 pl-6">
              {isLockedOut(adminLockouts, adminName)
                ? `Too many incorrect attempts — locked for ${lockoutRemainingMinutes(adminLockouts, adminName)} more minute${lockoutRemainingMinutes(adminLockouts, adminName) === 1 ? "" : "s"}.`
                : "Incorrect admin name or PIN."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CoachesTab({ coaches, observations, saveCoaches, goHistory }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [levelOption, setLevelOption] = useState("");
  const [level, setLevel] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const [faNumberInput, setFaNumberInput] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [parsedRows, setParsedRows] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [idpEditingId, setIdpEditingId] = useState(null);
  const [idpForm, setIdpForm] = useState(emptyIdp());
  const [idpParsing, setIdpParsing] = useState(false);
  const [idpError, setIdpError] = useState("");

  function openIdpEditor(coach) {
    setIdpEditingId(coach.id);
    setIdpForm(coach.idp ? { ...emptyIdp(), ...coach.idp } : emptyIdp());
    setIdpError("");
  }

  function closeIdpEditor() {
    setIdpEditingId(null);
    setIdpForm(emptyIdp());
    setIdpError("");
  }

  function setIdpField(key, val) {
    setIdpForm(prev => ({ ...prev, [key]: val }));
  }

  function handleIdpFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      setIdpError("Please upload a .docx file.");
      return;
    }
    setIdpParsing(true);
    setIdpError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const arrayBuffer = ev.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setIdpForm(prev => ({ ...prev, fileName: file.name, fileText: (result?.value || "").trim() }));
      } catch (err) {
        setIdpError("Could not read this document. You can still fill in the fields manually.");
      }
      setIdpParsing(false);
    };
    reader.onerror = () => { setIdpError("Could not read this file."); setIdpParsing(false); };
    reader.readAsArrayBuffer(file);
  }

  function removeIdpFile() {
    setIdpForm(prev => ({ ...prev, fileName: "", fileText: "" }));
  }

  function saveIdp() {
    saveCoaches(coaches.map(c => c.id === idpEditingId
      ? { ...c, idp: { ...idpForm, updatedAt: new Date().toISOString() } }
      : c));
    closeIdpEditor();
  }

  function handleDownloadIdpPdf(coach) {
    const idp = coach.idp || {};
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups for this site to download a PDF.");
      return;
    }
    const esc = (s) => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    win.document.write(`
      <html>
        <head><title>${esc(coach.name)} - Individual Development Plan</title></head>
        <body style="margin:0; font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color:#1e293b;">
          <h1 style="margin:0 0 4px 0;">Coach Development Plan</h1>
          <p style="color:#64748b; margin:0 0 20px 0;">${esc(idp.qualifications) || esc(coach.level) || "Individual Development Plan"}</p>
          <table style="width:100%; font-size:13px; margin-bottom:20px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;"><strong>Name:</strong> ${esc(coach.name)}</td>
              <td style="padding:4px 0;"><strong>Team:</strong> ${esc(coach.club) || "—"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;"><strong>Years Coaching:</strong> ${esc(idp.yearsCoaching) || "—"}</td>
              <td style="padding:4px 0;"><strong>Qualifications:</strong> ${esc(idp.qualifications) || esc(coach.level) || "—"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;" colspan="2"><strong>Mentor:</strong> ${esc(idp.mentor) || "—"}</td>
            </tr>
          </table>
          <h3 style="margin-bottom:4px;">Strengths</h3>
          <p style="font-size:13px; margin-top:0; white-space:pre-wrap;">${esc(idp.strengths) || "—"}</p>
          <h3 style="margin-bottom:4px;">Performance Gap</h3>
          <p style="font-size:13px; margin-top:0; white-space:pre-wrap;">${esc(idp.performanceGap) || "—"}</p>
          <h3 style="margin-bottom:4px;">Goals / Plan</h3>
          <p style="font-size:13px; margin-top:0; white-space:pre-wrap;">${esc(idp.goalsPlan) || "—"}</p>
          ${idp.fileText ? `<h3 style="margin-bottom:4px;">Uploaded Document Notes</h3><p style="font-size:12px; margin-top:0; white-space:pre-wrap; color:#475569;">${esc(idp.fileText)}</p>` : ""}
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  function handleLevelOptionChange(value) {
    setLevelOption(value);
    setLevel(value === "__other__" ? "" : value);
  }

  function addCoach() {
    if (!name.trim()) return;
    const topics = topicsInput.trim() ? topicsInput.split(/[;,]/).map(t => t.trim()).filter(Boolean) : [];
    const newCoach = { id: uid(), name: name.trim(), club: club.trim(), level: level.trim(), topics, faNumber: faNumberInput.trim() };
    saveCoaches([...coaches, newCoach]);
    setName(""); setClub(""); setLevel(""); setLevelOption(""); setTopicsInput(""); setFaNumberInput(""); setShowForm(false);
  }

  function matchKey(name, club) {
    return `${(name || "").trim().toLowerCase()}__${(club || "").trim().toLowerCase()}`;
  }

  function normalizeRows(rows) {
    const existingKeys = new Set(coaches.map(c => matchKey(c.name, c.club)));
    const seenInFile = new Set();
    return rows
      .map(r => {
        const obj = {};
        Object.keys(r).forEach(k => { obj[k.trim().toLowerCase()] = r[k]; });
        const name = (obj.name || obj["coach name"] || obj["coach"] || "").toString().trim();
        const club = (obj.club || obj.team || obj["club / team"] || "").toString().trim();
        const level = (obj.level || obj["coaching level"] || "").toString().trim();
        const topicsRaw = (obj.topics || obj["session topics"] || obj["topics covered"] || "").toString().trim();
        const topics = topicsRaw ? topicsRaw.split(/[;,]/).map(t => t.trim()).filter(Boolean) : [];
        const faNumber = (obj["fa number"] || obj["fanumber"] || obj.fa || "").toString().trim();
        return { name, club, level, topics, faNumber };
      })
      .filter(r => r.name.length > 0)
      .map(r => {
        const key = matchKey(r.name, r.club);
        const isDuplicate = existingKeys.has(key) || seenInFile.has(key);
        seenInFile.add(key);
        return { ...r, isDuplicate };
      });
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setParsedRows(null);
    setParsing(true);
    const isCsv = /\.csv$/i.test(file.name);

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const result = Papa.parse(ev.target.result, {
            header: true, skipEmptyLines: true, dynamicTyping: false, delimitersToGuess: [",", ";", "\t"],
          });
          const rows = normalizeRows(result.data || []);
          if (rows.length === 0) setUploadError("No valid rows found. Make sure there's a 'Name' column.");
          setParsedRows(rows);
        } catch (err) {
          setUploadError("Could not parse this CSV file.");
        }
        setParsing(false);
      };
      reader.onerror = () => { setUploadError("Could not read this file."); setParsing(false); };
      reader.readAsText(file);
    } else {
      setUploadError("Please upload a .csv file.");
      setParsing(false);
    }
  }

  function confirmImport() {
    if (!parsedRows || parsedRows.length === 0) return;
    const rowsToImport = includeDuplicates ? parsedRows : parsedRows.filter(r => !r.isDuplicate);
    if (rowsToImport.length === 0) return;
    const newCoaches = rowsToImport.map(r => ({ id: uid(), name: r.name, club: r.club, level: r.level, topics: r.topics || [], faNumber: r.faNumber || "" }));
    saveCoaches([...coaches, ...newCoaches]);
    setShowUpload(false); setParsedRows(null); setUploadError(null); setIncludeDuplicates(false);
  }

  function cancelUpload() {
    setShowUpload(false); setParsedRows(null); setUploadError(null); setIncludeDuplicates(false);
  }

  function deleteCoach(id) {
    saveCoaches(coaches.filter(c => c.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900">Coaches (unassigned or workshop)</h2>
        <div className="flex gap-2">
          <button onClick={() => downloadCsv(coaches, "coaches.csv")} disabled={coaches.length === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white">
            <FileText className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => { setShowUpload(s => !s); setShowForm(false); }} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button onClick={() => { setShowForm(s => !s); setShowUpload(false); }} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> Add Coach
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Bulk upload coaches</p>
            <p className="text-xs text-slate-400">Upload a .csv file with columns for Name (required), Club, Level, and Topics (semicolon or comma-separated session topics for this coach).</p>
          </div>
          <input type="file" accept=".csv" onChange={handleFile}
            className="block w-full text-sm text-slate-600 border border-slate-300 rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm" />

          {parsing && <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading file...</p>}

          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
            </div>
          )}

          {parsedRows && parsedRows.length > 0 && (() => {
            const dupCount = parsedRows.filter(r => r.isDuplicate).length;
            const newCount = parsedRows.length - dupCount;
            const importCount = includeDuplicates ? parsedRows.length : newCount;
            return (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Found {newCount} new coach{newCount === 1 ? "" : "es"}
                  {dupCount > 0 && <span className="text-amber-600"> · {dupCount} possible duplicate{dupCount === 1 ? "" : "s"} (matched by name + club)</span>}
                </p>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {parsedRows.map((r, i) => (
                    <div key={i} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{r.name}</span>
                        {r.isDuplicate && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Duplicate</span>}
                      </span>
                      <span className="text-xs text-slate-400">{[r.club, r.level].filter(Boolean).join(" · ") || "—"}</span>
                    </div>
                  ))}
                </div>
                {dupCount > 0 && (
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={includeDuplicates} onChange={e => setIncludeDuplicates(e.target.checked)} className="rounded border-slate-300" />
                    Import duplicates anyway
                  </label>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmImport} disabled={importCount === 0}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-slate-300">
                    Import {importCount} Coach{importCount === 1 ? "" : "es"}
                  </button>
                  <button onClick={cancelUpload} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Coach name" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input value={club} onChange={e => setClub(e.target.value)} placeholder="Club / Team" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={levelOption} onChange={e => handleLevelOptionChange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select coaching level...</option>
              {COACH_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="__other__">Other (type your own)</option>
            </select>
          </div>
          {levelOption === "__other__" && (
            <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Custom coaching level" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Session Topics (comma-separated, optional)</label>
            <input value={topicsInput} onChange={e => setTopicsInput(e.target.value)} placeholder="e.g. Passing, Shooting, Defending 1v1"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">FA Number (optional)</label>
            <input value={faNumberInput} onChange={e => setFaNumberInput(e.target.value)} placeholder="e.g. 1234567"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={addCoach} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save Coach</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
          </div>
        </div>
      )}

      {coaches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">No coaches added yet.</div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by first or last name..."
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
          </div>
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const filtered = [...coaches]
              .sort((a, b) => a.name.localeCompare(b.name))
              .filter(c => !q || c.name.toLowerCase().split(/\s+/).some(part => part.includes(q)));
            if (filtered.length === 0) {
              return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">{q ? `No coaches match "${searchQuery}".` : "No coaches added yet."}</div>;
            }
            return (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map(c => {
                  const obsCount = observations.filter(o => o.coachId === c.id).length;
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div onClick={() => goHistory(c.id)} className="cursor-pointer flex-1">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{[c.club, c.level].filter(Boolean).join(" · ") || "No details"}</p>
                          {c.faNumber && <p className="text-xs text-slate-400">FA: {c.faNumber}</p>}
                          {idpHasContent(c.idp) && (
                            <span className="inline-block mt-1 text-xs font-medium bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">IDP on file</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{obsCount} obs.</span>
                          <button onClick={() => idpEditingId === c.id ? closeIdpEditor() : openIdpEditor(c)}
                            className="flex items-center gap-1 text-xs font-semibold text-sky-700 border border-sky-200 px-2 py-1 rounded-md hover:bg-sky-50">
                            <FileText className="w-3.5 h-3.5" /> IDP
                          </button>
                          {idpHasContent(c.idp) && (
                            <button onClick={() => handleDownloadIdpPdf(c)}
                              className="flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-300 px-2 py-1 rounded-md hover:bg-slate-100">
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </button>
                          )}
                          <button onClick={() => setConfirmDeleteId(c.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {confirmDeleteId === c.id && (
                        <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                          <p className="text-xs text-red-700 flex-1">Delete {c.name}? Their past observations will remain in History but no longer be linked to a coach profile.</p>
                          <button onClick={() => deleteCoach(c.id)} className="text-xs font-semibold text-red-700 hover:text-red-800 whitespace-nowrap">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
                        </div>
                      )}
                      {idpEditingId === c.id && (
                        <div className="mt-3 border border-sky-200 bg-sky-50 rounded-lg p-3 space-y-3">
                          <p className="text-sm font-semibold text-sky-900">Individual Development Plan — {c.name}</p>
                          <div className="grid sm:grid-cols-3 gap-2">
                            <input value={idpForm.yearsCoaching} onChange={e => setIdpField("yearsCoaching", e.target.value)} placeholder="Years Coaching"
                              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs" />
                            <input value={idpForm.qualifications} onChange={e => setIdpField("qualifications", e.target.value)} placeholder="Qualifications"
                              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs" />
                            <input value={idpForm.mentor} onChange={e => setIdpField("mentor", e.target.value)} placeholder="Mentor"
                              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-sky-800 mb-1 block">Strengths</label>
                            <textarea value={idpForm.strengths} onChange={e => setIdpField("strengths", e.target.value)} rows={2}
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-sky-800 mb-1 block">Performance Gap</label>
                            <textarea value={idpForm.performanceGap} onChange={e => setIdpField("performanceGap", e.target.value)} rows={2}
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-sky-800 mb-1 block">Goals / Plan (planned outcomes — links to Key Outcomes Focus)</label>
                            <textarea value={idpForm.goalsPlan} onChange={e => setIdpField("goalsPlan", e.target.value)} rows={3}
                              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-sky-800 mb-1 block">Upload IDP document (.docx, optional)</label>
                            {idpForm.fileName ? (
                              <div className="flex items-center justify-between border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
                                <span className="text-xs text-slate-600 truncate">{idpForm.fileName}</span>
                                <button onClick={removeIdpFile} className="text-xs font-semibold text-red-600 hover:text-red-700 shrink-0 ml-2">Remove</button>
                              </div>
                            ) : (
                              <input type="file" accept=".docx" onChange={handleIdpFile}
                                className="block w-full text-xs text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs" />
                            )}
                            {idpParsing && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Reading document...</p>}
                            {idpError && <p className="text-xs text-red-600 mt-1">{idpError}</p>}
                            {idpForm.fileText && (
                              <p className="text-xs text-slate-400 mt-1">Extracted text will show alongside this coach's IDP when starting a new observation. Copy the relevant part into Goals/Plan above if you want it to auto-link.</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveIdp} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Save IDP</button>
                            <button onClick={closeIdpEditor} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function CetTab({ educators, saveEducators, observations }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [levelOption, setLevelOption] = useState("");
  const [level, setLevel] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [parsedRows, setParsedRows] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function handleLevelOptionChange(value) {
    setLevelOption(value);
    setLevel(value === "__other__" ? "" : value);
  }

  function addCet() {
    if (!name.trim()) return;
    const newCet = { id: uid(), name: name.trim(), club: org.trim(), level: level.trim() };
    saveEducators([...educators, newCet]);
    setName(""); setOrg(""); setLevel(""); setLevelOption(""); setShowForm(false);
  }

  function matchKey(name, club) {
    return `${(name || "").trim().toLowerCase()}__${(club || "").trim().toLowerCase()}`;
  }

  function normalizeRows(rows) {
    if (!rows.length) return [];
    const headers = Object.keys(rows[0]);
    const nameHeader = guessNameHeader(headers);
    const existingKeys = new Set(educators.map(c => matchKey(c.name, c.club)));
    const seenInFile = new Set();
    return rows
      .map(r => {
        const obj = {};
        Object.keys(r).forEach(k => { obj[k.trim().toLowerCase()] = r[k]; });
        const name = (r[nameHeader] || obj.name || obj["tutor name"] || obj["cet name"] || "").toString().trim();
        const club = (obj.club || obj.team || obj.organisation || obj["club / team"] || obj["club / organisation"] || "").toString().trim();
        const level = (obj.level || obj["coaching level"] || "").toString().trim();
        return { name, club, level };
      })
      .filter(r => r.name.length > 0)
      .map(r => {
        const key = matchKey(r.name, r.club);
        const isDuplicate = existingKeys.has(key) || seenInFile.has(key);
        seenInFile.add(key);
        return { ...r, isDuplicate };
      });
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setParsedRows(null);
    setParsing(true);
    const isCsv = /\.csv$/i.test(file.name);

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const result = Papa.parse(ev.target.result, {
            header: true, skipEmptyLines: true, dynamicTyping: false, delimitersToGuess: [",", ";", "\t"],
          });
          const rows = normalizeRows(result.data || []);
          if (rows.length === 0) setUploadError("Couldn't find any names in this file. It auto-detects columns like 'Name', 'Full Name', 'CET Name', 'Tutor Name', or 'Educator' — if none of those are present, try renaming the column to 'Name'.");
          setParsedRows(rows);
        } catch (err) {
          setUploadError("Could not parse this CSV file.");
        }
        setParsing(false);
      };
      reader.onerror = () => { setUploadError("Could not read this file."); setParsing(false); };
      reader.readAsText(file);
    } else {
      setUploadError("Please upload a .csv file.");
      setParsing(false);
    }
  }

  function confirmImport() {
    if (!parsedRows || parsedRows.length === 0) return;
    const rowsToImport = includeDuplicates ? parsedRows : parsedRows.filter(r => !r.isDuplicate);
    if (rowsToImport.length === 0) return;
    const newCets = rowsToImport.map(r => ({ id: uid(), name: r.name, club: r.club, level: r.level }));
    saveEducators([...educators, ...newCets]);
    setShowUpload(false); setParsedRows(null); setUploadError(null); setIncludeDuplicates(false);
  }

  function cancelUpload() {
    setShowUpload(false); setParsedRows(null); setUploadError(null); setIncludeDuplicates(false);
  }

  function deleteCet(id) {
    saveEducators(educators.filter(c => c.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-slate-900">Coach Education Tutors (CETs)</h2>
          <div className="flex gap-2">
            <button onClick={() => downloadCsv(educators, "cets.csv")} disabled={educators.length === 0}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white">
              <FileText className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => { setShowUpload(s => !s); setShowForm(false); }} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100">
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={() => { setShowForm(s => !s); setShowUpload(false); }} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100">
              <Plus className="w-4 h-4" /> Add CET
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500">The CET library used for the Coach Education Tutor dropdown in New Observation.</p>
      </div>

      {showUpload && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Bulk upload CETs</p>
            <p className="text-xs text-slate-400">Upload a .csv file with columns for Name (required), Club/Organisation, and Level.</p>
          </div>
          <input type="file" accept=".csv" onChange={handleFile}
            className="block w-full text-sm text-slate-600 border border-slate-300 rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm" />

          {parsing && <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading file...</p>}

          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
            </div>
          )}

          {parsedRows && parsedRows.length > 0 && (() => {
            const dupCount = parsedRows.filter(r => r.isDuplicate).length;
            const newCount = parsedRows.length - dupCount;
            const importCount = includeDuplicates ? parsedRows.length : newCount;
            return (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Found {newCount} new CET{newCount === 1 ? "" : "s"}
                  {dupCount > 0 && <span className="text-amber-600"> · {dupCount} possible duplicate{dupCount === 1 ? "" : "s"} (matched by name + club)</span>}
                </p>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {parsedRows.map((r, i) => (
                    <div key={i} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{r.name}</span>
                        {r.isDuplicate && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Duplicate</span>}
                      </span>
                      <span className="text-xs text-slate-400">{[r.club, r.level].filter(Boolean).join(" · ") || "—"}</span>
                    </div>
                  ))}
                </div>
                {dupCount > 0 && (
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={includeDuplicates} onChange={e => setIncludeDuplicates(e.target.checked)} className="rounded border-slate-300" />
                    Import duplicates anyway
                  </label>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmImport} disabled={importCount === 0}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-slate-300">
                    Import {importCount} CET{importCount === 1 ? "" : "s"}
                  </button>
                  <button onClick={cancelUpload} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="CET name" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input value={org} onChange={e => setOrg(e.target.value)} placeholder="Club / Organisation" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={levelOption} onChange={e => handleLevelOptionChange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select coaching level...</option>
              {COACH_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="__other__">Other (type your own)</option>
            </select>
          </div>
          {levelOption === "__other__" && (
            <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Custom coaching level" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          )}
          <div className="flex gap-2">
            <button onClick={addCet} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save CET</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
          </div>
        </div>
      )}

      {educators.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">No CETs added yet.</div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by first or last name..."
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
          </div>
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const filtered = [...educators]
              .sort((a, b) => a.name.localeCompare(b.name))
              .filter(c => !q || c.name.toLowerCase().split(/\s+/).some(part => part.includes(q)));
            if (filtered.length === 0) {
              return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">{q ? `No CETs match "${searchQuery}".` : "No CETs added yet."}</div>;
            }
            return (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map(c => {
                  const obsCount = observations.filter(o => (o.coachEducatorName || "").toLowerCase() === c.name.toLowerCase()).length;
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{[c.club, c.level].filter(Boolean).join(" · ") || "No details"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{obsCount} obs.</span>
                          <button onClick={() => setConfirmDeleteId(c.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {confirmDeleteId === c.id && (
                        <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                          <p className="text-xs text-red-700 flex-1">Delete {c.name}? Their past observations will remain in History but they won't appear in the CET dropdown for new observations.</p>
                          <button onClick={() => deleteCet(c.id)} className="text-xs font-semibold text-red-700 hover:text-red-800 whitespace-nowrap">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function CoursesTab({ courses, saveCourses, adminSettings, adminLockouts, recordAdminAttempt }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [titleOption, setTitleOption] = useState("");
  const [title, setTitle] = useState("");
  const [providerOption, setProviderOption] = useState("");
  const [provider, setProvider] = useState("");
  const [levelOption, setLevelOption] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [selAreas, setSelAreas] = useState([]);
  const [showExportAuth, setShowExportAuth] = useState(false);
  const [exportAdminName, setExportAdminName] = useState("");
  const [exportPin, setExportPin] = useState("");
  const [exportError, setExportError] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkError, setBulkError] = useState("");
  const [bulkDupes, setBulkDupes] = useState([]);
  const [skipDupes, setSkipDupes] = useState(true);

  function handleCourseFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBulkError(""); setBulkPreview([]); setBulkDupes([]);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data;
        if (!rows.length) { setBulkError("No rows found in file."); return; }
        const parsed = rows.map(r => {
          const title = r["Title"] || r["title"] || r["Course"] || r["Course Title"] || "";
          const provider = r["Provider"] || r["provider"] || "";
          const level = r["Level"] || r["level"] || "";
          const description = r["Description"] || r["description"] || "";
          const areasRaw = r["Assessment Areas"] || r["areas"] || "";
          const areas = areasRaw ? areasRaw.split(";").map(a => {
            const match = ASSESSMENT_AREAS.find(aa => aa.label.toLowerCase() === a.trim().toLowerCase());
            return match ? match.key : null;
          }).filter(Boolean) : [];
          return { id: uid(), title: title.trim(), provider: provider.trim(), level: level.trim(), description: description.trim(), areas };
        }).filter(r => r.title);
        if (!parsed.length) { setBulkError("No valid rows found. Make sure your file has a 'Title' column."); return; }
        const dupes = parsed.filter(r => courses.some(c => c.title.toLowerCase() === r.title.toLowerCase()));
        setBulkDupes(dupes.map(r => r.title));
        setBulkPreview(parsed);
      },
      error: () => setBulkError("Could not read file. Make sure it's a valid CSV.")
    });
    e.target.value = "";
  }

  function handleCourseImport() {
    let toImport = bulkPreview;
    if (skipDupes) toImport = bulkPreview.filter(r => !courses.some(c => c.title.toLowerCase() === r.title.toLowerCase()));
    saveCourses([...courses, ...toImport]);
    setBulkPreview([]); setBulkDupes([]); setBulkError(""); setShowBulkUpload(false);
  }

  function handleOpenExportAuth() {
    setShowExportAuth(true);
    setExportAdminName("");
    setExportPin("");
    setExportError(false);
  }

  function handleConfirmExport() {
    if (isLockedOut(adminLockouts, exportAdminName)) {
      setExportError(true);
      return;
    }
    const match = findAdminMatch(adminSettings.admins, exportAdminName, exportPin);
    if (!match) {
      recordAdminAttempt(exportAdminName, false);
      setExportError(true);
      return;
    }
    recordAdminAttempt(exportAdminName, true);
    downloadGenericCsv(coursesToCsvRows(courses), "course-library.csv");
    setShowExportAuth(false);
    setExportAdminName("");
    setExportPin("");
    setExportError(false);
  }

  function handleCancelExportAuth() {
    setShowExportAuth(false);
    setExportAdminName("");
    setExportPin("");
    setExportError(false);
  }

  function toggleArea(k) {
    setSelAreas(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  }

  function handleTitleOptionChange(value) {
    setTitleOption(value);
    setTitle(value === "__other__" ? "" : value);
  }

  function handleProviderOptionChange(value) {
    setProviderOption(value);
    setProvider(value === "__other__" ? "" : value);
  }

  function handleLevelOptionChange(value) {
    setLevelOption(value);
    setLevel(value === "__other__" ? "" : value);
  }

  function resetForm() {
    setTitle(""); setTitleOption(""); setProvider(""); setProviderOption(""); setLevel(""); setLevelOption("");
    setDescription(""); setSelAreas([]);
    setShowForm(false); setEditingId(null);
  }

  function openAddForm() {
    if (showForm || editingId) { resetForm(); return; }
    setShowForm(true);
  }

  function startEdit(course) {
    setEditingId(course.id);
    setTitle(course.title);
    setTitleOption(COURSE_TITLE_OPTIONS.includes(course.title) ? course.title : "__other__");
    setProvider(course.provider || "");
    setProviderOption(course.provider ? (PROVIDER_OPTIONS.includes(course.provider) ? course.provider : "__other__") : "");
    setLevel(course.level || "");
    setLevelOption(course.level ? (LEVEL_OPTIONS.includes(course.level) ? course.level : "__other__") : "");
    setDescription(course.description || "");
    setSelAreas(course.areas || []);
    setShowForm(true);
  }

  function saveCourse() {
    if (!title.trim() || selAreas.length === 0) return;
    if (editingId) {
      saveCourses(courses.map(c => c.id === editingId
        ? { ...c, title: title.trim(), provider: provider.trim(), level: level.trim(), description: description.trim(), areas: selAreas }
        : c));
    } else {
      const newCourse = { id: uid(), title: title.trim(), provider: provider.trim(), level: level.trim(), description: description.trim(), areas: selAreas };
      saveCourses([...courses, newCourse]);
    }
    resetForm();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Course & Workshop Library</h2>
          <p className="text-sm text-slate-500">Tag each course to the assessment area(s) it develops.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadGenericCsv(coursesToCsvRows(courses), "course-library-backup.csv")} disabled={courses.length === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 border border-emerald-300 px-3 py-2 rounded-lg hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-white">
            <FileText className="w-4 h-4" /> Backup CSV
          </button>
          <button onClick={() => { setShowBulkUpload(s => !s); setBulkPreview([]); setBulkError(""); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap">
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button onClick={handleOpenExportAuth} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap">
            <FileText className="w-4 h-4" /> Export CSV (Admin)
          </button>
          <button onClick={openAddForm} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Course
          </button>
        </div>
      </div>

      {showBulkUpload && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Bulk Upload Courses via CSV</p>
          <p className="text-xs text-slate-500">Upload your backup CSV. Expected columns: <strong>Title, Provider, Level, Description, Assessment Areas</strong>. Only Title is required.</p>
          <input type="file" accept=".csv" onChange={handleCourseFile}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-sm file:font-semibold file:bg-white hover:file:bg-slate-50" />
          {bulkError && <p className="text-xs text-red-600">{bulkError}</p>}
          {bulkPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600"><strong>{bulkPreview.length}</strong> course{bulkPreview.length !== 1 ? "s" : ""} found in file.{bulkDupes.length > 0 ? ` ${bulkDupes.length} duplicate${bulkDupes.length !== 1 ? "s" : ""} detected.` : ""}</p>
              {bulkDupes.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={skipDupes} onChange={e => setSkipDupes(e.target.checked)} />
                  Skip duplicates (recommended)
                </label>
              )}
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                {bulkPreview.map((r, i) => (
                  <div key={i} className={`px-3 py-2 flex items-center gap-2 ${bulkDupes.includes(r.title) ? "bg-amber-50" : ""}`}>
                    <span className="text-xs text-slate-700 flex-1 truncate">{r.title}</span>
                    {r.provider && <span className="text-xs text-slate-400 truncate">{r.provider}</span>}
                    {bulkDupes.includes(r.title) && <span className="text-xs text-amber-600 font-medium shrink-0">duplicate</span>}
                  </div>
                ))}
              </div>
              <button onClick={handleCourseImport}
                className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-700">
                Import {skipDupes ? bulkPreview.filter(r => !courses.some(c => c.title.toLowerCase() === r.title.toLowerCase())).length : bulkPreview.length} Course{bulkPreview.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      )}

      {showExportAuth && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
          <p className="text-sm text-slate-600">Enter an admin name and PIN to export the Course Library as a CSV file.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={exportAdminName} onChange={e => { setExportAdminName(e.target.value); setExportError(false); }} placeholder="Admin name"
              className={`border rounded-lg px-3 py-2 text-sm ${exportError ? "border-red-400" : "border-slate-300"}`} />
            <input type="password" inputMode="numeric" maxLength={4} value={exportPin}
              onChange={e => { setExportPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setExportError(false); }} placeholder="Admin PIN"
              className={`border rounded-lg px-3 py-2 text-sm text-center tracking-widest ${exportError ? "border-red-400" : "border-slate-300"}`} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleConfirmExport} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">Export CSV</button>
            <button onClick={handleCancelExportAuth} className="text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
          </div>
          {exportError && (
            <p className="text-xs text-red-600">
              {isLockedOut(adminLockouts, exportAdminName)
                ? `Too many incorrect attempts — locked for ${lockoutRemainingMinutes(adminLockouts, exportAdminName)} more minute${lockoutRemainingMinutes(adminLockouts, exportAdminName) === 1 ? "" : "s"}.`
                : "Incorrect admin name or PIN."}
            </p>
          )}
        </div>
      )}

      {(showForm || editingId) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">{editingId ? "Edit Course" : "New Course"}</p>
          <div className="grid grid-cols-3 gap-3">
            <select value={titleOption} onChange={e => handleTitleOptionChange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select course title...</option>
              {COURSE_TITLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="__other__">Other (type your own)</option>
            </select>
            <select value={providerOption} onChange={e => handleProviderOptionChange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select provider...</option>
              {PROVIDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="__other__">Other (type your own)</option>
            </select>
            <select value={levelOption} onChange={e => handleLevelOptionChange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select level...</option>
              {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="__other__">Other (type your own)</option>
            </select>
          </div>
          {(titleOption === "__other__" || providerOption === "__other__" || levelOption === "__other__") && (
            <div className="grid grid-cols-3 gap-3">
              {titleOption === "__other__"
                ? <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Custom course / workshop title" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                : <div />}
              {providerOption === "__other__"
                ? <input value={provider} onChange={e => setProvider(e.target.value)} placeholder="Custom provider" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                : <div />}
              {levelOption === "__other__"
                ? <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Custom level" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                : <div />}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Description / key content (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Key tools, models or content covered on this course..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Develops which assessment area(s)?</p>
            <div className="flex gap-2 flex-wrap">
              {ASSESSMENT_AREAS.map(a => (
                <button key={a.key} onClick={() => toggleArea(a.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selAreas.includes(a.key) ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveCourse} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">{editingId ? "Save Changes" : "Save Course"}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">No courses in the library yet. Add the courses/workshops you can recommend.</div>
      ) : (
        <div className="space-y-6">
          {COURSE_LEVEL_GROUP_ORDER.map(group => {
            const groupCourses = courses.filter(c => courseLevelGroup(c.title) === group).sort((a, b) => a.title.localeCompare(b.title));
            if (groupCourses.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{group}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {groupCourses.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{c.title}</p>
                          <p className="text-xs text-slate-400 mb-2">{[c.provider, c.level].filter(Boolean).join(" · ")}</p>
                        </div>
                        <button onClick={() => startEdit(c)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {(c.areas || []).map(k => {
                          const a = ASSESSMENT_AREAS.find(aa => aa.key === k);
                          return a ? <span key={k} className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{a.label}</span> : null;
                        })}
                      </div>
                      {c.description && <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">{c.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function emptyCompletedTaskForm() {
  return {
    coachId: "",
    courseOption: "",
    courseTitle: "",
    courseNumber: "",
    attendancePercent: "",
    onlineModulesPercent: "",
    formativeAssessmentDone: false,
    videoLink: "",
    checkpoint: "",
    team: "",
    sessionPlansDone: {},
    sessionPlansOutcomes: {},
    goalscoringPresentationDone: false,
    gamePlanDone: false,
    analysisSessionPlanDone: false,
    annualPlanDone: false,
    sixWeekCycleDone: false,
    fcDetailsDone: false,
    practicalSessionDone: false,
    practicalSessionOutcome: "",
  };
}

function courseworkProgress(record, coachTopics) {
  const onlineDone = (record.onlineModulesPercent || 0) >= 100 ? 1 : 0;
  const formativeDone = record.formativeAssessmentDone ? 1 : 0;
  if (isCDiploma(record.courseTitle)) {
    return { done: (record.practicalSessionDone ? 1 : 0) + onlineDone + formativeDone, total: 3 };
  }
  if (isBDiploma(record.courseTitle)) {
    const topics = (coachTopics || []).slice(0, 4);
    const sessionDone = topics.filter(t => record.sessionPlansDone && record.sessionPlansDone[t]).length;
    const fixedDone = [
      record.goalscoringPresentationDone,
      record.gamePlanDone,
      record.analysisSessionPlanDone,
      record.annualPlanDone,
      record.sixWeekCycleDone,
      record.fcDetailsDone,
    ].filter(Boolean).length;
    return { done: sessionDone + fixedDone + onlineDone + formativeDone, total: topics.length + 6 + 2 };
  }
  return { done: 0, total: 0 };
}

function isAttendedCell(raw, diplomaType) {
  const v = (raw || "").toString().trim();
  if (!v) return false;
  if (/^n$/i.test(v)) return false;
  if (/^y$/i.test(v)) return true;
  const numberPattern = diplomaType === "C" ? /^1\d{2}$/ : /^2\d{2}$/;
  return numberPattern.test(v);
}

function isDateColumnHeader(header, diplomaType) {
  const maxNum = diplomaType === "C" ? 4 : 9;
  const bracketMatch = (header || "").match(/\((\d{1,2})\)/);
  if (!bracketMatch) return false;
  const num = parseInt(bracketMatch[1], 10);
  if (isNaN(num) || num < 1 || num > maxNum) return false;
  return /\d{1,2}[\/\-.]\d{1,2}([\/\-.]\d{2,4})?/.test(header);
}

function guessClubHeader(headers) {
  const patterns = [/^club$/i, /^team$/i, /^club\s*\/\s*team$/i, /^team\s*\/\s*club$/i, /^team\s*name$/i, /^club\s*name$/i, /^suborganisation$/i, /^sub-organisation$/i, /suborg/i];
  for (const p of patterns) {
    const found = headers.find(h => p.test(h.trim()));
    if (found) return found;
  }
  return "";
}

function guessNameHeader(headers) {
  return headers.find(h => h.trim().toLowerCase() === "name")
    || headers.find(h => /^(cet|tutor|educator|coach)['\u2019]?s?\s*name$/i.test(h.trim()))
    || headers.find(h => /full\s*name/i.test(h))
    || headers.find(h => /name/i.test(h) && !/club|team|organisation|organization/i.test(h))
    || headers.find(h => /\b(cet|tutor|educator)\b/i.test(h))
    || headers[0];
}

function guessTopicHeader(headers, n) {
  const patterns = [new RegExp(`session\\s*topic\\s*${n}\\b`, "i"), new RegExp(`topic\\s*${n}\\b`, "i")];
  for (const p of patterns) {
    const found = headers.find(h => p.test(h));
    if (found) return found;
  }
  return "";
}

function guessCetHeader(headers) {
  return headers.find(h => h.trim().toLowerCase() === "cet")
    || headers.find(h => /^cet\s*name$/i.test(h.trim()))
    || headers.find(h => /\bcet\b/i.test(h))
    || headers.find(h => /coach\s*educat(or|ion)\s*tutor/i.test(h))
    || headers.find(h => /tutor/i.test(h))
    || "";
}

function guessSessionActivityHeader(headers) {
  return headers.find(h => h.trim().toLowerCase() === "session activity")
    || headers.find(h => /session\s*activity/i.test(h))
    || headers.find(h => h.trim().toLowerCase() === "session topic")
    || headers.find(h => /session\s*topic|coaching\s*activity/i.test(h))
    || "";
}

function guessOnlineModulesHeader(headers) {
  return headers.find(h => h.trim().toLowerCase() === "online modules")
    || headers.find(h => /online\s*modules?/i.test(h))
    || headers.find(h => /e-?learning/i.test(h))
    || "";
}

function parseOnlineModulesCell(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return null;
  if (/^y$/i.test(v)) return 100;
  if (/^n$/i.test(v)) return 0;
  const fraction = v.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const num = parseInt(fraction[1], 10), den = parseInt(fraction[2], 10);
    if (den > 0) return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
  }
  const pctMatch = v.match(/^(\d{1,3})\s*%?$/);
  if (pctMatch) return Math.max(0, Math.min(100, parseInt(pctMatch[1], 10)));
  return null;
}

function buildCandidateHtml(task, coach, observations) {
  const esc = (s) => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const { done, total } = courseworkProgress(task, coach?.topics);
  const items = total > 0 ? courseworkItems(task, coach?.topics, task.team) : [];
  const checklistRows = items.map(i =>
    `<tr><td style="padding:6px 8px;border:1px solid #ddd;">${i.done ? "✅" : "☐"} ${esc(i.label)}</td><td style="padding:6px 8px;border:1px solid #ddd;">${esc(i.outcome) || "—"}</td></tr>`
  ).join("");
  const matchingReports = (observations || [])
    .filter(o => o.status !== "draft" && o.coachId === task.coachId && (o.courseNumber || "").trim() === (task.courseNumber || "").trim() && task.courseNumber)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const reportSections = matchingReports.map(o => {
    const totalScore = totalForObs(o);
    const areaRows = o.areas
      ? ASSESSMENT_AREAS.map(a => {
          const d = o.areas[a.key] || {};
          const lvl = SCORE_LEVELS.find(l => l.value === d.score);
          return `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${esc(a.label)}</td><td style="padding:4px 8px;border:1px solid #ddd;white-space:nowrap;">${lvl ? lvl.value + " · " + esc(lvl.label) : "—"}</td><td style="padding:4px 8px;border:1px solid #ddd;">${esc(d.notes) || "—"}</td></tr>`;
        }).join("")
      : "";
    const pitchMap = o.sessionPlan?.zonesUsed?.length > 0
      ? `<div style="margin:14px 0;"><p style="font-size:13px;font-weight:600;margin-bottom:6px;">Pitch Zones Used</p>${buildPitchZoneSvg(o.sessionPlan.zonesUsed)}</div>`
      : "";
    return `
      <div style="page-break-before: always; padding-top: 20px;">
        <h3 style="margin:0 0 2px 0;">${new Date(o.date).toLocaleDateString("en-GB")}${o.sessionTopic ? " · " + esc(o.sessionTopic) : ""}</h3>
        ${areaRows ? `<p style="font-size:13px;font-weight:600;margin:10px 0 4px;">Assessment Scoring (${totalScore ?? "—"} / ${MAX_TOTAL_SCORE})</p>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">${areaRows}</table>` : ""}
        ${pitchMap}
        <p style="font-size:13px;font-weight:600;margin:10px 0 4px;">Strengths</p><p style="font-size:13px;margin:0;">${esc(o.strengths) || "—"}</p>
        <p style="font-size:13px;font-weight:600;margin:10px 0 4px;">Areas for Development</p><p style="font-size:13px;margin:0;">${esc(o.areas_feedback) || "—"}</p>
        ${o.assessmentOutcome ? `<p style="font-size:13px;margin-top:10px;"><strong>Outcome:</strong> ${esc(o.assessmentOutcome)}</p>` : ""}
      </div>`;
  }).join("");
  return `<html><head><title>${esc(task.coachName)} - Observation History</title></head><body style="margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1e293b;padding:28px;">
    <h1 style="margin:0 0 4px 0;">${esc(task.coachName)}</h1>
    <p style="color:#64748b;margin:0 0 20px 0;">${esc(task.courseTitle)}${task.courseNumber ? ` (#${esc(task.courseNumber)})` : ""}</p>
    <h2 style="margin:0 0 8px 0;">Completed Tasks Checklist</h2>
    <p style="font-size:13px;">Attendance: <strong>${task.attendancePercent}%</strong> · Online Modules: <strong>${task.onlineModulesPercent || 0}%</strong> · Coursework: <strong>${total > 0 ? `${done}/${total}` : "—"}</strong></p>
    ${checklistRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">${checklistRows}</table>` : ""}
    <h2 style="margin:20px 0 0 0;">Observation Reports (${matchingReports.length})</h2>
    ${reportSections || '<p style="font-size:13px;color:#64748b;">No submitted observation reports linked to this course yet.</p>'}
  </body></html>`;
}

function CompletedTasksTab({ coaches, courses, saveCoaches, completedTasks, saveCompletedTasks, onBulkDelete, observations, onViewReport }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCompletedTaskForm());
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [coachDropdownOpen, setCoachDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedCourses, setExpandedCourses] = useState(() => new Set());
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [idpExpandedTaskId, setIdpExpandedTaskId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState(() => new Set());

  const [showCourseworkUpload, setShowCourseworkUpload] = useState(false);
  const [courseworkDiplomaType, setCourseworkDiplomaType] = useState("B");
  const [courseworkCourseNumber, setCourseworkCourseNumber] = useState("");
  const [courseworkCourseTitle, setCourseworkCourseTitle] = useState("AFC/FA B Diploma");
  const [courseworkHeaders, setCourseworkHeaders] = useState(null);
  const [courseworkRawRows, setCourseworkRawRows] = useState(null);
  const [courseworkNameHeader, setCourseworkNameHeader] = useState("");
  const [courseworkFirstNameHeader, setCourseworkFirstNameHeader] = useState("");
  const [courseworkLastNameHeader, setCourseworkLastNameHeader] = useState("");
  const [courseworkClubHeader, setCourseworkClubHeader] = useState("");
  const [courseworkFaHeader, setCourseworkFaHeader] = useState("");
  const [courseworkCetHeader, setCourseworkCetHeader] = useState("");
  const [courseworkGoalscoringHeader, setCourseworkGoalscoringHeader] = useState("");
  const [courseworkOnlineModulesHeader, setCourseworkOnlineModulesHeader] = useState("");
  const [courseworkTopicHeaders, setCourseworkTopicHeaders] = useState(["", "", "", ""]);
  const [courseworkDetectedAttendanceHeaders, setCourseworkDetectedAttendanceHeaders] = useState([]);
  const [courseworkPreview, setCourseworkPreview] = useState(null);
  const [courseworkError, setCourseworkError] = useState("");

  const selectedCoach = coaches.find(c => c.id === form.coachId);

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleSessionPlanTopic(topic) {
    setForm(prev => ({
      ...prev,
      sessionPlansDone: { ...prev.sessionPlansDone, [topic]: !prev.sessionPlansDone?.[topic] },
    }));
  }

  function toggleSixWeekCycle() {
    setForm(prev => {
      const next = !prev.sixWeekCycleDone;
      return { ...prev, sixWeekCycleDone: next, fcDetailsDone: next ? prev.fcDetailsDone : false };
    });
  }

  function handleCourseOptionChange(value) {
    setField("courseOption", value);
    if (value === "__other__") {
      setField("courseTitle", "");
    } else {
      const c = courses.find(co => co.id === value);
      setField("courseTitle", c ? c.title : "");
    }
  }

  function resetForm() {
    setForm(emptyCompletedTaskForm());
    setCoachSearchQuery("");
    setShowForm(false);
    setEditingId(null);
  }

  function downloadCompletedTasksCsv() {
    const rows = completedTasks.map(t => {
      const coach = coaches.find(c => c.id === t.coachId);
      const { done, total } = courseworkProgress(t, coach?.topics);
      return {
        Coach: t.coachName,
        Course: t.courseTitle,
        "Course Number": t.courseNumber || "",
        "Attendance %": t.attendancePercent,
        "Online Modules %": t.onlineModulesPercent || 0,
        Checkpoint: t.checkpoint || "",
        "Coursework Progress": total > 0 ? `${done}/${total}` : "",
        "Video Link": t.videoLink || "",
      };
    });
    downloadGenericCsv(rows, "completed-coursework.csv");
  }

  function openAddForm() {
    if (showForm || editingId) { resetForm(); return; }
    setShowForm(true);
  }

  function expandCourseGroup(courseNumber) {
    const key = (courseNumber || "").trim();
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function startEdit(task) {
    setEditingId(task.id);
    expandCourseGroup(task.courseNumber);
    const matchedCourse = courses.find(c => c.title === task.courseTitle);
    setForm({
      coachId: task.coachId || "",
      courseOption: matchedCourse ? matchedCourse.id : "__other__",
      courseTitle: task.courseTitle || "",
      courseNumber: task.courseNumber || "",
      attendancePercent: task.attendancePercent != null ? String(task.attendancePercent) : "",
      onlineModulesPercent: task.onlineModulesPercent != null ? String(task.onlineModulesPercent) : "",
      formativeAssessmentDone: !!task.formativeAssessmentDone,
      videoLink: task.videoLink || "",
      checkpoint: task.checkpoint || "",
      team: task.team || "",
      sessionPlansDone: task.sessionPlansDone || {},
      sessionPlansOutcomes: task.sessionPlansOutcomes || {},
      goalscoringPresentationDone: !!task.goalscoringPresentationDone,
      gamePlanDone: !!task.gamePlanDone,
      analysisSessionPlanDone: !!task.analysisSessionPlanDone,
      annualPlanDone: !!task.annualPlanDone,
      sixWeekCycleDone: task.sixWeekCycleDone != null ? !!task.sixWeekCycleDone : !!task.sixWeekCycleFcDone,
      fcDetailsDone: task.fcDetailsDone != null ? !!task.fcDetailsDone : !!task.sixWeekCycleFcDone,
      practicalSessionDone: !!task.practicalSessionDone,
      practicalSessionOutcome: task.practicalSessionOutcome || "",
    });
    const matchedCoach = coaches.find(c => c.id === task.coachId);
    setCoachSearchQuery(matchedCoach ? matchedCoach.name : "");
  }

  function canSave() {
    if (!form.coachId) return false;
    if (!form.courseTitle.trim()) return false;
    if (form.attendancePercent === "") return false;
    const pct = Number(form.attendancePercent);
    if (isNaN(pct) || pct < 0 || pct > 100) return false;
    return true;
  }

  function saveTask() {
    if (!canSave()) return;
    const coach = coaches.find(c => c.id === form.coachId);
    const record = {
      id: editingId || uid(),
      coachId: form.coachId,
      coachName: coach ? coach.name : "",
      courseTitle: form.courseTitle.trim(),
      courseNumber: form.courseNumber.trim(),
      attendancePercent: Math.max(0, Math.min(100, Math.round(Number(form.attendancePercent)))),
      onlineModulesPercent: form.onlineModulesPercent === "" ? 0 : Math.max(0, Math.min(100, Math.round(Number(form.onlineModulesPercent)))),
      formativeAssessmentDone: !!form.formativeAssessmentDone,
      videoLink: form.videoLink.trim(),
      checkpoint: form.checkpoint.trim(),
      team: form.team.trim(),
      sessionPlansDone: form.sessionPlansDone || {},
      sessionPlansOutcomes: form.sessionPlansOutcomes || {},
      goalscoringPresentationDone: form.goalscoringPresentationDone,
      gamePlanDone: form.gamePlanDone,
      analysisSessionPlanDone: form.analysisSessionPlanDone,
      annualPlanDone: form.annualPlanDone,
      sixWeekCycleDone: form.sixWeekCycleDone,
      fcDetailsDone: form.sixWeekCycleDone ? form.fcDetailsDone : false,
      practicalSessionDone: form.practicalSessionDone,
      practicalSessionOutcome: form.practicalSessionOutcome || "",
      updatedAt: new Date().toISOString(),
    };
    if (editingId) {
      saveCompletedTasks(completedTasks.map(t => t.id === editingId ? record : t));
    } else {
      saveCompletedTasks([...completedTasks, record]);
      expandCourseGroup(record.courseNumber);
    }
    resetForm();
  }

  function deleteTask(id) {
    saveCompletedTasks(completedTasks.filter(t => t.id !== id));
    setConfirmDeleteId(null);
  }

  function toggleTaskSelected(id) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllInGroup(groupTasks) {
    const ids = groupTasks.map(t => t.id);
    const allSelected = ids.every(id => selectedTaskIds.has(id));
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  }

  function deleteSelectedInGroup(groupTasks) {
    const ids = groupTasks.map(t => t.id).filter(id => selectedTaskIds.has(id));
    if (ids.length === 0) return;
    onBulkDelete(ids);
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }

  // Bulk-fixes the exact gap that caused it: records imported via the
  // Coursework CSV tool with the (now-required) Course Number left blank
  // never show under Open/Completed Courses and never auto-fill in New
  // Observation, since both key off courseNumber. This lets a whole batch
  // be corrected in one action instead of editing each record by hand.
  const [bulkCourseNumberInputs, setBulkCourseNumberInputs] = useState({});

  function applyBulkCourseNumber(groupKey, groupTasks) {
    const raw = (bulkCourseNumberInputs[groupKey] || "").trim();
    if (!raw) return;
    const ids = new Set(groupTasks.map(t => t.id).filter(id => selectedTaskIds.has(id)));
    if (ids.size === 0) return;
    saveCompletedTasks(completedTasks.map(t => ids.has(t.id) ? { ...t, courseNumber: raw, updatedAt: new Date().toISOString() } : t));
    setBulkCourseNumberInputs(prev => ({ ...prev, [groupKey]: "" }));
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    expandCourseGroup(raw);
  }

  function selectDiplomaType(type) {
    setCourseworkDiplomaType(type);
    setCourseworkCourseTitle(type === "C" ? "AFC/FA C Diploma" : "AFC/FA B Diploma");
    setCourseworkPreview(null);
    if (courseworkHeaders) {
      setCourseworkGoalscoringHeader(
        type === "C"
          ? guessSessionActivityHeader(courseworkHeaders)
          : courseworkHeaders.find(h => /goalscoring/i.test(h)) || ""
      );
    }
  }

  function handleCourseworkFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCourseworkError(""); setCourseworkPreview(null);
    setCourseworkHeaders(null); setCourseworkRawRows(null);
    const numMatch = file.name.match(/\b(2\d{2})\b/);
    if (numMatch) setCourseworkCourseNumber(numMatch[1]);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data;
        if (!rows.length) { setCourseworkError("No rows found in file."); return; }
        const headers = (result.meta.fields || []).filter(h => h && h.trim());
        if (!headers.length) { setCourseworkError("Could not read column headers from this file — check it has a header row."); return; }
        setCourseworkHeaders(headers);
        setCourseworkRawRows(rows);
        // Some exports (Football Australia's registration system among them)
        // split the name into separate First Name / Last Name columns rather
        // than one combined column. Detect that pair specifically and prefer
        // it — falling back to single-column detection only when no pair
        // exists — since guessing a single "name" column here would silently
        // pick up First Name alone and drop every surname on import.
        const firstNameHeader = headers.find(h => /^first\s*name$/i.test(h.trim())) || "";
        const lastNameHeader = headers.find(h => /^last\s*name$/i.test(h.trim())) || "";
        const hasFirstLastPair = !!(firstNameHeader && lastNameHeader);
        const nameHeader = hasFirstLastPair ? "__firstlast__" : (
          headers.find(h => h.trim().toLowerCase() === "name")
          || headers.find(h => /^coach(es)?['\u2019]?s?\s*name$/i.test(h.trim()))
          || headers.find(h => /candidate\s*name/i.test(h))
          || headers.find(h => /name/i.test(h) && !/club|team/i.test(h))
          || headers.find(h => /candidate|coach/i.test(h))
          || headers[0]
        );
        const clubHeader = guessClubHeader(headers);
        const faHeader = headers.find(h => h.trim().toLowerCase() === "fa number")
          || headers.find(h => /fa\s*(number|no\.?|#|reg(istration)?|id)/i.test(h))
          || headers.find(h => /^fa$/i.test(h.trim()))
          || headers.find(h => /^username$/i.test(h.trim())) || "";
        setCourseworkFirstNameHeader(firstNameHeader);
        setCourseworkLastNameHeader(lastNameHeader);
        const cetHeader = guessCetHeader(headers);
        const onlineModulesHeader = guessOnlineModulesHeader(headers);
        setCourseworkNameHeader(nameHeader);
        setCourseworkClubHeader(clubHeader);
        setCourseworkFaHeader(faHeader);
        setCourseworkCetHeader(cetHeader);
        setCourseworkOnlineModulesHeader(onlineModulesHeader);
        setCourseworkGoalscoringHeader(
          courseworkDiplomaType === "C"
            ? guessSessionActivityHeader(headers)
            : headers.find(h => /goalscoring/i.test(h)) || ""
        );
        setCourseworkTopicHeaders([1, 2, 3, 4].map(n => guessTopicHeader(headers, n)));
        setCourseworkDetectedAttendanceHeaders([]);
      },
      error: () => setCourseworkError("Could not read file. Make sure it's a valid CSV."),
    });
    e.target.value = "";
  }

  function generateCourseworkPreview() {
    if (!courseworkRawRows || !courseworkNameHeader) return;
    if (!courseworkCourseNumber.trim()) {
      setCourseworkError("Course Number is required — without it, the imported records won't show up under Open/Completed Courses or auto-fill in New Observation.");
      setCourseworkPreview(null);
      return;
    }
    const excluded = new Set([courseworkNameHeader, courseworkFirstNameHeader, courseworkLastNameHeader, courseworkClubHeader, courseworkFaHeader, courseworkCetHeader, courseworkOnlineModulesHeader, ...courseworkTopicHeaders].filter(Boolean));
    const attendanceHeaders = courseworkHeaders.filter(h => !excluded.has(h) && isDateColumnHeader(h, courseworkDiplomaType));
    if (!attendanceHeaders.length) {
      setCourseworkError('No date-format attendance columns found — expected headers like "12/07/2026 (3)" with a bracketed session number.');
      setCourseworkPreview(null);
      return;
    }
    const maxSessions = courseworkDiplomaType === "C" ? 4 : 9;
    let skippedBlankName = 0;
    const preview = courseworkRawRows.map(r => {
      const coachName = courseworkNameHeader === "__firstlast__"
        ? [r[courseworkFirstNameHeader], r[courseworkLastNameHeader]].map(v => (v || "").toString().trim()).filter(Boolean).join(" ")
        : (r[courseworkNameHeader] || "").toString().trim();
      if (!coachName) { skippedBlankName++; return null; }
      const club = courseworkClubHeader ? (r[courseworkClubHeader] || "").toString().trim() : "";
      const faNumber = courseworkFaHeader ? (r[courseworkFaHeader] || "").toString().trim() : "";
      const cetName = courseworkCetHeader ? (r[courseworkCetHeader] || "").toString().trim() : "";
      const goalscoringTeam = courseworkGoalscoringHeader ? (r[courseworkGoalscoringHeader] || "").toString().trim() : "";
      const onlineModulesPct = courseworkOnlineModulesHeader ? parseOnlineModulesCell(r[courseworkOnlineModulesHeader]) : null;
      const attended = Math.min(attendanceHeaders.filter(h => isAttendedCell(r[h], courseworkDiplomaType)).length, maxSessions);
      const total = maxSessions;
      const pct = Math.round((attended / total) * 100);
      const matchedCoach = coaches.find(c => c.name.toLowerCase() === coachName.toLowerCase());
      const topics = courseworkDiplomaType === "B"
        ? courseworkTopicHeaders.map((h, i) => {
            const val = h ? (r[h] || "").toString().trim() : "";
            return val || `Session Topic ${i + 1}`;
          })
        : [];
      return { coachName, club, faNumber, cetName, goalscoringTeam, onlineModulesPct, attended, total, pct, matchedCoach, topics };
    }).filter(Boolean);
    if (!preview.length) {
      setCourseworkError("No valid coach rows found using that name column — try a different one.");
      setCourseworkPreview(null);
      return;
    }
    setCourseworkError(
      skippedBlankName > 0
        ? `Note: ${skippedBlankName} of ${courseworkRawRows.length} rows had a blank value in the selected name column and were skipped — check those rows in the source file if that count looks wrong.`
        : ""
    );
    setCourseworkPreview(preview);
    setCourseworkDetectedAttendanceHeaders(attendanceHeaders);
  }

  async function confirmCourseworkImport() {
    if (!courseworkPreview) return;
    const updatedCoaches = [...coaches];
    const updatedTasks = [...completedTasks];
    courseworkPreview.forEach(p => {
      let coach = p.matchedCoach || updatedCoaches.find(c => c.name.toLowerCase() === p.coachName.toLowerCase());
      if (!coach) {
        coach = { id: uid(), name: p.coachName, club: p.club || "", level: "", topics: courseworkDiplomaType === "B" ? p.topics : [], faNumber: p.faNumber || "" };
        updatedCoaches.push(coach);
      } else {
        const idx = updatedCoaches.findIndex(c => c.id === coach.id);
        const patch = {};
        if (courseworkDiplomaType === "B") patch.topics = p.topics;
        if (p.faNumber && !coach.faNumber) patch.faNumber = p.faNumber;
        if (Object.keys(patch).length) {
          updatedCoaches[idx] = { ...coach, ...patch };
          coach = updatedCoaches[idx];
        }
      }
      const existingIdx = updatedTasks.findIndex(t => t.coachId === coach.id && (t.courseNumber || "").trim() === courseworkCourseNumber.trim());
      if (existingIdx !== -1) {
        updatedTasks[existingIdx] = {
          ...updatedTasks[existingIdx],
          attendancePercent: p.pct,
          onlineModulesPercent: p.onlineModulesPct != null ? p.onlineModulesPct : (updatedTasks[existingIdx].onlineModulesPercent || 0),
          team: p.goalscoringTeam || p.club || updatedTasks[existingIdx].team || "",
          cet: p.cetName || updatedTasks[existingIdx].cet || "",
          updatedAt: new Date().toISOString(),
        };
      } else {
        updatedTasks.push({
          id: uid(),
          coachId: coach.id,
          coachName: coach.name,
          courseTitle: courseworkCourseTitle.trim() || (courseworkDiplomaType === "C" ? "AFC/FA C Diploma" : "AFC/FA B Diploma"),
          courseNumber: courseworkCourseNumber.trim(),
          attendancePercent: p.pct,
          onlineModulesPercent: p.onlineModulesPct != null ? p.onlineModulesPct : 0,
          checkpoint: "",
          team: p.goalscoringTeam || p.club || "",
          cet: p.cetName || "",
          sessionPlansDone: {},
          sessionPlansOutcomes: {},
          goalscoringPresentationDone: false,
          gamePlanDone: false,
          analysisSessionPlanDone: false,
          annualPlanDone: false,
          sixWeekCycleDone: false,
          fcDetailsDone: false,
          practicalSessionDone: false,
          practicalSessionOutcome: "",
          updatedAt: new Date().toISOString(),
        });
      }
    });
    await saveCoaches(updatedCoaches);
    await saveCompletedTasks(updatedTasks);
    expandCourseGroup(courseworkCourseNumber);
    setCourseworkPreview(null);
    setShowCourseworkUpload(false);
  }

  function cancelCourseworkUpload() {
    setShowCourseworkUpload(false);
    setCourseworkPreview(null);
    setCourseworkError("");
    setCourseworkHeaders(null);
    setCourseworkRawRows(null);
    setCourseworkNameHeader("");
    setCourseworkFirstNameHeader("");
    setCourseworkLastNameHeader("");
    setCourseworkClubHeader("");
    setCourseworkFaHeader("");
    setCourseworkCetHeader("");
    setCourseworkGoalscoringHeader("");
    setCourseworkOnlineModulesHeader("");
    setCourseworkTopicHeaders(["", "", "", ""]);
    setCourseworkDetectedAttendanceHeaders([]);
  }

  function toggleCourseExpand(courseNumber) {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseNumber)) next.delete(courseNumber); else next.add(courseNumber);
      return next;
    });
  }

  function groupTasksForDisplay(tasks) {
    const map = {};
    const noCourseNumber = [];
    tasks.forEach(t => {
      const num = (t.courseNumber || "").trim();
      if (!num) { noCourseNumber.push(t); return; }
      if (!map[num]) map[num] = { courseNumber: num, courseTitle: t.courseTitle, records: [] };
      map[num].records.push(t);
    });
    const groups = Object.values(map).sort(courseNumericSort);
    if (noCourseNumber.length) groups.push({ courseNumber: "", courseTitle: "No Course Number", records: noCourseNumber });
    return groups;
  }

  function renderTaskForm() {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">{editingId ? "Edit Record" : "New Record"}</p>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1.5 block">Coach</label>
          {selectedCoach ? (
            <div className="flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50">
              <p className="text-sm font-medium text-slate-800">{selectedCoach.name}</p>
              <button onClick={() => { setField("coachId", ""); setCoachSearchQuery(""); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Change</button>
            </div>
          ) : (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={coachSearchQuery}
                onChange={e => { setCoachSearchQuery(e.target.value); setCoachDropdownOpen(true); }}
                onFocus={() => setCoachDropdownOpen(true)}
                onBlur={() => setTimeout(() => setCoachDropdownOpen(false), 150)}
                placeholder="Search for a coach by name..."
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm"
              />
              {coachDropdownOpen && coachSearchQuery.trim() && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-md max-h-56 overflow-y-auto">
                  {(() => {
                    const q = coachSearchQuery.trim().toLowerCase();
                    const matches = [...coaches]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter(c => c.name.toLowerCase().split(/\s+/).some(part => part.includes(q)));
                    if (matches.length === 0) {
                      return <p className="px-3 py-2.5 text-sm text-slate-400">No coaches match "{coachSearchQuery}".</p>;
                    }
                    return matches.map(c => (
                      <button key={c.id} onMouseDown={() => { setField("coachId", c.id); setCoachSearchQuery(c.name); setCoachDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0">
                        <span className="font-medium text-slate-800">{c.name}</span>
                        {c.club && <span className="text-xs text-slate-400 ml-1.5">({c.club})</span>}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {idpHasContent(selectedCoach?.idp) && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs font-semibold text-sky-800 mb-1.5">IDP Snapshot — {selectedCoach.name}</p>
            {selectedCoach.idp.strengths && <p className="text-xs text-slate-600 whitespace-pre-wrap mb-1"><strong>Strengths:</strong> {selectedCoach.idp.strengths}</p>}
            {selectedCoach.idp.performanceGap && <p className="text-xs text-slate-600 whitespace-pre-wrap mb-1"><strong>Performance Gap:</strong> {selectedCoach.idp.performanceGap}</p>}
            {selectedCoach.idp.goalsPlan && <p className="text-xs text-slate-600 whitespace-pre-wrap"><strong>Goals/Plan:</strong> {selectedCoach.idp.goalsPlan}</p>}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Course</label>
            <select value={form.courseOption} onChange={e => handleCourseOptionChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
              <option value="">Select from Course Library...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              <option value="__other__">Other (type your own)</option>
            </select>
            {form.courseOption === "__other__" && (
              <input value={form.courseTitle} onChange={e => setField("courseTitle", e.target.value)} placeholder="Custom course / qualification name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-2" />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Course Number (optional)</label>
            <input value={form.courseNumber} onChange={e => setField("courseNumber", e.target.value)} placeholder="e.g. 165 or 240"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Attendance %</label>
            <div className="flex items-center border border-slate-300 rounded-lg px-3 py-2 bg-white">
              <input type="number" min="0" max="100" value={form.attendancePercent}
                onChange={e => setField("attendancePercent", e.target.value)} placeholder="e.g. 85"
                className="w-full text-sm outline-none" />
              <span className="text-sm text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Online Modules %</label>
            <div className="flex items-center border border-slate-300 rounded-lg px-3 py-2 bg-white">
              <input type="number" min="0" max="100" value={form.onlineModulesPercent}
                onChange={e => setField("onlineModulesPercent", e.target.value)} placeholder="e.g. 100"
                className="w-full text-sm outline-none" />
              <span className="text-sm text-slate-400">%</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Current Checkpoint</label>
          <input value={form.checkpoint} onChange={e => setField("checkpoint", e.target.value)} placeholder="e.g. Completed Block 2 theory, awaiting practical"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer border-t border-slate-100 pt-3">
          <input type="checkbox" checked={!!form.formativeAssessmentDone} onChange={() => setField("formativeAssessmentDone", !form.formativeAssessmentDone)} className="rounded border-slate-300" />
          Formative Assessment (in course) Completed
        </label>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Video Link</label>
          <input value={form.videoLink} onChange={e => setField("videoLink", e.target.value)} placeholder="Paste a video URL (e.g. resubmission recording)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        {isCDiploma(form.courseTitle) ? (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-800 mb-2">Coursework</p>
            <p className="text-xs text-slate-400 mb-2">C Diploma coursework is attendance plus a single practical session — no session plans or other milestones required.</p>
            <div className="mb-3">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Session Activity</label>
              <p className="text-xs text-slate-400 mb-1.5">Defaults from the CSV import's Session Activity column — tap a preset or type your own to amend it.</p>
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {C_DIP_SESSION_TOPICS.map(t => (
                  <button key={t} type="button" onClick={() => setField("team", t)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      form.team === t ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={form.team} onChange={e => setField("team", e.target.value)}
                placeholder="e.g. Dribbling — or type your own"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
              <span>Practical Session</span>
              <span className="flex items-center gap-2">
                {form.practicalSessionOutcome && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${outcomeBadgeClass(form.practicalSessionOutcome)}`}>{form.practicalSessionOutcome}</span>
                )}
                <input type="checkbox" checked={form.practicalSessionDone} onChange={() => setField("practicalSessionDone", !form.practicalSessionDone)} className="rounded border-slate-300" />
              </span>
            </label>
          </div>
        ) : isBDiploma(form.courseTitle) ? (
          <>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-semibold text-slate-800 mb-2">Session Plans</p>
              {!selectedCoach || !(selectedCoach.topics && selectedCoach.topics.length) ? (
                <p className="text-xs text-slate-400">No session topics on file for this coach — add them via Coaches &amp; CETs (Add Coach or Bulk Upload → Topics column), or import a coursework CSV with topic columns mapped.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedCoach.topics.slice(0, 4).map(topic => (
                    <label key={topic} className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {topic}
                        {isTopicSuggestedByGap(topic, selectedCoach?.idp?.performanceGap) && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Suggested focus</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {form.sessionPlansOutcomes?.[topic] && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${outcomeBadgeClass(form.sessionPlansOutcomes[topic])}`}>{form.sessionPlansOutcomes[topic]}</span>
                        )}
                        <input type="checkbox" checked={!!form.sessionPlansDone?.[topic]} onChange={() => toggleSessionPlanTopic(topic)} className="rounded border-slate-300" />
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800 mb-1">Coursework</p>
              <label className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
                <span>Goalscoring Presentation</span>
                <span className="flex items-center gap-2">
                  {form.team && <span className="text-xs text-slate-400">({form.team})</span>}
                  <input type="checkbox" checked={form.goalscoringPresentationDone} onChange={() => setField("goalscoringPresentationDone", !form.goalscoringPresentationDone)} className="rounded border-slate-300" />
                </span>
              </label>
              <label className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
                <span>Game Plan</span>
                <input type="checkbox" checked={form.gamePlanDone} onChange={() => setField("gamePlanDone", !form.gamePlanDone)} className="rounded border-slate-300" />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
                <span>Analysis Session Plan</span>
                <input type="checkbox" checked={form.analysisSessionPlanDone} onChange={() => setField("analysisSessionPlanDone", !form.analysisSessionPlanDone)} className="rounded border-slate-300" />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
                <span>Annual (Yearly) Plan</span>
                <input type="checkbox" checked={form.annualPlanDone} onChange={() => setField("annualPlanDone", !form.annualPlanDone)} className="rounded border-slate-300" />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer">
                <span>6WC (6 Week Cycle)</span>
                <input type="checkbox" checked={form.sixWeekCycleDone} onChange={toggleSixWeekCycle} className="rounded border-slate-300" />
              </label>
              <label className={`flex items-center justify-between gap-2 text-sm pl-5 ${form.sixWeekCycleDone ? "text-slate-700 cursor-pointer" : "text-slate-300 cursor-not-allowed"}`}>
                <span>with FC (football conditioning) details</span>
                <input type="checkbox" checked={form.fcDetailsDone} disabled={!form.sixWeekCycleDone}
                  onChange={() => setField("fcDetailsDone", !form.fcDetailsDone)}
                  className="rounded border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed" />
              </label>
            </div>
          </>
        ) : null}

        {(() => {
          const { done, total } = courseworkProgress(form, selectedCoach?.topics);
          return total > 0 ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">Coursework progress</p>
                <p className="text-xs font-bold text-slate-800">{done} of {total} completed</p>
              </div>
              {done === total && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-center">
                  <p className="text-sm font-semibold text-emerald-700">All coursework completed</p>
                </div>
              )}
            </div>
          ) : null;
        })()}

        <div className="flex gap-2">
          <button onClick={saveTask} disabled={!canSave()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-slate-300">
            {editingId ? "Save Changes" : "Save Record"}
          </button>
          <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Completed Tasks</h2>
          <p className="text-sm text-slate-500">Track attendance and coursework completion per coach, per course.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCompletedTasksCsv} disabled={completedTasks.length === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white">
            <FileText className="w-4 h-4" /> Download CSV
          </button>
          <button onClick={() => { setShowCourseworkUpload(s => !s); setShowForm(false); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Upload className="w-4 h-4" /> Import Coursework CSV
          </button>
          <button onClick={openAddForm} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> {showForm && !editingId ? "Close" : "Add Record"}
          </button>
        </div>
      </div>

      {showCourseworkUpload && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Import Diploma Coursework Attendance</p>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Diploma level</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => selectDiplomaType("B")} type="button"
                className={`text-left p-3 rounded-lg border-2 transition-colors ${courseworkDiplomaType === "B" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                <p className="text-sm font-semibold text-slate-800">B Diploma</p>
                <p className="text-xs text-slate-400">Full coursework: session plans + 6 milestone items</p>
              </button>
              <button onClick={() => selectDiplomaType("C")} type="button"
                className={`text-left p-3 rounded-lg border-2 transition-colors ${courseworkDiplomaType === "C" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                <p className="text-sm font-semibold text-slate-800">C Diploma</p>
                <p className="text-xs text-slate-400">Attendance + practical session only</p>
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Upload the coursework CSV, then confirm which column holds the coach's name before generating the preview. Attendance % is
            calculated automatically: a cell counts as attended if it's "Y" or a three-digit block number — starting with 2 for B Diploma
            (out of a fixed 9 sessions) or starting with 1 for C Diploma (out of a fixed 4 sessions); blank or "N" counts as not attended.
            Coaches are matched by name against your roster, and anyone not already on file is added automatically.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Course title</label>
              <input value={courseworkCourseTitle} onChange={e => setCourseworkCourseTitle(e.target.value)}
                placeholder="e.g. AFC/FA B Diploma" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Course Number <span className="text-red-500">*</span></label>
              <input value={courseworkCourseNumber} onChange={e => setCourseworkCourseNumber(e.target.value)}
                placeholder="e.g. 236" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <input type="file" accept=".csv" onChange={handleCourseworkFile}
            className="block w-full text-sm text-slate-600 border border-slate-300 rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm" />
          {courseworkError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {courseworkError}
            </div>
          )}
          {courseworkHeaders && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-3">
              <p className="text-xs font-semibold text-indigo-800">Confirm which columns are which — attendance days are detected automatically from date + session-number headers.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Coach Name column</label>
                  <select value={courseworkNameHeader} onChange={e => { setCourseworkNameHeader(e.target.value); setCourseworkPreview(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                    {courseworkFirstNameHeader && courseworkLastNameHeader && (
                      <option value="__firstlast__">{courseworkFirstNameHeader} + {courseworkLastNameHeader} (combined)</option>
                    )}
                    {courseworkHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {courseworkNameHeader === "__firstlast__" && (
                    <p className="text-xs text-slate-400 mt-1">Combining {courseworkFirstNameHeader} and {courseworkLastNameHeader} into one full name.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Club / Team column (optional)</label>
                  <select value={courseworkClubHeader} onChange={e => { setCourseworkClubHeader(e.target.value); setCourseworkPreview(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">None</option>
                    {courseworkHeaders.filter(h => h !== courseworkNameHeader).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">FA Number column (optional)</label>
                  <select value={courseworkFaHeader} onChange={e => { setCourseworkFaHeader(e.target.value); setCourseworkPreview(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">None</option>
                    {courseworkHeaders.filter(h => h !== courseworkNameHeader).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">CET / Tutor column (optional)</label>
                  <select value={courseworkCetHeader} onChange={e => { setCourseworkCetHeader(e.target.value); setCourseworkPreview(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">None</option>
                    {courseworkHeaders.filter(h => h !== courseworkNameHeader).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Used to propose the assigned CET at the top of the dropdown in New Observation.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    {courseworkDiplomaType === "C" ? "Session Activity column (optional)" : "Goalscoring Presentation (team) column (optional)"}
                  </label>
                  <select value={courseworkGoalscoringHeader} onChange={e => { setCourseworkGoalscoringHeader(e.target.value); setCourseworkPreview(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">None</option>
                    {courseworkHeaders.filter(h => h !== courseworkNameHeader).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Online Modules column (optional)</label>
                  <select value={courseworkOnlineModulesHeader} onChange={e => { setCourseworkOnlineModulesHeader(e.target.value); setCourseworkPreview(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">None</option>
                    {courseworkHeaders.filter(h => h !== courseworkNameHeader).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Accepts a % number (e.g. "75"), a fraction (e.g. "3/4"), or Y/N. Needs to reach 100% to count as complete.</p>
                </div>
              </div>
              {courseworkDiplomaType === "B" && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Session Topic columns (optional — leave as None to use "Session Topic 1–4")</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i}>
                        <label className="text-xs text-slate-500 mb-1 block">Session {i + 1} Topic column</label>
                        <select value={courseworkTopicHeaders[i]}
                          onChange={e => {
                            const next = [...courseworkTopicHeaders];
                            next[i] = e.target.value;
                            setCourseworkTopicHeaders(next);
                            setCourseworkPreview(null);
                          }}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                          <option value="">None (use "Session Topic {i + 1}")</option>
                          {courseworkHeaders.filter(h => h !== courseworkNameHeader).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(() => {
                const candidateAttendanceHeaders = courseworkHeaders.filter(h =>
                  h !== courseworkNameHeader && h !== courseworkClubHeader && h !== courseworkFaHeader && !courseworkTopicHeaders.includes(h)
                );
                const detected = candidateAttendanceHeaders.filter(h => isDateColumnHeader(h, courseworkDiplomaType));
                return (
                  <p className="text-xs text-slate-500">
                    {detected.length > 0
                      ? `Detected ${detected.length} attendance day column${detected.length === 1 ? "" : "s"} automatically from the date + session-number headers.`
                      : 'No date-format attendance columns detected yet — expected headers like "12/07/2026 (3)".'}
                  </p>
                );
              })()}
              <button onClick={generateCourseworkPreview} disabled={!courseworkNameHeader}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-slate-300">
                Generate Preview
              </button>
            </div>
          )}
          {courseworkPreview && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Found {courseworkPreview.length} coach{courseworkPreview.length === 1 ? "" : "es"} in file (of {courseworkRawRows ? courseworkRawRows.length : courseworkPreview.length} rows read)
                {" · "}{courseworkPreview.filter(p => p.matchedCoach).length} already on your roster
                {" · "}{courseworkPreview.filter(p => !p.matchedCoach).length} will be added as new coaches
              </p>
              <p className="text-xs text-slate-400">Attendance columns used: {courseworkDetectedAttendanceHeaders.join(", ")}</p>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {courseworkPreview.map((p, i) => (
                  <div key={i} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{p.coachName}</span>
                      {!p.matchedCoach && <span className="text-xs font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">New coach</span>}
                      {p.cetName && <span className="text-xs font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">CET: {p.cetName}</span>}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{p.attended}/{p.total} sessions · {p.pct}%</span>
                      {p.onlineModulesPct != null && <span>Online: {p.onlineModulesPct}%</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={confirmCourseworkImport}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                  Import Attendance for {courseworkPreview.length} Coach{courseworkPreview.length === 1 ? "" : "es"}
                </button>
                <button onClick={cancelCourseworkUpload} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && !editingId && renderTaskForm()}

      {completedTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">No records yet. Add attendance and coursework tracking for a coach above.</div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by coach name..."
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
          </div>
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const groups = groupTasksForDisplay(completedTasks).map(g => ({
              ...g,
              records: [...g.records].sort((a, b) => (a.coachName || "").localeCompare(b.coachName || ""))
                .filter(t => !q || (t.coachName || "").toLowerCase().split(/\s+/).some(part => part.includes(q))),
            })).filter(g => g.records.length > 0);
            if (groups.length === 0) {
              return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">{q ? `No records match "${searchQuery}".` : "No records yet."}</div>;
            }
            return (
              <div className="space-y-3">
                {groups.map(g => {
                  const isCollapsed = !q && !expandedCourses.has(g.courseNumber);
                  const groupIds = g.records.map(t => t.id);
                  const groupAllSelected = groupIds.length > 0 && groupIds.every(id => selectedTaskIds.has(id));
                  const groupSomeSelected = groupIds.some(id => selectedTaskIds.has(id));
                  const groupSelectedCount = groupIds.filter(id => selectedTaskIds.has(id)).length;
                  return (
                    <div key={g.courseNumber || "none"} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                        <button onClick={() => toggleCourseExpand(g.courseNumber)} type="button" className="flex-1 min-w-0 text-left flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform shrink-0 ${isCollapsed ? "" : "rotate-90"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {g.courseNumber ? `#${g.courseNumber} — ${g.courseTitle}` : g.courseTitle}
                            </p>
                            <p className="text-xs text-slate-400">{g.records.length} coach{g.records.length === 1 ? "" : "es"}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          {groupSomeSelected && (
                            <button onClick={() => deleteSelectedInGroup(g.records)}
                              className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({groupSelectedCount})
                            </button>
                          )}
                          <label onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer whitespace-nowrap">
                            <input type="checkbox" checked={groupAllSelected} onChange={() => toggleSelectAllInGroup(g.records)} className="rounded border-slate-300" />
                            Select all
                          </label>
                        </div>
                      </div>
                      {groupSomeSelected && !g.courseNumber && (
                        <div className="px-4 pb-3 -mt-1">
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-indigo-800 font-medium">Set Course Number for {groupSelectedCount} selected:</p>
                            <input value={bulkCourseNumberInputs[g.courseNumber || "none"] || ""}
                              onChange={e => setBulkCourseNumberInputs(prev => ({ ...prev, [g.courseNumber || "none"]: e.target.value }))}
                              placeholder="e.g. 236" className="border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs w-28 bg-white" />
                            <button onClick={() => applyBulkCourseNumber(g.courseNumber || "none", g.records)}
                              disabled={!(bulkCourseNumberInputs[g.courseNumber || "none"] || "").trim()}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 disabled:cursor-not-allowed">
                              Apply
                            </button>
                            <p className="text-xs text-indigo-500 w-full">This moves these records into that course's group and re-enables auto-fill in New Observation.</p>
                          </div>
                        </div>
                      )}
                      {!isCollapsed && (
                        <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3">
                          {g.records.map(t => {
                            const cardCoach = coaches.find(c => c.id === t.coachId);
                            const { done, total } = courseworkProgress(t, cardCoach?.topics);
                            const items = total > 0 ? courseworkItems(t, cardCoach?.topics, t.team) : [];
                            const suggestedTopics = (cardCoach?.topics || []).filter(top => isTopicSuggestedByGap(top, cardCoach?.idp?.performanceGap));
                            const unfinishedLabels = items.filter(i => !i.done).map(i => i.label);
                            const hasNotYetCompetent = items.some(i => i.outcome === "Not Yet Competent") || t.practicalSessionOutcome === "Not Yet Competent";
                            const attendanceComplete = t.attendancePercent >= 100 && total > 0;
                            const isDetailsExpanded = expandedTaskId === t.id;
                            const isIdpExpanded = idpExpandedTaskId === t.id;
                            const matchingReports = (observations || [])
                              .filter(o => o.status !== "draft" && o.coachId === t.coachId && (o.courseNumber || "").trim() === (t.courseNumber || "").trim() && t.courseNumber)
                              .sort((a, b) => new Date(b.date) - new Date(a.date));
                            return (
                              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
                                {editingId === t.id ? renderTaskForm() : (
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <input type="checkbox" checked={selectedTaskIds.has(t.id)} onChange={() => toggleTaskSelected(t.id)}
                                          className="rounded border-slate-300 mt-1 shrink-0" title="Nominate for delete" />
                                        <div className="min-w-0">
                                          <p className="font-semibold text-slate-900 text-sm truncate">{t.coachName}</p>
                                          {idpHasContent(cardCoach?.idp) && (
                                            <button type="button" onClick={() => setIdpExpandedTaskId(isIdpExpanded ? null : t.id)}
                                              className="inline-block mt-0.5 mb-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full hover:bg-sky-100">
                                              {isIdpExpanded ? "Hide IDP ▲" : "IDP on file ▼"}
                                            </button>
                                          )}
                                          <p className="text-xs text-slate-400 truncate">{t.courseTitle}{t.courseNumber ? ` (#${t.courseNumber})` : ""}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => startEdit(t)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100">
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setConfirmDeleteId(t.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {isIdpExpanded && cardCoach && (
                                      <div className="mt-3 border border-sky-200 bg-sky-50 rounded-lg p-3 space-y-1.5">
                                        <p className="text-xs font-semibold text-sky-900">Individual Development Plan — {cardCoach.name}</p>
                                        {cardCoach.idp.yearsCoaching && <p className="text-xs text-slate-600"><strong>Years Coaching:</strong> {cardCoach.idp.yearsCoaching}</p>}
                                        {cardCoach.idp.qualifications && <p className="text-xs text-slate-600"><strong>Qualifications:</strong> {cardCoach.idp.qualifications}</p>}
                                        {cardCoach.idp.mentor && <p className="text-xs text-slate-600"><strong>Mentor:</strong> {cardCoach.idp.mentor}</p>}
                                        {cardCoach.idp.strengths && <p className="text-xs text-slate-600 whitespace-pre-wrap"><strong>Strengths:</strong> {cardCoach.idp.strengths}</p>}
                                        {cardCoach.idp.performanceGap && <p className="text-xs text-slate-600 whitespace-pre-wrap"><strong>Performance Gap:</strong> {cardCoach.idp.performanceGap}</p>}
                                        {cardCoach.idp.goalsPlan && <p className="text-xs text-slate-600 whitespace-pre-wrap"><strong>Goals/Plan:</strong> {cardCoach.idp.goalsPlan}</p>}
                                        {cardCoach.idp.fileText && <p className="text-xs text-slate-500 whitespace-pre-wrap mt-1 pt-1 border-t border-sky-100"><strong>Uploaded Document Notes:</strong> {cardCoach.idp.fileText}</p>}
                                      </div>
                                    )}

                                    <div className="mt-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Attendance</p>
                                        <p className="text-xs font-bold text-slate-700">{t.attendancePercent}%</p>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${t.attendancePercent >= 80 ? "bg-emerald-500" : t.attendancePercent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                          style={{ width: `${Math.min(100, t.attendancePercent)}%` }} />
                                      </div>
                                    </div>
                                    <div className="mt-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Online Modules</p>
                                        <p className="text-xs font-bold text-slate-700">{t.onlineModulesPercent || 0}%</p>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${(t.onlineModulesPercent || 0) >= 80 ? "bg-emerald-500" : (t.onlineModulesPercent || 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                          style={{ width: `${Math.min(100, t.onlineModulesPercent || 0)}%` }} />
                                      </div>
                                    </div>

                                    {total > 0 && (
                                      <button type="button" onClick={() => setExpandedTaskId(isDetailsExpanded ? null : t.id)}
                                        className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isDetailsExpanded ? "rotate-90" : ""}`} />
                                        {isDetailsExpanded ? "Hide full checklist" : `Expand full checklist (${done}/${total})`}
                                      </button>
                                    )}

                                    {isDetailsExpanded && (
                                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                        {t.checkpoint && (
                                          <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1">Current Checkpoint</p>
                                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-2.5 py-1.5">{t.checkpoint}</p>
                                          </div>
                                        )}
                                        {t.videoLink && (
                                          <a href={t.videoLink} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
                                            ▶ Watch Video
                                          </a>
                                        )}
                                        {total > 0 && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Full Checklist</p>
                                              <p className="text-xs font-bold text-slate-700">{done} of {total} completed</p>
                                            </div>
                                            <div className="space-y-1">
                                              {items.map((item, i) => {
                                                const itemReport = item.done && (t.courseNumber || "").trim()
                                                  ? (observations || [])
                                                      .filter(o => o.status !== "draft" && o.coachId === t.coachId && (o.courseNumber || "").trim() === (t.courseNumber || "").trim() &&
                                                        ((isBDiploma(t.courseTitle) && o.sessionTopic === item.label) || (isCDiploma(t.courseTitle) && item.label === "Practical Session")))
                                                      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                                                  : null;
                                                return (
                                                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                                    <span className={`flex items-center gap-1.5 ${item.done ? "text-slate-700" : "text-slate-400"}`}>
                                                      {item.done ? <Check className="w-3 h-3 text-emerald-600 shrink-0" /> : <span className="w-3 h-3 rounded-full border border-slate-300 inline-block shrink-0" />}
                                                      {itemReport && onViewReport ? (
                                                        <button type="button" onClick={() => onViewReport(itemReport.id)} className="underline decoration-dotted hover:text-indigo-600">{item.label}</button>
                                                      ) : (
                                                        <span>{item.label}</span>
                                                      )}
                                                      {suggestedTopics.includes(item.label) && <span className="text-amber-500" title="Suggested focus from IDP Performance Gap">★</span>}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 shrink-0">
                                                      {item.team && <span className="text-slate-400">({item.team})</span>}
                                                      {item.outcome && (
                                                        <span className={`font-semibold px-1.5 py-0.5 rounded-full ${outcomeBadgeClass(item.outcome)}`}>{item.outcome}</span>
                                                      )}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            {attendanceComplete && (
                                              <div className="pt-1 space-y-2">
                                                {done < total ? (
                                                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                                                    <p className="text-xs font-semibold text-red-700 mb-1">Attendance complete — still to finish ({total - done} of {total}):</p>
                                                    <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
                                                      {unfinishedLabels.map((l, i) => <li key={i}>{l}</li>)}
                                                    </ul>
                                                  </div>
                                                ) : hasNotYetCompetent ? (
                                                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                                                    <p className="text-sm font-semibold text-red-700">Record a 20-25 min video at your club and submit</p>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="bg-emerald-600 text-white text-center text-sm font-semibold px-3 py-1.5 rounded-lg">
                                                      Completed
                                                    </div>
                                                    {matchingReports.length > 0 && (
                                                      <div className="space-y-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Session Observation Report{matchingReports.length === 1 ? "" : "s"}</p>
                                                        {matchingReports.map(r => (
                                                          <button key={r.id} onClick={() => onViewReport && onViewReport(r.id)}
                                                            className="w-full text-left text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center justify-between">
                                                            <span>{new Date(r.date).toLocaleDateString("en-GB")}{r.sessionTopic ? ` · ${r.sessionTopic}` : ""}</span>
                                                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                                          </button>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <button onClick={() => downloadHtml(buildCandidateHtml(t, cardCoach, observations), `${(t.coachName || "candidate").replace(/[^a-z0-9]+/gi, "-")}-observation-history.html`)}
                                          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-300 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50">
                                          <FileText className="w-3.5 h-3.5" /> Download HTML for {t.coachName}
                                        </button>
                                      </div>
                                    )}

                                    {confirmDeleteId === t.id && (
                                      <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                                        <p className="text-xs text-red-700 flex-1">Delete this record for {t.coachName}?</p>
                                        <button onClick={() => deleteTask(t.id)} className="text-xs font-semibold text-red-700 hover:text-red-800 whitespace-nowrap">Delete</button>
                                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// A drop-in replacement for <textarea> that adds a dictation mic button —
// useful since CETs are often typing these notes live, pitch-side, while
// watching a session. Uses the browser's built-in Web Speech API (no
// external service or API key needed); the mic button simply doesn't
// render in browsers that don't support it (Firefox, notably), so it
// degrades to a plain textarea with no error or broken state.
function VoiceTextarea({ value, onChange, className, rows, placeholder, ...rest }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);
  const baseValueRef = useRef("");

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSupported(!!SR);
    return () => { recognitionRef.current && recognitionRef.current.stop(); };
  }, []);

  function stopListening() {
    recognitionRef.current && recognitionRef.current.stop();
    setListening(false);
  }

  function toggleListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      stopListening();
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    baseValueRef.current = value || "";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      const sep = baseValueRef.current && !baseValueRef.current.endsWith(" ") ? " " : "";
      onChange({ target: { value: `${baseValueRef.current}${sep}${transcript}`.trim() } });
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="relative">
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} className={className}
        {...rest}
        onBlur={(e) => { if (listening) stopListening(); rest.onBlur && rest.onBlur(e); }} />
      {supported && (
        <button type="button" onClick={toggleListening} onMouseDown={(e) => e.preventDefault()}
          title={listening ? "Stop dictation" : "Dictate with your voice"}
          className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            listening ? "bg-red-500 text-white animate-pulse" : "bg-white text-slate-400 border border-slate-200 hover:text-slate-600 hover:border-slate-300"
          }`}>
          <Mic className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function NewObservation({ coaches, courses, educators, saveCoaches, saveEducators, observations, saveObservations, completedTasks, existingObservation, onSaved, onCancel }) {
  const isEditing = !!existingObservation;

  const [step, setStep] = useState(0);
  const [typeOfSessionOpen, setTypeOfSessionOpen] = useState(false);
  const [coachId, setCoachId] = useState(() => existingObservation?.coachId || "");
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [coachDropdownOpen, setCoachDropdownOpen] = useState(false);
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachClub, setNewCoachClub] = useState("");
  const [showIdpEditor, setShowIdpEditor] = useState(false);
  const [idpForm, setIdpForm] = useState(emptyIdp());
  const [idpParsing, setIdpParsing] = useState(false);
  const [idpError, setIdpError] = useState("");

  const initialEducatorMatch = existingObservation
    ? educators.find(e => e.name.toLowerCase() === (existingObservation.coachEducatorName || "").toLowerCase())
    : null;
  const [educatorRole, setEducatorRole] = useState(() => existingObservation?.educatorRole || "Coach Education Tutor (CET)");
  const [educatorId, setEducatorId] = useState(() => {
    if (!existingObservation) return "";
    return initialEducatorMatch ? initialEducatorMatch.id : "__new__";
  });
  const [educatorSearchQuery, setEducatorSearchQuery] = useState("");
  const [educatorDropdownOpen, setEducatorDropdownOpen] = useState(false);
  const [newEducatorName, setNewEducatorName] = useState(() => {
    if (!existingObservation) return "";
    return initialEducatorMatch ? "" : (existingObservation.coachEducatorName || "");
  });

  const [date, setDate] = useState(() => existingObservation?.date || new Date().toISOString().slice(0, 10));
  const [memberFederation, setMemberFederation] = useState(() => existingObservation?.memberFederation || DEFAULT_MEMBER_FEDERATION);
  const [sessionType, setSessionType] = useState(() => existingObservation?.sessionType || "formal");

  const initialCourseMatch = existingObservation
    ? courses.find(c => c.title === existingObservation.formalCourseName)
    : null;
  const [formalCourseOption, setFormalCourseOption] = useState(() => {
    if (!existingObservation || !existingObservation.formalCourseName) return "";
    return initialCourseMatch ? initialCourseMatch.id : "__other__";
  });
  const [formalCourseName, setFormalCourseName] = useState(() => existingObservation?.formalCourseName || "");
  const [diplomaBlock, setDiplomaBlock] = useState(() => existingObservation?.diplomaBlock || "");
  const [courseNumber, setCourseNumber] = useState(() => existingObservation?.courseNumber || "");
  const [ageGroup, setAgeGroup] = useState(() => existingObservation?.ageGroup || "");
  const [keyOutcomesFocus, setKeyOutcomesFocus] = useState(() => existingObservation?.keyOutcomesFocus || "");
  const initialTopicCoach = existingObservation ? coaches.find(c => c.id === existingObservation.coachId) : null;
  const [sessionTopicOption, setSessionTopicOption] = useState(() => {
    if (!existingObservation || !existingObservation.sessionTopic) return "";
    const topics = initialTopicCoach?.topics || [];
    return topics.includes(existingObservation.sessionTopic) ? existingObservation.sessionTopic : "__other__";
  });
  const [sessionTopic, setSessionTopic] = useState(() => existingObservation?.sessionTopic || "");
  const [coachingActivity, setCoachingActivity] = useState(() => existingObservation?.coachingActivity || "");
  const [sessionPlan, setSessionPlan] = useState(() => existingObservation?.sessionPlan ? { ...emptySessionPlan(), ...existingObservation.sessionPlan } : emptySessionPlan());
  const [areas, setAreas] = useState(() => existingObservation?.areas || emptyAreas());
  const [sochangeit, setSochangeit] = useState(() => existingObservation?.sochangeit || emptySochangeit());
  const [strengths, setStrengths] = useState(() => existingObservation?.strengths || "");
  const [areasForDevelopment, setAreasForDevelopment] = useState(() => existingObservation?.areas_feedback || "");
  const [planNotes, setPlanNotes] = useState(() => existingObservation?.planNotes || "");
  const [actionPlan, setActionPlan] = useState(() => existingObservation?.actionPlan || ["", "", ""]);
  const [assessmentOutcome, setAssessmentOutcome] = useState(() => existingObservation?.assessmentOutcome || "");
  const [assessorSignature, setAssessorSignature] = useState(() => existingObservation?.assessorSignature || "");
  const [autoSignature, setAutoSignature] = useState("");
  const [cetNotes, setCetNotes] = useState(() => existingObservation?.cetNotes || "");
  const [potentialPathways, setPotentialPathways] = useState(() => existingObservation?.potentialPathways || []);

  const selectedCoach = coaches.find(c => c.id === coachId);
  const usingNewCoach = coachId === "__new__";
  const matchedCompletedTask = (completedTasks || []).find(t =>
    t.coachId === coachId &&
    ((courseNumber && (t.courseNumber || "").trim() === courseNumber.trim()) ||
     (!courseNumber && t.courseTitle === formalCourseName))
  );
  const proposedCetName = (matchedCompletedTask?.cet || "").trim();
  const selectedEducator = educators.find(e => e.id === educatorId);
  const usingNewEducator = educatorId === "__new__";
  const roleOptions = EDUCATOR_ROLES[sessionType] || EDUCATOR_ROLES.informal;
  const isCetRole = educatorRole === "Coach Education Tutor (CET)";
  const isTdRole = educatorRole === "Technical Director / Coaching Coordinator";
  const runningTotal = areasTotal(areas);
  const threshold = sessionType === "formal" ? diplomaThresholdFor(formalCourseName) : null;
  const effectiveThreshold = threshold ?? 9;
  const suggestedOutcome = runningTotal >= HIGHLY_COMPETENT_THRESHOLD ? "Highly Competent"
    : runningTotal >= effectiveThreshold ? "Competent" : "Not Yet Competent";

  const [outcomeManuallySet, setOutcomeManuallySet] = useState(() => {
    if (!existingObservation?.assessmentOutcome) return false;
    const initialAreas = existingObservation.areas || emptyAreas();
    const initialTotal = areasTotal(initialAreas);
    const th = existingObservation.sessionType === "formal" ? diplomaThresholdFor(existingObservation.formalCourseName) : null;
    const eff = th ?? 9;
    const sugg = initialTotal >= HIGHLY_COMPETENT_THRESHOLD ? "Highly Competent" : initialTotal >= eff ? "Competent" : "Not Yet Competent";
    return existingObservation.assessmentOutcome !== sugg;
  });
  useEffect(() => {
    if (!outcomeManuallySet) setAssessmentOutcome(suggestedOutcome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedOutcome]);

  // Keyed off the actual score, not the assessmentOutcome dropdown value —
  // that dropdown can lag behind the real score if it was manually touched
  // earlier in the session (outcomeManuallySet), which previously meant this
  // box wouldn't appear at 16+ until the dropdown was flipped by hand.
  const isHighlyCompetent = runningTotal >= HIGHLY_COMPETENT_THRESHOLD;
  const isNotYetCompetent = (assessmentOutcome || suggestedOutcome) === "Not Yet Competent";

  function togglePathway(opt) {
    setPotentialPathways(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]);
  }

  function handleSessionType(type) {
    setSessionType(type);
    setAgeGroup("");
    const defaultRole = type === "informal" ? "Technical Director / Coaching Coordinator" : "Coach Education Tutor (CET)";
    if (type !== sessionType) {
      handleRoleChange(defaultRole);
    }
  }

  function handleRoleChange(value) {
    setEducatorRole(value);
    setEducatorId("");
    setEducatorSearchQuery("");
    setNewEducatorName("");
    if (value !== "Coach Education Tutor (CET)") {
      setAssessorSignature("");
      setAutoSignature("");
    }
  }

  useEffect(() => {
    let name = "";
    if (isCetRole) {
      name = usingNewEducator ? newEducatorName.trim() : (selectedEducator?.name || "");
    } else if (isTdRole) {
      name = newEducatorName.trim();
    }
    if (!name) return;
    if (assessorSignature === "" || assessorSignature === autoSignature) {
      setAssessorSignature(name);
      setAutoSignature(name);
    }
  }, [educatorRole, educatorId, newEducatorName, selectedEducator]);

  function handleFormalCourseOptionChange(value) {
    setFormalCourseOption(value);
    if (value === "__other__") {
      setFormalCourseName("");
      setDiplomaBlock("");
      setCourseNumber("");
    } else {
      const c = courses.find(co => co.id === value);
      const newName = c ? c.title : "";
      setFormalCourseName(newName);
      setDiplomaBlock("");
      setCourseNumber("");
    }
  }

  function setArea(key, field, val) {
    setAreas(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  }

  function handleSessionTopicOptionChange(value) {
    setSessionTopicOption(value);
    setSessionTopic(value === "__other__" ? "" : value);
  }

  function setSessionPlanField(key, val) {
    if (key === "numberOfPlayers" || key === "pitchLength" || key === "pitchWidth") {
      val = sanitizeAlphanumeric(val);
    }
    setSessionPlan(prev => ({ ...prev, [key]: val }));
  }

  function toggleZoneUsed(n) {
    setSessionPlan(prev => {
      if (prev.zonesUsed.includes(n)) {
        return { ...prev, zonesUsed: prev.zonesUsed.filter(z => z !== n) };
      }
      if (prev.zonesUsed.length > 0 && !zoneNeighbors(n).some(nb => prev.zonesUsed.includes(nb))) {
        return prev;
      }
      return { ...prev, zonesUsed: [...prev.zonesUsed, n].sort((a, b) => a - b) };
    });
  }

  function selectFullPitch() {
    setSessionPlan(prev => ({
      ...prev,
      zonesUsed: prev.zonesUsed.length === 18 ? [] : Array.from({ length: 18 }, (_, i) => i + 1),
    }));
  }

  useEffect(() => {
    const thirdsPresent = new Set(sessionPlan.zonesUsed.map(zoneThird));
    setSessionPlan(prev => {
      const newGeo = ["D3", "M3", "F3"].filter(t => thirdsPresent.has(t));
      const same = newGeo.length === prev.pitchGeography.length && newGeo.every(g => prev.pitchGeography.includes(g));
      if (same) return prev;
      return { ...prev, pitchGeography: newGeo };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPlan.zonesUsed]);

  function togglePitchGeography(opt) {
    setSessionPlan(prev => ({
      ...prev,
      pitchGeography: prev.pitchGeography.includes(opt) ? prev.pitchGeography.filter(g => g !== opt) : [...prev.pitchGeography, opt],
    }));
  }

  function toggleSochangeit(key) {
    setSochangeit(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleTypeOfSession(opt) {
    setSessionPlan(prev => ({
      ...prev,
      typeOfSession: prev.typeOfSession.includes(opt) ? prev.typeOfSession.filter(t => t !== opt) : [...prev.typeOfSession, opt],
    }));
  }

  function toggleProgressiveType(opt) {
    setSessionPlan(prev => ({
      ...prev,
      progressiveType: prev.progressiveType.includes(opt) ? prev.progressiveType.filter(t => t !== opt) : [...prev.progressiveType, opt],
    }));
  }

  function togglePppType(opt) {
    setSessionPlan(prev => ({
      ...prev,
      pppType: prev.pppType.includes(opt) ? prev.pppType.filter(t => t !== opt) : [...prev.pppType, opt],
    }));
  }

  const actionTextareaRefs = useRef([]);
  const pitchLengthRef = useRef(null);
  const pitchWidthRef = useRef(null);

  function setActionItem(idx, val) {
    setActionPlan(prev => prev.map((v, i) => i === idx ? val : v));
  }

  useEffect(() => {
    actionTextareaRefs.current.forEach(el => {
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    });
  }, [actionPlan]);

  function suggestActions() {
    setActionPlan(generateActionPlan(areas, areasForDevelopment, planNotes, isNotYetCompetent));
  }

  function pullGoalsPlanFromIdp() {
    if (!selectedCoach?.idp?.goalsPlan) return;
    const text = selectedCoach.idp.goalsPlan;
    setKeyOutcomesFocus(prev => prev.trim() ? `${prev.trim()}\n\n${text}` : text);
  }

  function openIdpEditor() {
    setIdpForm(selectedCoach?.idp ? { ...emptyIdp(), ...selectedCoach.idp } : emptyIdp());
    setIdpError("");
    setShowIdpEditor(true);
  }

  function closeIdpEditor() {
    setShowIdpEditor(false);
    setIdpForm(emptyIdp());
    setIdpError("");
  }

  function setIdpField(key, val) {
    setIdpForm(prev => ({ ...prev, [key]: val }));
  }

  function handleIdpFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      setIdpError("Please upload a .docx file.");
      return;
    }
    setIdpParsing(true);
    setIdpError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const arrayBuffer = ev.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setIdpForm(prev => ({ ...prev, fileName: file.name, fileText: (result?.value || "").trim() }));
      } catch (err) {
        setIdpError("Could not read this document. You can still fill in the fields manually.");
      }
      setIdpParsing(false);
    };
    reader.onerror = () => { setIdpError("Could not read this file."); setIdpParsing(false); };
    reader.readAsArrayBuffer(file);
  }

  function removeIdpFile() {
    setIdpForm(prev => ({ ...prev, fileName: "", fileText: "" }));
  }

  function saveIdpFromObservation() {
    if (!selectedCoach) return;
    saveCoaches(coaches.map(c => c.id === selectedCoach.id
      ? { ...c, idp: { ...idpForm, updatedAt: new Date().toISOString() } }
      : c));
    closeIdpEditor();
  }

  useEffect(() => {
    if (selectedCoach?.idp?.goalsPlan && !keyOutcomesFocus.trim()) {
      setKeyOutcomesFocus(selectedCoach.idp.goalsPlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  useEffect(() => {
    if (!isBDiploma(formalCourseName) || diplomaBlock || !matchedCompletedTask) return;
    const days = Math.round(((matchedCompletedTask.attendancePercent || 0) / 100) * 9);
    let block = "";
    if (days >= 1 && days <= 2) block = "Block 1";
    else if (days >= 3 && days <= 5) block = "Block 2";
    else if (days >= 6 && days <= 9) block = "Block 3";
    if (block) setDiplomaBlock(block);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCompletedTask?.attendancePercent, formalCourseName]);

  useEffect(() => {
    if (existingObservation || usingNewCoach || !coachId || !completedTasks) return;
    const matches = completedTasks.filter(t => t.coachId === coachId && (t.courseNumber || "").trim());
    const distinctNumbers = [...new Set(matches.map(t => t.courseNumber.trim()))];
    if (distinctNumbers.length === 1) {
      const match = matches.find(t => t.courseNumber.trim() === distinctNumbers[0]);
      setCourseNumber(distinctNumbers[0]);
      const libMatch = courses.find(c => c.title === match.courseTitle);
      if (libMatch) {
        setFormalCourseOption(libMatch.id);
        setFormalCourseName(libMatch.title);
      } else if (match.courseTitle) {
        setFormalCourseOption("__other__");
        setFormalCourseName(match.courseTitle);
      }
      if (isCDiploma(match.courseTitle) && match.team && !sessionTopic.trim()) {
        const csvMatch = C_DIP_SESSION_TOPICS.find(t => t.toLowerCase() === match.team.trim().toLowerCase());
        if (csvMatch) setSessionTopic(csvMatch);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  useEffect(() => {
    if (!isCDiploma(formalCourseName) || !sessionTopic || !coachingActivity) return;
    const objective = COACHING_ACTIVITY_OBJECTIVES[sessionTopic]?.[coachingActivity];
    if (objective) {
      setSessionPlan(prev => ({ ...prev, sessionObjective: objective }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionTopic, coachingActivity]);

  useEffect(() => {
    if (step === 4 && actionPlan.every(a => !a.trim())) {
      setActionPlan(generateActionPlan(areas, areasForDevelopment, planNotes, isNotYetCompetent));
    }
  }, [step]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function canProceedStep0() {
    if (!date) return false;
    if (isCetRole) {
      if (usingNewEducator) { if (!newEducatorName.trim()) return false; } else if (!educatorId) return false;
    } else {
      if (!newEducatorName.trim()) return false;
    }
    if (sessionType === "formal" && !formalCourseName.trim()) return false;
    if (sessionType === "formal" && (isBDiploma(formalCourseName) || isADiploma(formalCourseName)) && !diplomaBlock) return false;
    if (sessionType === "informal" && !ageGroup.trim()) return false;
    if (usingNewCoach) return newCoachName.trim().length > 0;
    return !!coachId;
  }

  function canProceedSessionPlan() {
    const objectiveOk = sessionPlan.sessionObjective.trim().length > 0;
    const otherFieldsOk = SESSION_PLAN_FIELDS.filter(f => f.required && f.key !== "sizeOfPitch" && f.key !== "numberOfPlayers").every(f => sessionPlan[f.key].trim().length > 0);
    const numberOfPlayersOk = sessionPlan.numberOfPlayers.trim().length > 0;
    const pitchSizeOk = sessionPlan.pitchLength.trim().length > 0 && sessionPlan.pitchWidth.trim().length > 0;
    const sessionTopicRequired = sessionType === "formal" && (isBDiploma(formalCourseName) || isCDiploma(formalCourseName));
    const sessionTopicOk = sessionTopicRequired ? sessionTopic.trim().length > 0 : true;
    return objectiveOk && otherFieldsOk && numberOfPlayersOk && pitchSizeOk && sessionPlan.typeOfSession.length > 0 && sessionTopicOk;
  }

  function canProceedStep1() {
    return ASSESSMENT_AREAS.every(a => {
      const score = areas[a.key].score;
      if (typeof score !== "number") return false;
      if (score <= 1 && !areas[a.key].notes.trim()) return false;
      return true;
    });
  }

  function canProceedStep3() {
    return planNotes.trim().length > 0;
  }

  function canSave() {
    return planNotes.trim().length > 0;
  }

  const autoSaveDraftIdRef = useRef(null);

  function canSaveDraft() {
    if (usingNewCoach) return newCoachName.trim().length > 0;
    return !!coachId;
  }

  function autoSaveDraft() {
    if (!saveObservations || !observations) return;
    if (!coachId && !newCoachName.trim()) return;

    const draftId = autoSaveDraftIdRef.current || (existingObservation ? existingObservation.id : uid());

    const educatorName = isCetRole
      ? (usingNewEducator ? newEducatorName.trim() : (selectedEducator?.name || ""))
      : newEducatorName.trim();

    const obsData = {
      id: draftId,
      status: "draft",
      coachId: usingNewCoach ? null : coachId,
      coachName: usingNewCoach ? newCoachName.trim() : (selectedCoach?.name || ""),
      coachEducatorName: educatorName,
      educatorRole,
      date,
      memberFederation,
      sessionType,
      formalCourseName: sessionType === "formal" ? formalCourseName.trim() : "",
      diplomaBlock: sessionType === "formal" && (isBDiploma(formalCourseName) || isADiploma(formalCourseName)) ? diplomaBlock : "",
      courseNumber: sessionType === "formal" && (isCDiploma(formalCourseName) || isBDiploma(formalCourseName)) ? courseNumber.trim() : "",
      ageGroup: ageGroup.trim(),
      keyOutcomesFocus: keyOutcomesFocus.trim(),
      sessionTopic: sessionTopic.trim(),
      coachingActivity: coachingActivity.trim(),
      sessionPlan,
      areas,
      sochangeit,
      strengths: strengths.trim(),
      areas_feedback: areasForDevelopment.trim(),
      planNotes: planNotes.trim(),
      actionPlan,
      assessmentOutcome: assessmentOutcome || suggestedOutcome || "",
      potentialPathways: isHighlyCompetent ? potentialPathways : [],
      diplomaThreshold: threshold,
      assessorSignature: assessorSignature.trim(),
      cetNotes: cetNotes.trim(),
      savedAt: new Date().toISOString(),
    };

    autoSaveDraftIdRef.current = draftId;
    const existingIndex = observations.findIndex(o => o.id === draftId);
    if (existingIndex !== -1) {
      saveObservations(observations.map(o => o.id === draftId ? obsData : o));
    } else {
      saveObservations([...observations, obsData]);
    }
  }

  function handleNext() {
    autoSaveDraft();
    setStep(s => s + 1);
  }

  function buildObservation(status) {
    let finalCoachId = coachId;
    let finalCoachName = selectedCoach?.name;
    if (usingNewCoach) {
      const nc = { id: uid(), name: newCoachName.trim(), club: newCoachClub.trim(), level: "" };
      saveCoaches([...coaches, nc]);
      finalCoachId = nc.id;
      finalCoachName = nc.name;
    }
    let finalEducatorName;
    if (isCetRole) {
      finalEducatorName = selectedEducator?.name;
      if (usingNewEducator) {
        const ne = { id: uid(), name: newEducatorName.trim() };
        saveEducators([...educators, ne]);
        finalEducatorName = ne.name;
      }
    } else {
      finalEducatorName = newEducatorName.trim();
    }
    return {
      id: existingObservation ? existingObservation.id : (autoSaveDraftIdRef.current || uid()),
      status,
      coachId: finalCoachId,
      coachName: finalCoachName,
      coachEducatorName: finalEducatorName,
      educatorRole,
      date,
      memberFederation,
      sessionType,
      formalCourseName: sessionType === "formal" ? formalCourseName.trim() : "",
      diplomaBlock: sessionType === "formal" && (isBDiploma(formalCourseName) || isADiploma(formalCourseName)) ? diplomaBlock : "",
      courseNumber: sessionType === "formal" && (isCDiploma(formalCourseName) || isBDiploma(formalCourseName)) ? courseNumber.trim() : "",
      ageGroup: ageGroup.trim(),
      keyOutcomesFocus: keyOutcomesFocus.trim(),
      sessionTopic: sessionTopic.trim(),
      coachingActivity: coachingActivity.trim(),
      sessionPlan,
      areas,
      sochangeit,
      strengths: strengths.trim(),
      areas_feedback: areasForDevelopment.trim(),
      planNotes: planNotes.trim(),
      actionPlan: actionPlan.map(a => a.trim()),
      assessmentOutcome: assessmentOutcome || suggestedOutcome || "",
      potentialPathways: isHighlyCompetent ? potentialPathways : [],
      diplomaThreshold: threshold,
      assessorSignature: assessorSignature.trim(),
      cetNotes: cetNotes.trim(),
    };
  }

  function handleSaveAndReturn() {
    onSaved(buildObservation("draft"));
  }

  function handleSaveAndSubmit() {
    onSaved(buildObservation("submitted"));
  }

  const steps = ["Session Details", "Session Plan", "Assessment Scoring", "Feedback", "Development Plan"];

  return (
    <div className={`space-y-5 ${step === 2 ? "pb-28" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{isEditing ? "Edit Observation" : "New Observation"}</h2>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>

      {isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {existingObservation.status === "submitted"
              ? "You're editing a previously submitted report (reopened by an admin). Use Save & Submit to save your changes back to History."
              : "You're editing a saved draft. Use Save & Submit when it's ready to go into History."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === step ? "text-slate-900" : "text-slate-400"} hidden sm:block`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1.5 block">Coach being observed</label>
              {selectedCoach ? (
                <div className="flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedCoach.name}</p>
                    <div className="flex items-center gap-2">
                      {selectedCoach.club && <p className="text-xs text-slate-400">{selectedCoach.club}</p>}
                      {selectedCoach.faNumber && (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">FA: {selectedCoach.faNumber}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setCoachId(""); setCoachSearchQuery(""); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Change</button>
                </div>
              ) : usingNewCoach ? (
                <div className="border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50 flex items-center justify-between">
                  <p className="text-sm text-slate-600">Adding a new coach below</p>
                  <button onClick={() => { setCoachId(""); setCoachSearchQuery(""); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Search instead</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={coachSearchQuery}
                    onChange={e => { setCoachSearchQuery(e.target.value); setCoachDropdownOpen(true); }}
                    onFocus={() => setCoachDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setCoachDropdownOpen(false), 150)}
                    placeholder="Search for a coach by name..."
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm"
                  />
                  {coachDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-md max-h-56 overflow-y-auto">
                      {(() => {
                        const q = coachSearchQuery.trim().toLowerCase();
                        const matches = [...coaches]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .filter(c => !q || c.name.toLowerCase().split(/\s+/).some(part => part.includes(q)));
                        return (
                          <>
                            {matches.length === 0 ? (
                              <p className="px-3 py-2.5 text-sm text-slate-400">No coaches match "{coachSearchQuery}".</p>
                            ) : (
                              matches.map(c => (
                                <button key={c.id} onMouseDown={() => { setCoachId(c.id); setCoachSearchQuery(c.name); setCoachDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0">
                                  <span className="font-medium text-slate-800">{c.name}</span>
                                  {c.club && <span className="text-xs text-slate-400 ml-1.5">({c.club})</span>}
                                  {c.faNumber && <span className="text-xs text-indigo-600 ml-1.5">FA: {c.faNumber}</span>}
                                </button>
                              ))
                            )}
                            <button onMouseDown={() => { setCoachId("__new__"); setCoachDropdownOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100">
                              + Add a new coach
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
            {usingNewCoach && (
              <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-slate-100">
                <input value={newCoachName} onChange={e => setNewCoachName(e.target.value)} placeholder="New coach name" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <input value={newCoachClub} onChange={e => setNewCoachClub(e.target.value)} placeholder="Club / Team" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Role</label>
                <select value={educatorRole} onChange={e => handleRoleChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Date of observation</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Member Federation</label>
              <select value={memberFederation} onChange={e => setMemberFederation(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                {MEMBER_FEDERATIONS.map(mf => <option key={mf.key} value={mf.key}>{mf.label}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">Sets the logo shown on this report's PDF export.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1.5 block">
                {isCetRole ? "Coach Education Tutor (CET)" : "Technical Director / Coaching Coordinator"}
              </label>
              {isCetRole ? (
                selectedEducator ? (
                  <div className="flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50">
                    <p className="text-sm font-medium text-slate-800">{selectedEducator.name}</p>
                    <button onClick={() => { setEducatorId(""); setEducatorSearchQuery(""); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Change</button>
                  </div>
                ) : usingNewEducator ? (
                  <div className="space-y-2">
                    <div className="border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50 flex items-center justify-between">
                      <p className="text-sm text-slate-600">Adding a new tutor below</p>
                      <button onClick={() => { setEducatorId(""); setEducatorSearchQuery(""); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Search instead</button>
                    </div>
                    <input value={newEducatorName} onChange={e => setNewEducatorName(e.target.value)} placeholder="New tutor name"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={educatorSearchQuery}
                        onChange={e => { setEducatorSearchQuery(e.target.value); setEducatorDropdownOpen(true); }}
                        onFocus={() => setEducatorDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setEducatorDropdownOpen(false), 150)}
                        placeholder="Search for a CET by name..."
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm"
                      />
                      {educatorDropdownOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-md max-h-56 overflow-y-auto">
                          {(() => {
                            const q = educatorSearchQuery.trim().toLowerCase();
                            const allMatches = [...educators]
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .filter(e => !q || e.name.toLowerCase().split(/\s+/).some(part => part.includes(q)));
                            const proposedMatch = proposedCetName
                              ? allMatches.find(e => e.name.trim().toLowerCase() === proposedCetName.toLowerCase())
                              : null;
                            const restMatches = proposedMatch ? allMatches.filter(e => e.id !== proposedMatch.id) : allMatches;
                            const orderedMatches = proposedMatch ? [proposedMatch, ...restMatches] : restMatches;
                            return (
                              <>
                                {orderedMatches.length === 0 ? (
                                  <p className="px-3 py-2.5 text-sm text-slate-400">No CETs match "{educatorSearchQuery}".</p>
                                ) : (
                                  orderedMatches.map(e => (
                                    <button key={e.id} onMouseDown={() => { setEducatorId(e.id); setEducatorSearchQuery(e.name); setEducatorDropdownOpen(false); }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0">
                                      <span className="font-medium text-slate-800">{e.name}</span>
                                    </button>
                                  ))
                                )}
                                {proposedCetName && !proposedMatch && (
                                  <button onMouseDown={() => { setEducatorId("__new__"); setNewEducatorName(proposedCetName); setEducatorDropdownOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100">
                                    + Add {proposedCetName}
                                  </button>
                                )}
                                <button onMouseDown={() => { setEducatorId("__new__"); setEducatorDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100">
                                  + Add a new tutor
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <input value={newEducatorName} onChange={e => setNewEducatorName(e.target.value)} placeholder="Name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Session type</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleSessionType("formal")}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${sessionType === "formal" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                  <p className="text-sm font-semibold text-slate-800">Formal course session</p>
                  <p className="text-xs text-slate-400">Part of a formal qualification / course assessment</p>
                </button>
                <button onClick={() => handleSessionType("informal")}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${sessionType === "informal" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                  <p className="text-sm font-semibold text-slate-800">Informal club session</p>
                  <p className="text-xs text-slate-400">A regular session observed at the coach's club</p>
                </button>
              </div>
            </div>

            {sessionType === "formal" && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Course / qualification name</label>
                <select value={formalCourseOption} onChange={e => handleFormalCourseOptionChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">Select from Course Library...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  <option value="__other__">Other (type your own)</option>
                </select>
                {formalCourseOption === "__other__" && (
                  <input value={formalCourseName} onChange={e => setFormalCourseName(e.target.value)} placeholder="Custom qualification / course name"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-2" />
                )}
                {(isCDiploma(formalCourseName) || isBDiploma(formalCourseName)) && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Course Number</label>
                    <input value={courseNumber} onChange={e => setCourseNumber(e.target.value)}
                      placeholder={isCDiploma(formalCourseName) ? "e.g. 165" : "e.g. 240"}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    {courseNumber.trim() && (
                      <p className="text-xs text-slate-400 mt-1">
                        {(() => {
                          const candidateName = usingNewCoach ? (newCoachName.trim() || "this coach") : (selectedCoach?.name || "this coach");
                          const sn = usingNewCoach || !coachId
                            ? 1
                            : computeSessionNumber(observations, coachId, courseNumber, existingObservation ? existingObservation.id : "__preview__", date);
                          return `This will be recorded as Session ${sn} for ${candidateName} on Course #${courseNumber.trim()}.`;
                        })()}
                      </p>
                    )}
                  </div>
                )}
                {threshold !== null && (
                  <p className="text-xs text-slate-400 mt-1.5">Minimum passing score for this qualification: {threshold}/{MAX_TOTAL_SCORE}</p>
                )}
              </div>
            )}

            {sessionType === "formal" && (isBDiploma(formalCourseName) || isADiploma(formalCourseName)) && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Diploma Block <span className="text-red-500">*</span>
                </label>
                <select value={diplomaBlock} onChange={e => setDiplomaBlock(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">Select block...</option>
                  {(isADiploma(formalCourseName) ? DIPLOMA_BLOCK_OPTIONS_A : DIPLOMA_BLOCK_OPTIONS_B).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {!diplomaBlock && (
                  <p className="text-xs text-red-500 mt-1">Required for B/A Diploma courses.</p>
                )}
                {isBDiploma(formalCourseName) && diplomaBlock && matchedCompletedTask && (
                  <p className="text-xs text-slate-400 mt-1">Auto-filled from attendance on file — change it above if needed.</p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Age group / context {sessionType === "informal" && <span className="text-red-500">*</span>}
              </label>
              <select value={(sessionType === "formal" ? FORMAL_CONTEXT_OPTIONS : AGE_GROUP_OPTIONS).includes(ageGroup) ? ageGroup : ""} onChange={e => setAgeGroup(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                <option value="">{sessionType === "formal" ? "Select players or coaches..." : "Select age group..."}</option>
                {(sessionType === "formal" ? FORMAL_CONTEXT_OPTIONS : AGE_GROUP_OPTIONS).map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {sessionType === "informal" && !ageGroup.trim() && (
                <p className="text-xs text-red-500 mt-1">Required for informal club sessions.</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-500 block">Key Outcomes Focus (from IDP)</label>
                {selectedCoach && !usingNewCoach && (
                  <button type="button" onClick={() => showIdpEditor ? closeIdpEditor() : openIdpEditor()} className="text-xs font-semibold text-sky-700 hover:text-sky-800">
                    {showIdpEditor ? "Close" : idpHasContent(selectedCoach?.idp) ? "Edit IDP" : "Upload IDP"}
                  </button>
                )}
              </div>
              {idpHasContent(selectedCoach?.idp) && !showIdpEditor && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-sky-800">Linked from {selectedCoach.name}'s IDP</p>
                    {selectedCoach.idp.goalsPlan && (
                      <button onClick={pullGoalsPlanFromIdp} className="text-xs font-semibold text-sky-700 hover:text-sky-800">Use Goals/Plan →</button>
                    )}
                  </div>
                  {selectedCoach.idp.goalsPlan && <p className="text-xs text-slate-600 whitespace-pre-wrap mb-1"><strong>Goals/Plan:</strong> {selectedCoach.idp.goalsPlan}</p>}
                  {selectedCoach.idp.performanceGap && <p className="text-xs text-slate-600 whitespace-pre-wrap mb-1"><strong>Performance Gap:</strong> {selectedCoach.idp.performanceGap}</p>}
                  {selectedCoach.idp.strengths && <p className="text-xs text-slate-600 whitespace-pre-wrap"><strong>Strengths:</strong> {selectedCoach.idp.strengths}</p>}
                  {!selectedCoach.idp.goalsPlan && !selectedCoach.idp.performanceGap && !selectedCoach.idp.strengths && selectedCoach.idp.fileText && (
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{selectedCoach.idp.fileText.slice(0, 300)}{selectedCoach.idp.fileText.length > 300 ? "…" : ""}</p>
                  )}
                  {selectedCoach.idp.goalsPlan && (
                    <p className="text-xs text-sky-600 mt-1.5 italic">Goals/Plan auto-fills the field below whenever it's empty.</p>
                  )}
                </div>
              )}
              {showIdpEditor && selectedCoach && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 mb-2 space-y-3">
                  <p className="text-xs font-semibold text-sky-800">Individual Development Plan — {selectedCoach.name}</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input value={idpForm.yearsCoaching} onChange={e => setIdpField("yearsCoaching", e.target.value)} placeholder="Years Coaching"
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                    <input value={idpForm.qualifications} onChange={e => setIdpField("qualifications", e.target.value)} placeholder="Qualifications"
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                    <input value={idpForm.mentor} onChange={e => setIdpField("mentor", e.target.value)} placeholder="Mentor"
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-sky-800 mb-1 block">Strengths</label>
                    <textarea value={idpForm.strengths} onChange={e => setIdpField("strengths", e.target.value)} rows={2}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-sky-800 mb-1 block">Performance Gap</label>
                    <textarea value={idpForm.performanceGap} onChange={e => setIdpField("performanceGap", e.target.value)} rows={2}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-sky-800 mb-1 block">Goals / Plan (planned outcomes — links to Key Outcomes Focus)</label>
                    <textarea value={idpForm.goalsPlan} onChange={e => setIdpField("goalsPlan", e.target.value)} rows={3}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-sky-800 mb-1 block">Upload IDP document (.docx, optional)</label>
                    {idpForm.fileName ? (
                      <div className="flex items-center justify-between border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
                        <span className="text-xs text-slate-600 truncate">{idpForm.fileName}</span>
                        <button onClick={removeIdpFile} className="text-xs font-semibold text-red-600 hover:text-red-700 shrink-0 ml-2">Remove</button>
                      </div>
                    ) : (
                      <input type="file" accept=".docx" onChange={handleIdpFile}
                        className="block w-full text-xs text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs" />
                    )}
                    {idpParsing && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Reading document...</p>}
                    {idpError && <p className="text-xs text-red-600 mt-1">{idpError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveIdpFromObservation} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Save IDP</button>
                    <button onClick={closeIdpEditor} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500">Cancel</button>
                  </div>
                </div>
              )}
              <VoiceTextarea value={keyOutcomesFocus} onChange={e => setKeyOutcomesFocus(e.target.value)} rows={3}
                placeholder="Note the key outcomes from the coach's Individual Development Plan this session is focused on..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Capture the key planning details for this session.</p>

            {isCDiploma(formalCourseName) ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Session Topic <span className="text-red-500">*</span></label>
                  <select value={sessionTopic} onChange={e => setSessionTopic(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                    <option value="">Select...</option>
                    {orderedCDipTopics(matchedCompletedTask?.team).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {!sessionTopic.trim() && (
                    <p className="text-xs text-red-500 mt-1">Required.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Coaching Activity</label>
                  <select value={coachingActivity} onChange={e => setCoachingActivity(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                    <option value="">Select...</option>
                    {COACHING_ACTIVITY_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Session Topic <span className="text-red-500">*</span></label>
                <select value={sessionTopicOption} onChange={e => handleSessionTopicOptionChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">
                    {selectedCoach?.topics?.length ? `Select a topic for ${selectedCoach.name}...` : "Select a topic..."}
                  </option>
                  {(selectedCoach?.topics || []).map(t => (
                    <option key={t} value={t}>{isTopicSuggestedByGap(t, selectedCoach?.idp?.performanceGap) ? `★ ${t}` : t}</option>
                  ))}
                  <option value="__other__">Other (type your own)</option>
                </select>
                {sessionTopicOption === "__other__" && (
                  <input value={sessionTopic} onChange={e => setSessionTopic(e.target.value)} placeholder="Custom session topic"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-2" />
                )}
                {!sessionTopic.trim() && (
                  <p className="text-xs text-red-500 mt-1">Required.</p>
                )}
                {(!selectedCoach || !(selectedCoach.topics && selectedCoach.topics.length)) && (
                  <p className="text-xs text-slate-400 mt-1">No topics on file for this coach — add them via Coaches &amp; CETs (Add Coach or Bulk Upload → Topics column), or select Other.</p>
                )}
                {(() => {
                  const suggested = (selectedCoach?.topics || []).filter(t => isTopicSuggestedByGap(t, selectedCoach?.idp?.performanceGap));
                  return suggested.length > 0 ? (
                    <p className="text-xs text-amber-600 mt-1">★ Suggested from {selectedCoach.name}'s IDP Performance Gap: {suggested.join(", ")}</p>
                  ) : null;
                })()}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Session Objective <span className="text-red-500">*</span>
              </label>
              <VoiceTextarea value={sessionPlan.sessionObjective} onChange={e => setSessionPlanField("sessionObjective", e.target.value)} rows={2}
                placeholder="What is the clear, measurable objective of this session?"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
              {!sessionPlan.sessionObjective.trim() && (
                <p className="text-xs text-red-500 mt-1">Required.</p>
              )}
            </div>

            {SESSION_PLAN_FIELDS.map(f => (
              <div key={f.key}>
                {f.key === "sizeOfPitch" ? (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Size of Pitch {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="border border-slate-300 rounded-lg px-3 py-2 flex items-center gap-3 bg-white">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-0.5">Length</p>
                        <input ref={pitchLengthRef} value={sessionPlan.pitchLength}
                          onChange={e => {
                            const clean = sanitizeAlphanumeric(e.target.value);
                            setSessionPlanField("pitchLength", clean);
                            if (clean.replace(/\D/g, "").length >= 2) pitchWidthRef.current && pitchWidthRef.current.focus();
                          }}
                          placeholder="e.g. 40m" className="w-full text-sm outline-none" />
                      </div>
                      <span className="text-slate-400 font-semibold">x</span>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-0.5">Width</p>
                        <input ref={pitchWidthRef} value={sessionPlan.pitchWidth}
                          onChange={e => {
                            const clean = sanitizeAlphanumeric(e.target.value);
                            setSessionPlanField("pitchWidth", clean);
                            if (clean.replace(/\D/g, "").length >= 2) pitchLengthRef.current && pitchLengthRef.current.focus();
                          }}
                          placeholder="e.g. 30m" className="w-full text-sm outline-none" />
                      </div>
                    </div>
                    {f.required && (!sessionPlan.pitchLength.trim() || !sessionPlan.pitchWidth.trim()) && (
                      <p className="text-xs text-red-500 mt-1">Required.</p>
                    )}
                  </div>
                ) : f.key === "numberOfPlayers" ? (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input value={sessionPlan.numberOfPlayers} onChange={e => setSessionPlanField("numberOfPlayers", e.target.value)}
                      placeholder="e.g. 16 or 8v8" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
                    {f.required && !sessionPlan.numberOfPlayers.trim() && (
                      <p className="text-xs text-red-500 mt-1">Required.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <VoiceTextarea value={sessionPlan[f.key]} onChange={e => setSessionPlanField(f.key, e.target.value)} rows={2}
                      placeholder={`Notes on ${f.label.toLowerCase()}...`} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
                    {f.required && !sessionPlan[f.key].trim() && (
                      <p className="text-xs text-red-500 mt-1">Required.</p>
                    )}
                  </div>
                )}
                {f.key === "sizeOfPitch" && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-800 mb-1.5">Type of Session <span className="text-red-500">*</span></p>
                    <div className="relative">
                      <button onClick={() => setTypeOfSessionOpen(o => !o)} type="button"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white flex items-center justify-between text-left">
                        <span className={sessionPlan.typeOfSession.length ? "text-slate-800" : "text-slate-400"}>
                          {sessionPlan.typeOfSession.length ? sessionPlan.typeOfSession.join(", ") : "Select type(s) of session..."}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${typeOfSessionOpen ? "rotate-90" : ""}`} />
                      </button>
                      {typeOfSessionOpen && (
                        <div className="border border-slate-200 rounded-lg mt-1 p-2 bg-white shadow-sm">
                          {TYPE_OF_SESSION_OPTIONS.map(opt => (
                            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                              <input type="checkbox" checked={sessionPlan.typeOfSession.includes(opt)} onChange={() => toggleTypeOfSession(opt)}
                                className="rounded border-slate-300" />
                              <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                          ))}
                          <button onClick={() => setTypeOfSessionOpen(false)} type="button" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1 px-2">Done</button>
                        </div>
                      )}
                    </div>
                    {sessionPlan.typeOfSession.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Required — select at least one type of session.</p>
                    )}

                    {sessionPlan.typeOfSession.includes("Progressive (PP/PG/GT/TG)") && (
                      <div className="mt-3 pl-3 border-l-2 border-slate-200">
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Progressive type</p>
                        <div className="flex gap-2 flex-wrap">
                          {PROGRESSIVE_SUBOPTIONS.map(opt => (
                            <button key={opt} onClick={() => toggleProgressiveType(opt)} type="button"
                              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                                sessionPlan.progressiveType.includes(opt) ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                              }`}>
                              <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${
                                sessionPlan.progressiveType.includes(opt) ? "bg-slate-900 border-slate-900" : "border-slate-300 bg-white"
                              }`}>
                                {sessionPlan.progressiveType.includes(opt) && <Check className="w-3 h-3 text-white" />}
                              </span>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {sessionPlan.typeOfSession.includes("Play / Practice / Play (PPP)") && (
                      <div className="mt-3 pl-3 border-l-2 border-slate-200">
                        <p className="text-xs font-medium text-slate-500 mb-1.5">PPP type</p>
                        <div className="flex gap-2 flex-wrap">
                          {PPP_SUBOPTIONS.map(opt => (
                            <button key={opt} onClick={() => togglePppType(opt)} type="button"
                              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                                sessionPlan.pppType.includes(opt) ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                              }`}>
                              <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${
                                sessionPlan.pppType.includes(opt) ? "bg-slate-900 border-slate-900" : "border-slate-300 bg-white"
                              }`}>
                                {sessionPlan.pppType.includes(opt) && <Check className="w-3 h-3 text-white" />}
                              </span>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1.5">Pitch Geography</p>
              <p className="text-xs text-slate-400 mb-2">D3 / M3 / F3 are calculated automatically from the zones you select below.</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {["D3", "M3", "F3"].map(opt => (
                  <span key={opt}
                    className={`text-sm font-medium px-3 py-1.5 rounded-full border ${
                      sessionPlan.pitchGeography.includes(opt) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200"
                    }`}>
                    {opt}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-slate-500">Tap a zone on the pitch to mark it as used</p>
                <button onClick={selectFullPitch} type="button"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    sessionPlan.zonesUsed.length === 18 ? "bg-emerald-600 text-white border-emerald-600" : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  }`}>
                  {sessionPlan.zonesUsed.length === 18 ? "Clear Full Pitch" : "Full Pitch"}
                </button>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <PitchZoneDiagram selectedZones={sessionPlan.zonesUsed} onToggleZone={toggleZoneUsed} />
              </div>
              {sessionPlan.zonesUsed.length > 0 && (
                <p className="text-xs text-slate-400 mt-1.5">Selected zones: {sessionPlan.zonesUsed.join(", ")}</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm font-semibold text-indigo-800 mb-1">SOCHANGEIT Evidence Checklist</p>
              <p className="text-xs text-indigo-600 mb-3">Tick any elements observed as evidence of turning around a faltering session. These do not count toward the assessment score.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SOCHANGEIT_ITEMS.map(item => (
                  <button key={item.key} onClick={() => toggleSochangeit(item.key)}
                    className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg border transition-colors ${
                      sochangeit[item.key] ? "border-indigo-300 bg-white" : "border-indigo-100 bg-white/50"
                    }`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${
                      sochangeit[item.key] ? "bg-indigo-600 border-indigo-600" : "border-indigo-300 bg-white"
                    }`}>
                      {sochangeit[item.key] && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sticky top-0 bg-white pb-2 z-10">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> Assessment Scoring</p>
                <p className="text-sm font-bold text-slate-900">{runningTotal} / {MAX_TOTAL_SCORE}</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 transition-all" style={{ width: `${Math.min(100, (runningTotal / MAX_TOTAL_SCORE) * 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">Score each of the 6 areas 0–3. Maximum possible is {MAX_TOTAL_SCORE} points.</p>
            </div>

            {ASSESSMENT_AREAS.map(a => {
              const currentScore = areas[a.key].score;
              return (
                <div key={a.key} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-400 mb-2">{a.desc}</p>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {SCORE_LEVELS.map(l => (
                      <button key={l.value} onClick={() => setArea(a.key, "score", l.value)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          currentScore === l.value ? l.color : "bg-white text-slate-400 border-slate-200"
                        }`}>
                        {l.value} · {l.label}
                      </button>
                    ))}
                  </div>
                  {typeof currentScore === "number" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-2">
                      <p className="text-xs text-slate-500">{a.descriptors[currentScore]}</p>
                    </div>
                  )}
                  <textarea value={areas[a.key].notes} onChange={ev => setArea(a.key, "notes", ev.target.value)}
                    placeholder={`Evidence for ${a.label.toLowerCase()} observed in this session...`}
                    className={`w-full border rounded-lg px-3 py-2 text-sm bg-white ${
                      typeof currentScore === "number" && currentScore <= 1 && !areas[a.key].notes.trim() ? "border-red-300" : "border-slate-200"
                    }`} rows={2} />
                  {typeof currentScore === "number" && currentScore <= 1 && !areas[a.key].notes.trim() && (
                    <p className="text-xs text-red-500 mt-1">Required — please add evidence/comments for this score before continuing.</p>
                  )}
                </div>
              );
            })}

            <div className="h-28" />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Key strengths observed</label>
              <VoiceTextarea value={strengths} onChange={e => setStrengths(e.target.value)} rows={4}
                placeholder="What did the coach do well in this session?" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Areas for development</label>
              <VoiceTextarea value={areasForDevelopment} onChange={e => setAreasForDevelopment(e.target.value)} rows={4}
                placeholder="What should the coach focus on improving?" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Additional plan notes for the coach <span className="text-red-500">*</span></label>
              <VoiceTextarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={3}
                placeholder="Add any specific actions, timelines, or goals for this coach's development..." className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
              {!planNotes.trim() && (
                <p className="text-xs text-red-500 mt-1">Required — please add at least a brief note before saving.</p>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-500 block">Coach's Action Plan</label>
                <button onClick={suggestActions} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Suggest Actions</button>
              </div>
              <p className="text-xs text-slate-400 mb-2">Auto-suggested from the assessment scoring, areas for development, and plan notes — edit freely.</p>
              <div className="space-y-2">
                {[0, 1, 2].map(idx => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-slate-400 w-5 pt-2">{idx + 1}.</span>
                    <textarea
                      ref={el => actionTextareaRefs.current[idx] = el}
                      value={actionPlan[idx]} onChange={e => setActionItem(idx, e.target.value)} rows={1}
                      placeholder={`Action ${idx + 1}`} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none overflow-hidden" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {(sessionType === "formal" && threshold !== null) && (
                <div className={`rounded-lg border p-3 ${runningTotal >= threshold ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                  <p className="text-xs text-slate-500">Score vs. {formalCourseName} threshold</p>
                  <p className={`text-sm font-bold ${runningTotal >= threshold ? "text-emerald-700" : "text-red-700"}`}>
                    {runningTotal}/{MAX_TOTAL_SCORE} (min. {threshold} required)
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  {sessionType === "informal" ? "Assessment Outcome (Indicative)" : "Assessment Outcome"}
                </label>
                <select value={assessmentOutcome} onChange={e => { setAssessmentOutcome(e.target.value); setOutcomeManuallySet(true); }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">Not set</option>
                  <option value="Highly Competent">Highly Competent</option>
                  <option value="Competent">Competent</option>
                  <option value="Not Yet Competent">Not Yet Competent</option>
                  <option value="N/A">N/A</option>
                </select>
                {outcomeManuallySet ? (
                  <p className="text-xs text-amber-600 mt-1">
                    Manually set — score-based suggestion is {suggestedOutcome}.{" "}
                    <button type="button" onClick={() => setOutcomeManuallySet(false)} className="underline font-medium">Sync with score</button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Automatically follows the assessment score: {suggestedOutcome}</p>
                )}
                {sessionType === "informal" && (
                  <p className="text-xs text-slate-400 mt-1">
                    Indicative only — calculated using the same scoring system as formal courses (6 assessment areas, scored 0–3 each, {MAX_TOTAL_SCORE} points max). This is not a formal qualification outcome.
                  </p>
                )}
              </div>
            </div>

            {isHighlyCompetent && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm font-semibold text-violet-800 mb-1">Potential Future Pathways</p>
                <p className="text-xs text-violet-600 mb-3">
                  This coach is tracking as Highly Competent ({runningTotal}/{MAX_TOTAL_SCORE}). Flag any pathways worth exploring with them — only shown for Highly Competent outcomes.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {POTENTIAL_PATHWAY_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => togglePathway(opt)}
                      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        potentialPathways.includes(opt) ? "border-violet-600 bg-violet-100 text-violet-800" : "border-violet-200 bg-white text-violet-500"
                      }`}>
                      <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${
                        potentialPathways.includes(opt) ? "bg-violet-600 border-violet-600" : "border-violet-300 bg-white"
                      }`}>
                        {potentialPathways.includes(opt) && <Check className="w-3 h-3 text-white" />}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Assessor Signature</label>
              <input value={assessorSignature} onChange={e => setAssessorSignature(e.target.value)}
                placeholder="Type your name to sign off this report" style={{ fontFamily: "cursive" }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base" />
              {isCetRole && <p className="text-xs text-slate-400 mt-1">Auto-filled from the selected CET — edit if needed.</p>}
              {isTdRole && (
                <p className="text-xs text-slate-400 mt-1">Auto-filled from the Technical Director's name entered in Session Details — edit if needed.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 disabled:opacity-0">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveAndReturn} disabled={!canSaveDraft()} title={!canSaveDraft() ? "Select or add a coach first to save a draft" : undefined}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400">
            <Clock className="w-4 h-4" /> Save & Return
          </button>
          {step < 4 ? (
            <button onClick={handleNext}
              disabled={(step === 0 && !canProceedStep0()) || (step === 1 && !canProceedSessionPlan()) || (step === 2 && !canProceedStep1()) || (step === 3 && !canProceedStep3())}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:bg-slate-300">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSaveAndSubmit} disabled={!canSave()}
              title={!canSave() ? "Add a note under 'Additional plan notes for the coach' on the Feedback step first" : undefined}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:bg-slate-300 disabled:hover:bg-slate-300">
              <Check className="w-4 h-4" /> Save & Submit
            </button>
          )}
        </div>
      </div>

      {step === 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-300 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 mb-1">General Notes</p>
            <p className="text-xs text-slate-400 mb-2">Always visible while scoring — use this for anything that doesn't fit neatly under one assessment area.</p>
            <VoiceTextarea value={cetNotes} onChange={e => setCetNotes(e.target.value)} rows={2}
              placeholder="Add any general notes here..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone single-observation HTML report, used by the "Download PDF"
// button on ReportView. Styled to mirror the on-screen report (same score
// colours, card layout, badges) and sized for A4 printing/PDF export via
// window.print(), rather than the plain data-dump table this started as.
function buildSingleObservationHtml(obs) {
  const esc = (s) => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const total = totalForObs(obs);
  const actionItems = (obs.actionPlan || []).filter(a => a && a.trim());
  const pitchMap = obs.sessionPlan?.zonesUsed?.length > 0
    ? `<div class="section"><p class="section-title">Pitch Zones Used</p>${buildPitchZoneSvg(obs.sessionPlan.zonesUsed)}</div>`
    : "";
  const showPathways = obs.assessmentOutcome === "Highly Competent" && obs.potentialPathways && obs.potentialPathways.length > 0;
  const outcomeClass = obs.assessmentOutcome === "Highly Competent" ? "outcome-highly"
    : obs.assessmentOutcome === "Competent" ? "outcome-competent"
    : obs.assessmentOutcome === "Not Yet Competent" ? "outcome-notyet" : "outcome-neutral";
  const thresholdPass = obs.diplomaThreshold != null && total >= obs.diplomaThreshold;
  const logoUrl = memberFederationLogo(obs.memberFederation);

  const sessionPlanFieldCards = obs.sessionPlan ? SESSION_PLAN_FIELDS.filter(f => {
    if (f.key === "sizeOfPitch") return !!(obs.sessionPlan.pitchLength || obs.sessionPlan.pitchWidth);
    return (obs.sessionPlan[f.key] || "").toString().trim().length > 0;
  }).map(f => {
    const value = f.key === "sizeOfPitch"
      ? (obs.sessionPlan.pitchLength || obs.sessionPlan.pitchWidth ? `${esc(obs.sessionPlan.pitchLength) || "—"} x ${esc(obs.sessionPlan.pitchWidth) || "—"}` : "—")
      : esc(obs.sessionPlan[f.key]) || "—";
    return `<div class="plan-field-card"><p class="plan-field-label">${esc(f.label)}</p><p class="plan-field-value">${value}</p></div>`;
  }).join("") : "";
  const typeOfSessionCard = obs.sessionPlan?.typeOfSession?.length > 0
    ? `<div class="plan-field-card" style="grid-column: span 2;">
        <p class="plan-field-label">Type of Session</p>
        <div>${obs.sessionPlan.typeOfSession.map(t => `<span class="chip-slate">${esc(t)}</span>`).join("")}</div>
        ${obs.sessionPlan.progressiveType?.length > 0 ? `<p class="plan-field-sub">Progressive type: ${esc(obs.sessionPlan.progressiveType.join(", "))}</p>` : ""}
        ${obs.sessionPlan.pppType?.length > 0 ? `<p class="plan-field-sub">PPP type: ${esc(obs.sessionPlan.pppType.join(", "))}</p>` : ""}
      </div>`
    : "";
  const sessionObjectiveCard = obs.sessionPlan?.sessionObjective
    ? `<div class="info-box"><p class="info-box-label">Session Objective</p>${esc(obs.sessionPlan.sessionObjective)}</div>`
    : "";
  const sessionPlanSection = (sessionObjectiveCard || sessionPlanFieldCards || typeOfSessionCard || pitchMap)
    ? `<div class="section">
        <p class="section-title">Session Plan</p>
        ${sessionObjectiveCard}
        <div class="plan-fields-grid">${sessionPlanFieldCards}${typeOfSessionCard}</div>
        ${pitchMap}
      </div>`
    : "";

  const areaCards = obs.areas ? ASSESSMENT_AREAS.map(a => {
    const d = obs.areas[a.key] || {};
    const lvl = SCORE_LEVELS.find(l => l.value === d.score);
    const badgeClass = typeof d.score === "number" ? `badge-${d.score}` : "badge-none";
    return `
      <div class="area-card">
        <div class="area-head">
          <span class="area-name">${esc(a.label)}</span>
          ${lvl ? `<span class="badge ${badgeClass}">${lvl.value} · ${esc(lvl.label)}</span>` : `<span class="badge badge-none">—</span>`}
        </div>
        <p class="area-desc">${esc(a.desc)}</p>
        ${typeof d.score === "number" ? `<p class="area-descriptor">${esc(a.descriptors[d.score])}</p>` : ""}
        <p class="area-notes">${esc(d.notes) || "No evidence recorded."}</p>
      </div>`;
  }).join("") : "";

  return `<html>
    <head>
      <title>${esc(obs.coachName)} - Coaching Observation Report</title>
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1e293b; background: #f8fafc; }
        .page { max-width: 800px; margin: 0 auto; padding: 28px; }
        .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 18px; }
        .header-icon { width: 44px; height: 44px; border-radius: 9px; background: #fff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
        .header-icon img { max-width: 100%; max-height: 100%; object-fit: contain; }
        h1 { margin: 0; font-size: 21px; }
        .subtitle { color: #64748b; font-size: 13px; margin: 2px 0 0; }
        .type-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; background: #eef2ff; color: #4338ca; white-space: nowrap; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 18px 0; }
        .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #4f46e5; margin: 0 0 2px; }
        .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; }
        .section { margin: 20px 0; }
        .section-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 10px; display: flex; align-items: center; justify-content: space-between; }
        .score-total { font-size: 14px; font-weight: 700; }
        .info-box { border-radius: 10px; border: 1px solid #e0e7ff; background: #eef2ff; padding: 12px; font-size: 13px; margin-bottom: 12px; }
        .info-box-label { font-size: 11px; font-weight: 700; color: #4338ca; margin: 0 0 4px; }
        .plan-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .plan-field-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; break-inside: avoid; }
        .plan-field-label { font-size: 10.5px; font-weight: 700; color: #64748b; margin: 0 0 3px; }
        .plan-field-value { font-size: 12.5px; color: #1e293b; margin: 0; white-space: pre-wrap; }
        .plan-field-sub { font-size: 11px; color: #64748b; margin: 4px 0 0; }
        .chip-slate { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: #e2e8f0; color: #334155; margin: 0 6px 4px 0; }
        .action-plan-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #fff; }
        .areas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .area-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fff; break-inside: avoid; }
        .area-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
        .area-name { font-weight: 700; font-size: 13px; }
        .area-desc { font-size: 10.5px; color: #94a3b8; margin: 0 0 6px; }
        .area-descriptor { font-style: italic; font-size: 11px; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 6px 8px; margin: 0 0 6px; }
        .area-notes { font-size: 12px; color: #475569; margin: 0; }
        .badge { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
        .badge-0 { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
        .badge-1 { background: #ffedd5; color: #c2410c; border-color: #fed7aa; }
        .badge-2 { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
        .badge-3 { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
        .badge-none { background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .box { border-radius: 10px; padding: 12px; font-size: 12.5px; }
        .box-green { background: #ecfdf5; }
        .box-amber { background: #fffbeb; }
        .box-slate { background: #f8fafc; border: 1px solid #e2e8f0; }
        .box-title { font-size: 13px; font-weight: 700; margin: 0 0 6px; }
        .final-score-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .final-score-box { border-radius: 10px; padding: 12px; }
        .final-score-pass { background: #ecfdf5; border: 1px solid #bbf7d0; }
        .final-score-fail { background: #fef2f2; border: 1px solid #fecaca; }
        .final-score-label { font-size: 11px; color: #64748b; margin: 0 0 2px; }
        .final-score-value { font-size: 17px; font-weight: 800; margin: 0; }
        .final-score-value.pass { color: #15803d; }
        .final-score-value.fail { color: #b91c1c; }
        .outcome-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between; }
        .outcome-badge { font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 999px; }
        .outcome-highly { background: #ede9fe; color: #6d28d9; }
        .outcome-competent { background: #dcfce7; color: #15803d; }
        .outcome-notyet { background: #fee2e2; color: #b91c1c; }
        .outcome-neutral { background: #f1f5f9; color: #64748b; }
        .pathway-box { border-radius: 10px; padding: 14px; background: #f5f3ff; border: 1px solid #ddd6fe; margin: 16px 0; }
        .pathway-title { font-size: 13px; font-weight: 700; color: #6d28d9; margin: 0 0 8px; }
        .pathway-chip { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 4px 12px; border-radius: 999px; background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; margin: 0 6px 6px 0; }
        ol.action-plan { margin: 0; padding-left: 18px; font-size: 12.5px; }
        ol.action-plan li { margin-bottom: 6px; }
        .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 20px; }
        .signature-label { font-size: 11px; color: #94a3b8; margin: 0 0 2px; }
        .signature-name { font-size: 13px; font-weight: 600; margin: 0; }
        .signature-script { font-family: "Brush Script MT", cursive; font-size: 22px; margin: 0; }
        .footer-note { text-align: center; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; }
        @media print { body { background: #fff; } .page { padding: 0; max-width: none; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-icon"><img src="${logoUrl}" alt="${esc((MEMBER_FEDERATIONS.find(m => m.key === obs.memberFederation) || {}).label || "Football Victoria")} logo" /></div>
          <div>
            <h1>Coaching Observation Report</h1>
            <p class="subtitle">${esc(obs.coachName) || "—"}</p>
          </div>
          <span class="type-badge">${obs.sessionType === "formal" ? `Formal · ${esc(obs.formalCourseName)}${obs.courseNumber ? ` (#${esc(obs.courseNumber)})` : ""}${obs.diplomaBlock ? " · " + esc(obs.diplomaBlock) : ""}` : "Informal Club Session"}</span>
        </div>

        <div class="meta-grid">
          <div><p class="meta-label">Coach</p><p class="meta-value">${esc(obs.coachName) || "—"}</p></div>
          <div><p class="meta-label">${esc(obs.educatorRole) || "Coach Education Tutor (CET)"}</p><p class="meta-value">${esc(obs.coachEducatorName) || "—"}</p></div>
          <div><p class="meta-label">Date</p><p class="meta-value">${obs.date ? new Date(obs.date).toLocaleDateString("en-GB") : "—"}</p></div>
        </div>
        ${obs.ageGroup ? `<p style="font-size:12.5px;color:#64748b;margin-top:-8px;">Context: ${esc(obs.ageGroup)}</p>` : ""}
        ${obs.sessionTopic ? `<p style="font-size:12.5px;color:#64748b;">Session Topic: <strong>${esc(obs.sessionTopic)}</strong></p>` : ""}

        ${obs.keyOutcomesFocus ? `<div class="info-box"><p class="info-box-label">Key Outcomes Focus (from IDP)</p>${esc(obs.keyOutcomesFocus).replace(/\n/g, "<br/>")}</div>` : ""}

        ${sessionPlanSection}

        ${areaCards ? `
        <div class="section">
          <p class="section-title"><span>Assessment Scoring</span><span class="score-total">${total ?? "—"} / ${MAX_TOTAL_SCORE}</span></p>
          <div class="areas-grid">${areaCards}</div>
        </div>` : ""}

        <div class="two-col">
          <div class="box box-green">
            <p class="box-title">Strengths</p>
            <p style="margin:0;">${esc(obs.strengths) || "—"}</p>
          </div>
          <div class="box box-amber">
            <p class="box-title">Areas for Development</p>
            <p style="margin:0;">${esc(obs.areas_feedback) || "—"}</p>
          </div>
        </div>

        ${(obs.diplomaThreshold != null || obs.assessmentOutcome) ? `
        <div class="final-score-row">
          ${obs.diplomaThreshold != null ? `
          <div class="final-score-box ${thresholdPass ? "final-score-pass" : "final-score-fail"}">
            <p class="final-score-label">Final Score vs. ${esc(obs.formalCourseName)} threshold</p>
            <p class="final-score-value ${thresholdPass ? "pass" : "fail"}">${total}/${MAX_TOTAL_SCORE} <span style="font-size:11px;font-weight:400;color:#94a3b8;">(min. ${obs.diplomaThreshold} required)</span></p>
          </div>` : "<div></div>"}
          ${obs.assessmentOutcome ? `
          <div class="outcome-box">
            <p style="font-size:11px;color:#64748b;margin:0;">${obs.sessionType === "informal" ? "Assessment Outcome (Indicative)" : "Assessment Outcome"}</p>
            <span class="outcome-badge ${outcomeClass}">${esc(obs.assessmentOutcome)}</span>
          </div>` : ""}
        </div>` : ""}

        ${showPathways ? `
        <div class="pathway-box">
          <p class="pathway-title">Potential Future Pathways</p>
          ${obs.potentialPathways.map(p => `<span class="pathway-chip">${esc(p)}</span>`).join("")}
        </div>` : ""}

        <div class="section">
          <p class="section-title">Development Plan</p>
          ${obs.planNotes ? `<div class="box box-slate" style="margin-bottom:10px;"><p class="box-title" style="font-size:12px;">Coach Educator's Notes</p><p style="margin:0;">${esc(obs.planNotes)}</p></div>` : ""}
          ${actionItems.length > 0 ? `
          <div class="action-plan-box">
            <p class="box-title" style="font-size:12px;">Coach's Action Plan</p>
            <ol class="action-plan">${actionItems.map(a => `<li>${esc(a)}</li>`).join("")}</ol>
          </div>` : ""}
          ${!obs.planNotes && actionItems.length === 0 ? `<p style="font-size:12.5px;color:#94a3b8;">No specific plan items recorded.</p>` : ""}
        </div>

        <div class="signature-row">
          <div>
            <p class="signature-label">${esc(obs.educatorRole) || "Coach Education Tutor (CET)"} Name</p>
            <p class="signature-name">${esc(obs.coachEducatorName) || "—"}</p>
          </div>
          <div>
            <p class="signature-label">Assessor Signature</p>
            <p class="signature-script">${esc(obs.assessorSignature) || "—"}</p>
          </div>
        </div>

        <div class="footer-note">
          CODA was created by Craig Moore. For additional information, suggested changes or any query contact craigianmoore@gmail.com
        </div>
      </div>
      <script>window.onload = function(){ window.print(); };</script>
    </body>
  </html>`;
}

function ReportView({ observations, reportId, coaches, onBack, onEditDraft, onSubmitDraft }) {
  const [showReopenAuth, setShowReopenAuth] = useState(false);
  const [reopenName, setReopenName] = useState("");
  const [reopenPin, setReopenPin] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [reopening, setReopening] = useState(false);
  const obs = observations.find(o => o.id === reportId);
  if (!obs) return <div className="text-slate-400 text-sm">Report not found.</div>;
  const total = totalForObs(obs);
  const areasForDevelopmentText = obs.areas_feedback ?? obs.areas_text ?? "";
  const outcomeColor = obs.assessmentOutcome === "Competent" ? "bg-emerald-100 text-emerald-700"
    : obs.assessmentOutcome === "Not Yet Competent" ? "bg-red-100 text-red-700"
    : "bg-slate-100 text-slate-500";
  const coach = coaches?.find(c => c.id === obs.coachId);
  const showOverseasLicenceNote = isOverseasLicence(coach?.level);
  const isDraft = obs.status === "draft";
  const obsSessionNumber = (obs.courseNumber && obs.coachId) ? computeSessionNumber(observations, obs.coachId, obs.courseNumber, obs.id, obs.date) : null;

  function handleDownloadPdf() {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups for this site to download a PDF.");
      return;
    }
    win.document.write(buildSingleObservationHtml(obs));
    win.document.close();
  }

  function resetReopenAuth() {
    setShowReopenAuth(false);
    setReopenName(""); setReopenPin(""); setReopenError(""); setReopening(false);
  }

  async function handleReopenSubmit() {
    setReopenError("");
    setReopening(true);
    try {
      const settingsRaw = await kvGet("adminSettings");
      const settings = migrateAdminSettings(settingsRaw);
      const lockouts = (await kvGet("adminLockouts")) || {};
      if (isLockedOut(lockouts, reopenName)) {
        setReopenError(`Too many incorrect attempts — locked for ${lockoutRemainingMinutes(lockouts, reopenName)} more minute${lockoutRemainingMinutes(lockouts, reopenName) === 1 ? "" : "s"}.`);
        setReopening(false);
        return;
      }
      const match = findAdminMatch(settings.admins, reopenName, reopenPin);
      const key = (reopenName || "").trim().toLowerCase();
      const current = lockouts[key] || { failCount: 0, lockedUntil: 0 };
      if (!match) {
        const failCount = current.failCount + 1;
        const nextEntry = failCount >= ADMIN_LOCKOUT_THRESHOLD ? { failCount: 0, lockedUntil: Date.now() + ADMIN_LOCKOUT_MS } : { failCount, lockedUntil: current.lockedUntil };
        await kvSet("adminLockouts", { ...lockouts, [key]: nextEntry });
        setReopenError("Incorrect admin name or PIN.");
        setReopening(false);
        return;
      }
      await kvSet("adminLockouts", { ...lockouts, [key]: { failCount: 0, lockedUntil: 0 } });
      resetReopenAuth();
      onEditDraft(obs);
    } catch (e) {
      setReopenError("Could not verify admin credentials. Try again.");
      setReopening(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50">
          <FileText className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {isDraft && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">This is a saved draft. It won't appear in History until submitted.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEditDraft(obs)} className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100">
              <Pencil className="w-3.5 h-3.5" /> Edit Observation
            </button>
            <button onClick={() => onSubmitDraft(obs.id)} className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
              <Check className="w-3.5 h-3.5" /> Submit to History
            </button>
          </div>
        </div>
      )}

      {!isDraft && onEditDraft && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          {!showReopenAuth ? (
            <button onClick={() => setShowReopenAuth(true)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800">
              <Pencil className="w-3.5 h-3.5" /> Reopen for Editing (Admin)
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">This report has already been submitted. Enter an admin name and PIN to reopen it for editing.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={reopenName} onChange={e => { setReopenName(e.target.value); setReopenError(""); }} placeholder="Admin name"
                  className={`border rounded-lg px-3 py-2 text-sm ${reopenError ? "border-red-400" : "border-slate-300"}`} />
                <input type="password" inputMode="numeric" maxLength={4} value={reopenPin}
                  onChange={e => { setReopenPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setReopenError(""); }} placeholder="Admin PIN"
                  className={`border rounded-lg px-3 py-2 text-sm text-center tracking-widest ${reopenError ? "border-red-400" : "border-slate-300"}`} />
              </div>
              {reopenError && <p className="text-xs text-red-600">{reopenError}</p>}
              <div className="flex items-center gap-2">
                <button onClick={handleReopenSubmit} disabled={reopening}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap disabled:opacity-50">
                  {reopening ? "Checking..." : "Reopen Report"}
                </button>
                <button onClick={resetReopenAuth} className="text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Coaching Observation Report</h2>
            <p className="text-sm text-slate-500">{obs.coachName}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${obs.sessionType === "formal" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
            {obs.sessionType === "formal" ? `Formal · ${obs.formalCourseName}${obs.courseNumber ? ` (#${obs.courseNumber})` : ""}${obs.diplomaBlock ? ` · ${obs.diplomaBlock}` : ""}` : "Informal Club Session"}
          </span>
        </div>

        {obsSessionNumber && (
          <p className="text-xs text-slate-400 -mt-3">Session {obsSessionNumber} for {obs.coachName} on Course #{obs.courseNumber}</p>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Coach</p><p className="font-medium text-slate-800">{obs.coachName}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">{obs.educatorRole || "Coach Education Tutor (CET)"}</p><p className="font-medium text-slate-800">{obs.coachEducatorName}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Date</p><p className="font-medium text-slate-800">{new Date(obs.date).toLocaleDateString("en-GB")}</p></div>
        </div>
        {obs.ageGroup && <p className="text-sm text-slate-500">Context: {obs.ageGroup}</p>}

        {obs.keyOutcomesFocus && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-1">Key Outcomes Focus (from IDP)</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{obs.keyOutcomesFocus}</p>
          </div>
        )}

        {obs.sessionPlan && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Session Plan</h3>
            {obs.sessionTopic && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Session Topic</p>
                <p className="text-sm text-slate-700">{obs.sessionTopic}</p>
              </div>
            )}
            {obs.sessionPlan.sessionObjective && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Session Objective</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{obs.sessionPlan.sessionObjective}</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {SESSION_PLAN_FIELDS.filter(f => {
                if (f.key === "sizeOfPitch") return !!(obs.sessionPlan.pitchLength || obs.sessionPlan.pitchWidth);
                return (obs.sessionPlan[f.key] || "").toString().trim().length > 0;
              }).map(f => (
                <div key={f.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">{f.label}</p>
                  {f.key === "sizeOfPitch" ? (
                    <p className="text-sm text-slate-700">
                      {obs.sessionPlan.pitchLength || obs.sessionPlan.pitchWidth
                        ? `${obs.sessionPlan.pitchLength || "—"} x ${obs.sessionPlan.pitchWidth || "—"}`
                        : "—"}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{obs.sessionPlan[f.key] || "—"}</p>
                  )}
                </div>
              ))}
              {obs.sessionPlan.typeOfSession && obs.sessionPlan.typeOfSession.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Type of Session</p>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {obs.sessionPlan.typeOfSession.map(t => (
                      <span key={t} className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{t}</span>
                    ))}
                  </div>
                  {obs.sessionPlan.progressiveType && obs.sessionPlan.progressiveType.length > 0 && (
                    <p className="text-xs text-slate-500 mb-1">Progressive type: {obs.sessionPlan.progressiveType.join(", ")}</p>
                  )}
                  {obs.sessionPlan.pppType && obs.sessionPlan.pppType.length > 0 && (
                    <p className="text-xs text-slate-500">PPP type: {obs.sessionPlan.pppType.join(", ")}</p>
                  )}
                </div>
              )}
              {obs.sessionPlan.pitchGeography && obs.sessionPlan.pitchGeography.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Pitch Geography</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {obs.sessionPlan.pitchGeography.map(g => g === "Other" ? (obs.sessionPlan.pitchGeographyOther || "Other") : g).join(", ")}
                  </p>
                </div>
              )}
              {obs.sessionPlan.zonesUsed && obs.sessionPlan.zonesUsed.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Areas / Zones Used</p>
                  <p className="text-sm text-slate-700 mb-2">{obs.sessionPlan.zonesUsed.join(", ")}</p>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <PitchZoneDiagram selectedZones={obs.sessionPlan.zonesUsed} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {obs.sochangeit && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><ListChecks className="w-4 h-4" /> SOCHANGEIT Evidence</span>
              <span className="text-xs font-medium text-slate-400">
                {SOCHANGEIT_ITEMS.filter(i => obs.sochangeit[i.key]).length}/{SOCHANGEIT_ITEMS.length} ticked · does not affect score
              </span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {SOCHANGEIT_ITEMS.map(item => {
                const checked = !!obs.sochangeit[item.key];
                return (
                  <div key={item.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${checked ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${checked ? "bg-indigo-600" : "bg-slate-300"}`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {obs.cetNotes && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1.5">General Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{obs.cetNotes}</p>
          </div>
        )}

        {obs.areas && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><ListChecks className="w-4 h-4" /> Assessment Scoring</span>
              <span className="text-sm font-bold text-slate-900">{total} / {MAX_TOTAL_SCORE}</span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {ASSESSMENT_AREAS.map(a => {
                const data = obs.areas[a.key] || { score: null, notes: "" };
                const lvl = SCORE_LEVELS.find(l => l.value === data.score);
                return (
                  <div key={a.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${lvl?.color || "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {lvl ? `${lvl.value} · ${lvl.label}` : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{a.desc}</p>
                    {typeof data.score === "number" && (
                      <p className="text-xs text-slate-500 italic mb-1.5">{a.descriptors[data.score]}</p>
                    )}
                    <p className="text-sm text-slate-600">{data.notes || "No evidence recorded."}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Strengths</h3>
            <p className="text-sm text-slate-600 bg-emerald-50 rounded-lg p-3 whitespace-pre-wrap">{obs.strengths || "—"}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Areas for Development</h3>
            <p className="text-sm text-slate-600 bg-amber-50 rounded-lg p-3 whitespace-pre-wrap">{areasForDevelopmentText || "—"}</p>
          </div>
        </div>

        {(obs.diplomaThreshold != null || obs.assessmentOutcome) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {obs.diplomaThreshold != null && (
              <div className={`rounded-lg border p-3 ${total >= obs.diplomaThreshold ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className="text-xs text-slate-500">Final Score vs. {obs.formalCourseName} threshold</p>
                <p className={`text-base font-bold ${total >= obs.diplomaThreshold ? "text-emerald-700" : "text-red-700"}`}>
                  {total}/{MAX_TOTAL_SCORE} <span className="text-xs font-normal text-slate-400">(min. {obs.diplomaThreshold} required)</span>
                </p>
              </div>
            )}
            {obs.assessmentOutcome && (
              <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">{obs.sessionType === "informal" ? "Assessment Outcome (Indicative)" : "Assessment Outcome"}</p>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${outcomeColor}`}>{obs.assessmentOutcome}</span>
              </div>
            )}
          </div>
        )}

        {obs.assessmentOutcome === "Highly Competent" && obs.potentialPathways && obs.potentialPathways.length > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-bold text-violet-800 mb-2">Potential Future Pathways</p>
            <div className="flex gap-1.5 flex-wrap">
              {obs.potentialPathways.map(p => (
                <span key={p} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-300">{p}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Development Plan</h3>
          {obs.planNotes && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Coach Educator's notes</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{obs.planNotes}</p>
            </div>
          )}
          {obs.actionPlan && obs.actionPlan.some(a => a && a.trim()) && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Coach's Action Plan</p>
              <ol className="space-y-1.5">
                {obs.actionPlan.map((a, i) => a && a.trim() ? (
                  <li key={i} className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2.5 flex gap-2">
                    <span className="font-semibold text-slate-400">{i + 1}.</span> {a}
                  </li>
                ) : null)}
              </ol>
            </div>
          )}
          {!obs.planNotes && (!obs.actionPlan || !obs.actionPlan.some(a => a && a.trim())) && (
            <p className="text-sm text-slate-400">No specific plan items recorded.</p>
          )}
        </div>

        {(obs.coachEducatorName || obs.assessorSignature) && (
          <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">{obs.educatorRole || "Coach Education Tutor (CET)"} Name</p>
              <p className="text-sm font-medium text-slate-800">{obs.coachEducatorName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Assessor Signature</p>
              <p className="text-base italic text-slate-700" style={{ fontFamily: "cursive" }}>{obs.assessorSignature || "—"}</p>
            </div>
          </div>
        )}

        {showOverseasLicenceNote && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Transfer your overseas Licence to an AFC/FA Diploma. Contact{" "}
              <a href="mailto:technical@footballaustralia.com.au" className="underline font-medium">technical@footballaustralia.com.au</a> immediately.
            </p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-400">
            CODA was created by Craig Moore. For additional information, suggested changes or any query contact{" "}
            <a href="mailto:craigianmoore@gmail.com" className="underline">craigianmoore@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function DataExportTool() {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");

  // Reads straight from Supabase now (rather than window.storage) — this is
  // mainly a backup/portability tool at this point (there's no other
  // artifact to move data to any more), but kept working since it's a handy
  // one-click JSON snapshot of everything in the database.
  async function handleExport() {
    setStatus("Exporting...");
    const allData = {};
    const failedKeys = [];
    try {
      for (const key of CODA_STORAGE_KEYS) {
        try {
          if (COLLECTION_TABLE_MAP[key]) {
            allData[key] = await loadCollectionSb(COLLECTION_TABLE_MAP[key]);
          } else {
            allData[key] = await kvGet(key);
          }
        } catch (e) {
          allData[key] = null;
          failedKeys.push(key);
        }
      }
      setOutput(JSON.stringify(allData, null, 2));
      setStatus(failedKeys.length
        ? `Exported ${CODA_STORAGE_KEYS.length} keys, but couldn't read: ${failedKeys.join(", ")}.`
        : `Exported ${CODA_STORAGE_KEYS.length} keys. Copy the box below to keep as a backup, or paste into Import Data to restore.`);
    } catch (err) {
      setStatus("Export failed: " + err.message);
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
      <p className="text-sm font-semibold text-amber-800">Export Data (backup)</p>
      <p className="text-xs text-amber-700">Pulls every coach, course, CET, observation, and setting out of the database as clean, readable JSON — useful as a manual backup, or for moving data into a different CODA deployment's Import tool.</p>
      <button onClick={handleExport} className="bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700">
        Export CODA Data
      </button>
      {status && <p className="text-xs text-amber-800">{status}</p>}
      {output && (
        <textarea readOnly value={output} onClick={e => e.target.select()}
          className="w-full h-48 font-mono text-xs p-2 border border-amber-300 rounded-lg bg-white" />
      )}
    </div>
  );
}

function DataImportTool({ onImported }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setError(""); setStatus("");
    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      setError("That doesn't look like valid JSON — make sure you copied the full export text.");
      return;
    }
    const foundKeys = CODA_STORAGE_KEYS.filter(k => Object.prototype.hasOwnProperty.call(parsed, k) && parsed[k] != null);
    if (foundKeys.length === 0) {
      setError("No recognised CODA data keys found in that JSON.");
      return;
    }
    setImporting(true);
    const failedKeys = [];
    try {
      for (const key of foundKeys) {
        try {
          // The old Claude-artifact CODA double-encoded its export: every
          // key's value is itself a JSON *string* (e.g. "coaches": "[{...}]"
          // instead of "coaches": [{...}]) rather than the parsed value
          // directly. Un-wrap that first, for every key, before anything
          // else — this affects collections and settings alike.
          let raw = parsed[key];
          if (typeof raw === "string") {
            try { raw = JSON.parse(raw); } catch { /* not JSON — leave as-is */ }
          }
          if (COLLECTION_TABLE_MAP[key]) {
            const table = COLLECTION_TABLE_MAP[key];
            // Also tolerate a collection stored as an object keyed by id
            // rather than a plain array, and records missing an id.
            const asArray = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : []);
            const withIds = asArray.map(item => (item && typeof item === "object" && !item.id) ? { ...item, id: uid() } : item);
            await mergeCollectionSb(table, withIds);
          } else {
            await kvSet(key, raw);
          }
        } catch (e) {
          failedKeys.push(key);
        }
      }
      if (failedKeys.length) {
        setError(`Some keys failed to import: ${failedKeys.join(", ")}. The rest were saved — try again for just those, or re-run the whole import.`);
      } else {
        setStatus(`Imported ${foundKeys.length} key(s): ${foundKeys.join(", ")}. Reloading...`);
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      setError("Import failed: " + err.message);
    }
    setImporting(false);
  }

  return (
    <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 space-y-2">
      <p className="text-sm font-semibold text-sky-800">Import Data (restore from backup)</p>
      <p className="text-xs text-sky-700">Paste JSON produced by the Export Data tool. This adds new records and updates any existing ones with a matching ID — it never deletes records that aren't in the pasted file, so anything added directly in the app since your backup was taken stays safe.</p>
      <textarea value={input} onChange={e => setInput(e.target.value)} rows={6} placeholder="Paste exported JSON here..."
        className="w-full font-mono text-xs p-2 border border-sky-300 rounded-lg bg-white" />
      <button onClick={handleImport} disabled={importing || !input.trim()}
        className="bg-sky-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:bg-slate-300">
        {importing ? "Importing..." : "Import Data"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {status && <p className="text-xs text-emerald-700">{status}</p>}
    </div>
  );
}

function HistoryTab({ coaches, educators, observations, coachId, setCoachId, onView, onClearHistory, onDeleteObservation, adminSettings, saveAdminSettings, adminLockouts, recordAdminAttempt, autoOpenAdmin, onAutoOpenHandled }) {
  const [cetFilter, setCetFilter] = useState("");
  const [clearConfirmStep, setClearConfirmStep] = useState(false);
  const [confirmDeleteObsId, setConfirmDeleteObsId] = useState(null);
  const [exportAllCoaches, setExportAllCoaches] = useState(true);
  const [exportCoachIds, setExportCoachIds] = useState([]);

  function toggleExportCoach(id) {
    setExportCoachIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    if (autoOpenAdmin) {
      setShowAdminPanel(true);
      onAutoOpenHandled && onAutoOpenHandled();
    }
  }, [autoOpenAdmin]);
  const [panelAuthed, setPanelAuthed] = useState(false);
  const [signedInAdminName, setSignedInAdminName] = useState("");
  const [panelName, setPanelName] = useState("");
  const [panelPin, setPanelPin] = useState("");
  const [panelAuthError, setPanelAuthError] = useState(false);
  const [leadBlockedMessage, setLeadBlockedMessage] = useState("");
  const [kickedOutMessage, setKickedOutMessage] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [pinChangeError, setPinChangeError] = useState("");
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [addAdminError, setAddAdminError] = useState("");
  const [resetAllPin, setResetAllPin] = useState("");
  const [resetAllPinConfirm, setResetAllPinConfirm] = useState("");
  const [resetAllError, setResetAllError] = useState("");
  const [resetAllSuccess, setResetAllSuccess] = useState(false);
  const [maxAdminsInput, setMaxAdminsInput] = useState("");
  const [maxAdminsError, setMaxAdminsError] = useState("");
  const [maxAdminsSuccess, setMaxAdminsSuccess] = useState(false);
  const [newAdminPinMode, setNewAdminPinMode] = useState("me");
  const [newAdminPinSelf, setNewAdminPinSelf] = useState("");
  const [newAdminPinSelfConfirm, setNewAdminPinSelfConfirm] = useState("");
  const [leadAdminNameInput, setLeadAdminNameInput] = useState("");
  const [leadAdminError, setLeadAdminError] = useState("");
  const [leadAdminSuccess, setLeadAdminSuccess] = useState(false);

  const maxAdmins = adminSettings.maxAdmins || MAX_ADMINS;
  const iAmLeadAdmin = panelAuthed && isLeadAdmin(adminSettings, signedInAdminName);

  const filtered = observations.filter(o =>
    (!coachId || o.coachId === coachId) &&
    (!cetFilter || (o.coachEducatorName || "").toLowerCase() === cetFilter.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  function isAdminMatch(name) {
    return adminSettings.admins.some(a => a.name.trim().toLowerCase() === (name || "").trim().toLowerCase());
  }

  function handleClearHistory() {
    onClearHistory();
    setClearConfirmStep(false);
  }

  async function handleExportPdf() {
    let completedTasksData = [];
    try {
      completedTasksData = await loadCollectionSb("completed_tasks");
    } catch (e) {
      completedTasksData = [];
    }
    function findVideoLink(o) {
      if (!o.courseNumber) return "";
      const match = completedTasksData.find(t => t.coachId === o.coachId && (t.courseNumber || "").trim() === (o.courseNumber || "").trim());
      return match?.videoLink || "";
    }
    const includeCoach = (coachId) => exportAllCoaches || exportCoachIds.includes(coachId);
    const filteredObservations = observations.filter(o => includeCoach(o.coachId));
    const filteredCompletedTasks = completedTasksData.filter(t => includeCoach(t.coachId));
    const esc = (s) => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const sections = filteredObservations.map((o, idx) => {
      const total = totalForObs(o);
      const areaRows = o.areas
        ? ASSESSMENT_AREAS.map(a => {
            const d = o.areas[a.key] || {};
            const lvl = SCORE_LEVELS.find(l => l.value === d.score);
            return `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${esc(a.label)}</td><td style="padding:4px 8px;border:1px solid #ddd;white-space:nowrap;">${lvl ? lvl.value + " · " + esc(lvl.label) : "—"}</td><td style="padding:4px 8px;border:1px solid #ddd;">${esc(d.notes) || "—"}</td></tr>`;
          }).join("")
        : "";
      const actionItems = (o.actionPlan || []).filter(a => a && a.trim());
      const pitchMap = o.sessionPlan?.zonesUsed?.length > 0
        ? `<div style="margin:14px 0;"><p style="font-size:13px;font-weight:600;margin-bottom:6px;">Pitch Zones Used</p>${buildPitchZoneSvg(o.sessionPlan.zonesUsed)}</div>`
        : "";
      return `
        <div style="${idx < filteredObservations.length - 1 ? "page-break-after: always;" : ""} font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b;">
          ${o.sessionType === "formal" ? `<img src="https://brandfetch.com/api/og?id=idLpBhih9y&asset=idzJrgOR_U&icon=false" alt="Football Victoria" style="height:48px;margin-bottom:16px;display:block;" />` : ""}
          <h2 style="margin:0 0 2px 0;">Coaching Observation Report</h2>
          <p style="color:#64748b;margin:0 0 16px 0;">${esc(o.coachName) || "—"}</p>
          ${findVideoLink(o) ? `<p style="margin:0 0 16px 0;font-size:13px;"><strong>🎥 Video:</strong> <a href="${esc(findVideoLink(o))}" style="color:#4f46e5;">${esc(findVideoLink(o))}</a></p>` : ""}
          <table style="width:100%;font-size:13px;margin-bottom:14px;">
            <tr>
              <td><strong>Coach:</strong> ${esc(o.coachName) || "—"}</td>
              <td><strong>${esc(o.educatorRole) || "CET"}:</strong> ${esc(o.coachEducatorName) || "—"}</td>
              <td><strong>Date:</strong> ${o.date ? new Date(o.date).toLocaleDateString("en-GB") : "—"}</td>
            </tr>
          </table>
          <p style="font-size:13px;"><strong>Session Type:</strong> ${o.sessionType === "formal" ? `Formal · ${esc(o.formalCourseName)}` : "Informal"}${o.ageGroup ? " · " + esc(o.ageGroup) : ""}</p>
          ${areaRows ? `<h3 style="margin-top:18px;">Assessment Scoring (${total ?? "—"} / ${MAX_TOTAL_SCORE})</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;">${areaRows}</table>` : ""}
          ${pitchMap}
          <h3 style="margin-top:18px;margin-bottom:4px;">Strengths</h3>
          <p style="font-size:13px;margin-top:0;">${esc(o.strengths) || "—"}</p>
          <h3 style="margin-top:14px;margin-bottom:4px;">Areas for Development</h3>
          <p style="font-size:13px;margin-top:0;">${esc(o.areas_feedback) || "—"}</p>
          ${o.planNotes ? `<h3 style="margin-top:14px;margin-bottom:4px;">Plan Notes</h3><p style="font-size:13px;margin-top:0;">${esc(o.planNotes)}</p>` : ""}
          ${actionItems.length > 0 ? `<h3 style="margin-top:14px;margin-bottom:4px;">Coach's Action Plan</h3>
          <ol style="font-size:13px;margin-top:0;">${actionItems.map(a => `<li>${esc(a)}</li>`).join("")}</ol>` : ""}
          ${o.assessmentOutcome ? `<p style="font-size:13px;margin-top:14px;"><strong>Outcome:</strong> ${esc(o.assessmentOutcome)}</p>` : ""}
        </div>
      `;
    }).join("");
    const completedTasksSections = filteredCompletedTasks.length > 0 ? `
      <div style="page-break-after: always; font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b;">
        <h2 style="margin:0 0 12px 0;">Completed Tasks Summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Coach</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Course</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Attendance</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Online Modules</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Coursework</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Checkpoint</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f1f5f9;">Video</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCompletedTasks.map(t => {
              const taskCoach = coaches.find(c => c.id === t.coachId);
              const { done, total } = courseworkProgress(t, taskCoach?.topics);
              return `<tr>
                <td style="padding:6px 8px;border:1px solid #ddd;">${esc(t.coachName)}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${esc(t.courseTitle)}${t.courseNumber ? " (#" + esc(t.courseNumber) + ")" : ""}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${t.attendancePercent}%</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${t.onlineModulesPercent || 0}%</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${total > 0 ? done + "/" + total : "—"}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${esc(t.checkpoint) || "—"}</td>
                <td style="padding:6px 8px;border:1px solid #ddd;">${t.videoLink ? `<a href="${esc(t.videoLink)}" style="color:#4f46e5;">Watch</a>` : "—"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : "";
    const html = `<html><head><title>Observation History Export</title></head><body style="margin:0;">${completedTasksSections}${sections || '<p style="padding:28px;font-family:sans-serif;">No finished observations to export.</p>'}</body></html>`;
    downloadHtml(html, "observation-history.html");
  }

  function resetAdminPanel() {
    releaseAdminSessionIfMine();
    setShowAdminPanel(false);
    setPanelAuthed(false);
    setSignedInAdminName("");
    setPanelName(""); setPanelPin(""); setPanelAuthError(false);
    setLeadBlockedMessage(""); setKickedOutMessage("");
    setNewPin(""); setNewPinConfirm(""); setPinChangeError(""); setPinChangeSuccess(false);
    setNewAdminName(""); setNewAdminPin(""); setNewAdminPinSelf(""); setNewAdminPinSelfConfirm(""); setNewAdminPinMode("me"); setAddAdminError("");
    setLeadAdminNameInput(""); setLeadAdminError(""); setLeadAdminSuccess(false);
  }

  // Reads the shared Lead-Admin session lock straight from kv_settings
  // (not through React state), so the check is always against what's
  // ACTUALLY there right now — this is the one place staleness would
  // genuinely defeat the whole feature.
  async function readAdminSession() {
    return (await kvGet("adminSession")) || null;
  }

  async function releaseAdminSessionIfMine() {
    if (!signedInAdminName) return;
    try {
      const current = await readAdminSession();
      if (current && (current.activeAdmin || "").toLowerCase() === signedInAdminName.toLowerCase()) {
        await kvDelete("adminSession");
      }
    } catch (e) { /* best-effort — a stale session just gets overwritten by the next claim anyway */ }
  }

  function handleFullPinReset() {
    setResetAllSuccess(false);
    if (!/^\d{4}$/.test(resetAllPin)) {
      setResetAllError("PIN must be exactly 4 digits.");
      return;
    }
    if (resetAllPin !== resetAllPinConfirm) {
      setResetAllError("PINs do not match.");
      return;
    }
    saveAdminSettings({ ...adminSettings, admins: adminSettings.admins.map(a => ({ ...a, pin: resetAllPin })) });
    setResetAllError("");
    setResetAllSuccess(true);
    setResetAllPin(""); setResetAllPinConfirm("");
  }

  function handleSaveMaxAdmins() {
    setMaxAdminsSuccess(false);
    const n = parseInt(maxAdminsInput, 10);
    if (isNaN(n) || n < 1) {
      setMaxAdminsError("Enter a whole number of at least 1.");
      return;
    }
    if (n < adminSettings.admins.length) {
      setMaxAdminsError(`Can't be lower than the ${adminSettings.admins.length} admin(s) already on file.`);
      return;
    }
    saveAdminSettings({ ...adminSettings, maxAdmins: n });
    setMaxAdminsError("");
    setMaxAdminsSuccess(true);
  }

  function handleSetLeadAdmin() {
    setLeadAdminSuccess(false);
    const name = leadAdminNameInput.trim();
    if (!name) { setLeadAdminError("Enter the name of the admin to make Lead Admin."); return; }
    if (!isAdminMatch(name)) { setLeadAdminError("That name doesn't match any admin currently on file."); return; }
    saveAdminSettings({ ...adminSettings, leadAdminName: name });
    setLeadAdminError("");
    setLeadAdminSuccess(true);
    setLeadAdminNameInput("");
  }

  async function handleUnlockPanel() {
    if (isLockedOut(adminLockouts, panelName)) {
      setPanelAuthError(true);
      return;
    }
    const match = findAdminMatch(adminSettings.admins, panelName, panelPin);
    if (!match) {
      recordAdminAttempt(panelName, false);
      setPanelAuthError(true);
      return;
    }
    recordAdminAttempt(panelName, true);

    const iAmLead = isLeadAdmin(adminSettings, match.name);
    const current = await readAdminSession();
    if (current && current.activeAdmin && (current.activeAdmin.toLowerCase() !== match.name.toLowerCase()) && current.isLead && !iAmLead) {
      setLeadBlockedMessage(`${current.activeAdmin} (Lead Admin) is currently in Admin Settings — try again once they've left.`);
      setPanelAuthError(false);
      return;
    }
    try {
      await kvSet("adminSession", { activeAdmin: match.name, isLead: iAmLead, since: Date.now() });
    } catch (e) { /* if this fails, worst case is the kick-out feature doesn't engage this session — access itself still works */ }

    setPanelAuthed(true);
    setSignedInAdminName(match.name);
    setMaxAdminsInput(String(adminSettings.maxAdmins || MAX_ADMINS));
    setPanelAuthError(false);
    setLeadBlockedMessage("");
    setKickedOutMessage("");
  }

  useEffect(() => {
    if (!panelAuthed || iAmLeadAdmin) return;
    const interval = setInterval(async () => {
      const current = await readAdminSession();
      if (current && current.activeAdmin && current.activeAdmin.toLowerCase() !== signedInAdminName.toLowerCase()) {
        setKickedOutMessage(`You've been signed out — ${current.activeAdmin} (Lead Admin) entered Admin Settings. Any changes you'd already saved are unaffected; anything you were mid-edit on will need to be redone.`);
        setPanelAuthed(false);
        setSignedInAdminName("");
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [panelAuthed, iAmLeadAdmin, signedInAdminName]);

  function handleChangePin() {
    setPinChangeSuccess(false);
    if (!/^\d{4}$/.test(newPin)) {
      setPinChangeError("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== newPinConfirm) {
      setPinChangeError("PINs do not match.");
      return;
    }
    const updatedAdmins = adminSettings.admins.map(a =>
      a.name.trim().toLowerCase() === signedInAdminName.trim().toLowerCase() ? { ...a, pin: newPin } : a
    );
    saveAdminSettings({ ...adminSettings, admins: updatedAdmins });
    setPinChangeError("");
    setPinChangeSuccess(true);
    setNewPin(""); setNewPinConfirm("");
  }

  function handleAddAdmin() {
    const name = newAdminName.trim();
    if (adminSettings.admins.length >= maxAdmins) {
      setAddAdminError(`Only ${maxAdmins} admin${maxAdmins === 1 ? "" : "s"} allowed — Admin 1 can raise this limit in settings below.`);
      return;
    }
    if (!name) {
      setAddAdminError("Enter a name for the new admin.");
      return;
    }
    if (isAdminMatch(name)) {
      setAddAdminError("This person is already an admin.");
      return;
    }
    let pinToUse;
    if (newAdminPinMode === "them") {
      if (!/^\d{4}$/.test(newAdminPinSelf)) {
        setAddAdminError("Ask them to enter a 4-digit PIN.");
        return;
      }
      if (newAdminPinSelf !== newAdminPinSelfConfirm) {
        setAddAdminError("Their PINs don't match — ask them to try again.");
        return;
      }
      pinToUse = newAdminPinSelf;
    } else {
      if (!/^\d{4}$/.test(newAdminPin)) {
        setAddAdminError("Enter a 4-digit PIN for the new admin.");
        return;
      }
      pinToUse = newAdminPin;
    }
    saveAdminSettings({ ...adminSettings, admins: [...adminSettings.admins, { name, pin: pinToUse }] });
    setNewAdminName("");
    setNewAdminPin("");
    setNewAdminPinSelf("");
    setNewAdminPinSelfConfirm("");
    setNewAdminPinMode("me");
    setAddAdminError("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900">Observation History</h2>
        <div className="flex items-center gap-2">
          <select value={coachId || ""} onChange={e => setCoachId(e.target.value || null)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All coaches</option>
            {[...coaches].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={cetFilter} onChange={e => setCetFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All CETs</option>
            {[...educators].sort((a, b) => a.name.localeCompare(b.name)).map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {kickedOutMessage && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
          <LogOut className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{kickedOutMessage}</p>
          <button onClick={() => setKickedOutMessage("")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showAdminPanel && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Settings className="w-4 h-4" /> Admin Settings</p>
            <button onClick={resetAdminPanel} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>

          {!panelAuthed ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Enter an admin name and the current PIN to manage admin settings.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={panelName} onChange={e => { setPanelName(e.target.value); setPanelAuthError(false); setLeadBlockedMessage(""); }}
                  placeholder="Admin name" className={`border rounded-lg px-3 py-2 text-sm ${panelAuthError ? "border-red-400" : "border-slate-300"}`} />
                <input type="password" inputMode="numeric" maxLength={4} value={panelPin}
                  onChange={e => { setPanelPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPanelAuthError(false); setLeadBlockedMessage(""); }}
                  placeholder="Current PIN" className={`border rounded-lg px-3 py-2 text-sm text-center tracking-widest ${panelAuthError ? "border-red-400" : "border-slate-300"}`} />
              </div>
              {panelAuthError && (
                <p className="text-xs text-red-600">
                  {isLockedOut(adminLockouts, panelName)
                    ? `Too many incorrect attempts — locked for ${lockoutRemainingMinutes(adminLockouts, panelName)} more minute${lockoutRemainingMinutes(adminLockouts, panelName) === 1 ? "" : "s"}.`
                    : "Incorrect admin name or PIN."}
                </p>
              )}
              {leadBlockedMessage && (
                <p className="text-xs text-red-600 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 shrink-0" /> {leadBlockedMessage}</p>
              )}
              <button onClick={handleUnlockPanel} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">Unlock</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                Signed in as Admin: {signedInAdminName}
                {iAmLeadAdmin && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Lead Admin</span>}
              </p>
              {iAmLeadAdmin && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  As Lead Admin, no other admin can enter these settings while you're here — and if one was already in when you entered, they've just been signed out.
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <DataExportTool />
                <DataImportTool />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Export Observation History</p>
                <p className="text-xs text-slate-500 mb-2">Downloads one HTML file with a Completed Tasks summary table for every coach, followed by every finished (submitted) observation report (including pitch maps). Open the downloaded file in a browser tab and use Print → Save as PDF.</p>
                <button onClick={handleExportPdf}
                  disabled={observations.length === 0}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white">
                  <FileText className="w-4 h-4" /> Export PDF
                </button>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-red-700 mb-1">Clear History</p>
                <p className="text-xs text-slate-500 mb-2">Permanently delete all {observations.length} observation{observations.length === 1 ? "" : "s"} for every Coach Educator using this app. This cannot be undone.</p>
                {!clearConfirmStep ? (
                  <button onClick={() => setClearConfirmStep(true)} disabled={observations.length === 0}
                    className="flex items-center gap-1.5 text-sm font-semibold text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-white">
                    <Trash2 className="w-4 h-4" /> Clear All History
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700 flex-1">Are you sure? This deletes all {observations.length} observation{observations.length === 1 ? "" : "s"} permanently.</p>
                    <button onClick={handleClearHistory} className="text-xs font-semibold text-red-700 hover:text-red-800 whitespace-nowrap">Confirm Delete</button>
                    <button onClick={() => setClearConfirmStep(false)} className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-800 mb-1">Admins</p>
                <p className="text-xs text-slate-500 mb-2">
                  Maximum {maxAdmins} admin{maxAdmins === 1 ? "" : "s"}, each with their own individual PIN.
                  {" "}Lead Admin: <strong>{adminSettings.leadAdminName || "—"}</strong>.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {adminSettings.admins.map((a, i) => (
                    <span key={a.name} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                      Admin {i + 1}: {a.name}
                      {isLeadAdmin(adminSettings, a.name) && <Lock className="w-3 h-3 text-amber-600" />}
                    </span>
                  ))}
                </div>
                {adminSettings.admins.length < maxAdmins ? (
                  <div className="space-y-2">
                    <input value={newAdminName} onChange={e => { setNewAdminName(e.target.value); setAddAdminError(""); }}
                      placeholder={`Name for Admin ${adminSettings.admins.length + 1}`} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => { setNewAdminPinMode("me"); setAddAdminError(""); }} type="button"
                        className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${newAdminPinMode === "me" ? "border-slate-900 bg-slate-50 text-slate-800" : "border-slate-200 text-slate-500"}`}>
                        I'll set their PIN
                      </button>
                      <button onClick={() => { setNewAdminPinMode("them"); setAddAdminError(""); }} type="button"
                        className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${newAdminPinMode === "them" ? "border-slate-900 bg-slate-50 text-slate-800" : "border-slate-200 text-slate-500"}`}>
                        Let them set it now
                      </button>
                    </div>
                    {newAdminPinMode === "me" ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input type="password" inputMode="numeric" maxLength={4} value={newAdminPin}
                          onChange={e => { setNewAdminPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setAddAdminError(""); }}
                          placeholder="Their 4-digit PIN" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                        <button onClick={handleAddAdmin} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">Add Admin</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Hand the device to {newAdminName.trim() || "the new admin"} — have them enter their own 4-digit PIN below without you looking, then tap Add Admin.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <input type="password" inputMode="numeric" maxLength={4} value={newAdminPinSelf}
                            onChange={e => { setNewAdminPinSelf(e.target.value.replace(/\D/g, "").slice(0, 4)); setAddAdminError(""); }}
                            placeholder="New PIN" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                          <input type="password" inputMode="numeric" maxLength={4} value={newAdminPinSelfConfirm}
                            onChange={e => { setNewAdminPinSelfConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setAddAdminError(""); }}
                            placeholder="Confirm PIN" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                        </div>
                        <button onClick={handleAddAdmin} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">Add Admin</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Admin slots full.</p>
                )}
                {addAdminError && <p className="text-xs text-red-600 mt-1">{addAdminError}</p>}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-800 mb-1">Change Your PIN</p>
                <p className="text-xs text-slate-500 mb-2">Updates the PIN for {signedInAdminName} only — each admin keeps their own separate PIN.</p>
                <div className="grid sm:grid-cols-2 gap-2 mb-2">
                  <input type="password" inputMode="numeric" maxLength={4} value={newPin}
                    onChange={e => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinChangeError(""); setPinChangeSuccess(false); }}
                    placeholder="New PIN" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                  <input type="password" inputMode="numeric" maxLength={4} value={newPinConfirm}
                    onChange={e => { setNewPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinChangeError(""); setPinChangeSuccess(false); }}
                    placeholder="Confirm new PIN" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                </div>
                <button onClick={handleChangePin} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Update PIN</button>
                {pinChangeError && <p className="text-xs text-red-600 mt-1">{pinChangeError}</p>}
                {pinChangeSuccess && <p className="text-xs text-emerald-600 mt-1">PIN updated.</p>}
              </div>

              {iAmLeadAdmin && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-amber-600" /> Lead Admin (current: {adminSettings.leadAdminName})</p>
                  <p className="text-xs text-slate-500 mb-2">Only the current Lead Admin can hand this role to another admin already on file.</p>
                  <div className="flex items-center gap-2 mb-1">
                    <input value={leadAdminNameInput} onChange={e => { setLeadAdminNameInput(e.target.value); setLeadAdminError(""); setLeadAdminSuccess(false); }}
                      placeholder="Admin name to make Lead Admin" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={handleSetLeadAdmin} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">Set Lead Admin</button>
                  </div>
                  {leadAdminError && <p className="text-xs text-red-600 mt-1">{leadAdminError}</p>}
                  {leadAdminSuccess && <p className="text-xs text-emerald-600 mt-1">Lead Admin updated.</p>}
                </div>
              )}

              {adminSettings.admins[0] && adminSettings.admins[0].name.toLowerCase() === signedInAdminName.toLowerCase() && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Admin Slots (Admin 1 only)</p>
                  <p className="text-xs text-slate-500 mb-2">Set how many admin slots this app allows in total (currently {maxAdmins}).</p>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="number" min="1" value={maxAdminsInput}
                      onChange={e => { setMaxAdminsInput(e.target.value); setMaxAdminsError(""); setMaxAdminsSuccess(false); }}
                      className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center" />
                    <button onClick={handleSaveMaxAdmins} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Save Limit</button>
                  </div>
                  {maxAdminsError && <p className="text-xs text-red-600 mt-1">{maxAdminsError}</p>}
                  {maxAdminsSuccess && <p className="text-xs text-emerald-600 mt-1">Admin limit updated.</p>}
                </div>
              )}

              {adminSettings.admins[0] && adminSettings.admins[0].name.toLowerCase() === signedInAdminName.toLowerCase() && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Full PIN Reset (Admin 1 only)</p>
                  <p className="text-xs text-slate-500 mb-2">Sets this same PIN for every admin on the list at once — use if a PIN's been forgotten or you want to start fresh.</p>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <input type="password" inputMode="numeric" maxLength={4} value={resetAllPin}
                      onChange={e => { setResetAllPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setResetAllError(""); setResetAllSuccess(false); }}
                      placeholder="New PIN for everyone" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                    <input type="password" inputMode="numeric" maxLength={4} value={resetAllPinConfirm}
                      onChange={e => { setResetAllPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setResetAllError(""); setResetAllSuccess(false); }}
                      placeholder="Confirm new PIN" className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest" />
                  </div>
                  <button onClick={handleFullPinReset} className="text-sm font-semibold text-red-600 hover:text-red-700">Reset All Admin PINs</button>
                  {resetAllError && <p className="text-xs text-red-600 mt-1">{resetAllError}</p>}
                  {resetAllSuccess && <p className="text-xs text-emerald-600 mt-1">All admin PINs have been reset.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">No observations found.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(o => {
            const total = totalForObs(o);
            const oSessionNumber = (o.courseNumber && o.coachId) ? computeSessionNumber(observations, o.coachId, o.courseNumber, o.id, o.date) : null;
            return (
              <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 transition-colors">
                <div onClick={() => onView(o.id)} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{o.coachName}</p>
                      <p className="text-xs text-slate-400">
                        {o.sessionType === "formal" ? `Formal · ${o.formalCourseName || "Course"}${o.courseNumber ? ` (#${o.courseNumber})` : ""}` : "Informal"} · {new Date(o.date).toLocaleDateString("en-GB")} · {o.coachEducatorName}
                        {oSessionNumber ? ` · Session ${oSessionNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.assessmentOutcome && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        o.assessmentOutcome === "Competent" ? "bg-emerald-100 text-emerald-700"
                        : o.assessmentOutcome === "Not Yet Competent" ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                      }`}>{o.assessmentOutcome}</span>
                    )}
                    {total !== null && <span className="text-xs font-medium text-slate-400">{total}/{MAX_TOTAL_SCORE}</span>}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    {onDeleteObservation && (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteObsId(o.id); }}
                        className="text-slate-300 hover:text-red-600 p-1 rounded-md hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {confirmDeleteObsId === o.id && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    <p className="text-xs text-red-700 flex-1">
                      Delete this observation for {o.coachName}? Any linked Completed Tasks record will revert to no record for this item (unless another observation still covers it).
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteObservation(o.id); setConfirmDeleteObsId(null); }}
                      className="text-xs font-semibold text-red-700 hover:text-red-800 whitespace-nowrap">Delete</button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteObsId(null); }}
                      className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap">Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
