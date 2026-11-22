// Mentee share links: a random, unguessable token per link. Stored server-side only
// (service_role), so the mentor can re-copy the link later. One active link per mentee.
import { randomBytes } from "node:crypto";
import { adminClient } from "./server";

export const MENTEE_ID = /^[A-Za-z0-9_-]{1,64}$/;
export const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
export const DEFAULT_DAYS = 120;
export const MAX_DAYS = 365;
const T = "fifa_mentee_shares";

const activeRow = (r) => r && !r.revoked_at && new Date(r.expires_at).getTime() > Date.now();
const shape = (r, origin) => r && activeRow(r)
  ? { active: true, url: origin + "/m/" + r.token, expiresAt: r.expires_at, createdAt: r.created_at, lastViewedAt: r.last_viewed_at || null }
  : { active: false };

async function current(owner, menteeId) {
  const { data, error } = await adminClient().from(T).select("*").eq("owner", owner).eq("mentee_id", menteeId).is("revoked_at", null).order("created_at", { ascending: false }).limit(1);
  if (error) throw new Error("db");
  return data && data[0];
}
export async function shareStatus(owner, menteeId, origin) { return shape(await current(owner, menteeId), origin); }

export async function createShare(owner, menteeId, days, origin) {
  const d = Math.min(MAX_DAYS, Math.max(1, Math.round(Number(days)) || DEFAULT_DAYS));
  const now = new Date();
  const sb = adminClient();
  await sb.from(T).update({ revoked_at: now.toISOString() }).eq("owner", owner).eq("mentee_id", menteeId).is("revoked_at", null);
  const row = { token: randomBytes(24).toString("base64url"), owner, mentee_id: menteeId, created_at: now.toISOString(), expires_at: new Date(now.getTime() + d * 864e5).toISOString() };
  const { error } = await sb.from(T).insert(row);
  if (error) throw new Error("db");
  return shape(row, origin);
}
export async function revokeShare(owner, menteeId) {
  const { error } = await adminClient().from(T).update({ revoked_at: new Date().toISOString() }).eq("owner", owner).eq("mentee_id", menteeId).is("revoked_at", null);
  if (error) throw new Error("db");
}

// Public lookup: returns the mentee record for a valid token, else null.
export async function resolveShare(token) {
  if (!TOKEN.test(token)) return null;
  const sb = adminClient();
  const { data: row } = await sb.from(T).select("*").eq("token", token).maybeSingle();
  if (!activeRow(row)) return null;
  const { data: m } = await sb.from("fifa_mentees").select("data,updated_at").eq("owner", row.owner).eq("id", row.mentee_id).maybeSingle();
  if (!m) return null;
  sb.from(T).update({ last_viewed_at: new Date().toISOString() }).eq("token", token).then(() => {}, () => {});
  return { data: m.data, updatedAt: m.updated_at };
}
