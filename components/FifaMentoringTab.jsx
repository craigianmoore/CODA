"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";

// FIFA Mentoring area. The page itself and all its data come from /api/fifa/*,
// which refuses anyone without the FIFA Mentoring permission, so hiding this
// tab is only a convenience; the server is what keeps it closed.
export default function FifaMentoringTab({ session }) {
  const [status, setStatus] = useState("checking"); // checking | login | ready | denied | unconfigured
  const [name, setName] = useState(session?.name || "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check() {
    try {
      const r = await fetch("/api/fifa/session", { credentials: "same-origin", cache: "no-store" });
      if (r.ok) setStatus("ready");
      else if (r.status === 403) setStatus("denied");
      else if (r.status === 503) setStatus("unconfigured");
      else setStatus("login");
    } catch { setStatus("login"); }
  }
  useEffect(() => { check(); }, []);

  async function signIn() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/fifa/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setPin(""); setStatus("ready"); }
      else if (r.status === 503) setStatus("unconfigured");
      else if (r.status === 403) setStatus("denied");
      else setError(j.error || "Could not sign in.");
    } catch { setError("Could not reach the server."); }
    setBusy(false);
  }

  async function lock() {
    try { await fetch("/api/fifa/session", { method: "DELETE", credentials: "same-origin" }); } catch {}
    setStatus("login");
  }

  if (status === "checking") {
    return <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (status === "unconfigured") {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        FIFA Mentoring is not switched on for this deployment yet. It needs the <code>SUPABASE_SERVICE_ROLE_KEY</code> environment variable in Vercel.
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        Your login does not have FIFA Mentoring access. An FA Admin can switch it on for you in History &rarr; Admin.
      </div>
    );
  }
  if (status === "login") {
    return (
      <div className="max-w-sm mx-auto bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold"><Lock className="w-4 h-4" /> FIFA Mentoring</div>
        <p className="text-xs text-slate-500">Confirm your admin name and PIN to open this area.</p>
        <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Admin name" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") signIn(); }}
          placeholder="PIN" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest" />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={signIn} disabled={busy} className="w-full bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60">
          {busy ? "Checking..." : "Open FIFA Mentoring"}
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={lock} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><Lock className="w-3 h-3" /> Lock FIFA Mentoring</button>
      </div>
      <iframe src="/api/fifa/app" title="FIFA Mentoring" className="w-full rounded-xl border border-slate-200 bg-white" style={{ height: "calc(100vh - 190px)", minHeight: 640 }} />
    </div>
  );
}
