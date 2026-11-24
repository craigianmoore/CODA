"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Loader2 } from "lucide-react";

// FIFA CE area. The page itself and all its data come from /api/fifa/*,
// which refuses anyone without the FIFA CE permission, so hiding this
// tab is only a convenience; the server is what keeps it closed.
export default function FifaMentoringTab({ session }) {
  const [status, setStatus] = useState("checking"); // checking | login | ready | denied | unconfigured
  const [name, setName] = useState(session?.name || "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const frameRef = useRef(null);
  const [frameH, setFrameH] = useState(null);

  // Size the tracker frame to the space left under the CODA header, so the whole
  // frame is on screen at once and nothing (the tracker's own menu included) hangs
  // below the fold where the page can't be scrolled to reach it.
  useEffect(() => {
    if (status !== "ready") return;
    // Start from the top so the frame's top edge is a stable measurement.
    window.scrollTo(0, 0);
    const root = document.documentElement;
    const fit = () => {
      const el = frameRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const avail = Math.round(window.innerHeight - top - 12);
      setFrameH(Math.max(420, avail));
      // When the frame fits in the window, the page itself has nothing to scroll.
      // Locking it stops the tracker's scrolling from dragging the whole frame
      // up under the header (which hid the top of the tracker's menu).
      root.style.overflow = avail >= 420 ? "hidden" : "";
    };
    fit();
    const t = setTimeout(fit, 400);
    window.addEventListener("resize", fit);
    return () => { clearTimeout(t); window.removeEventListener("resize", fit); root.style.overflow = ""; };
  }, [status]);

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
        FIFA CE is not switched on for this deployment yet. It needs the <code>SUPABASE_SERVICE_ROLE_KEY</code> environment variable in Vercel.
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        Your login does not have FIFA CE access. An FA Admin can switch it on for you in History &rarr; Admin.
      </div>
    );
  }
  if (status === "login") {
    return (
      <div className="max-w-sm mx-auto bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold"><Lock className="w-4 h-4" /> FIFA CE</div>
        <p className="text-xs text-slate-500">Confirm your admin name and PIN to open this area.</p>
        <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Admin name" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
        <input type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") signIn(); }}
          placeholder="PIN" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest" />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={signIn} disabled={busy} className="w-full bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-60">
          {busy ? "Checking..." : "Open FIFA CE"}
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={lock} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><Lock className="w-3 h-3" /> Lock FIFA CE</button>
      </div>
      <iframe ref={frameRef} src="/api/fifa/app" title="FIFA CE" className="w-full rounded-xl border border-slate-200 bg-white" style={{ height: frameH ? `${frameH}px` : "calc(100vh - 190px)", minHeight: 420 }} />
    </div>
  );
}
