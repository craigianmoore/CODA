"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import CoachObservationApp from "../components/CoachObservationApp";

const SESSION_KEY = "coda_trial_user";

export default function Page() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setChecking(false);
  }, []);

  async function handleUnlock() {
    if (!/^\d{4}$/.test(pin)) {
      setError("Enter your 4-digit PIN.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { data, error: sbError } = await supabase
      .from("trial_users")
      .select("name, pin, is_admin")
      .eq("pin", pin)
      .maybeSingle();
    setSubmitting(false);
    if (sbError || !data) {
      setError("PIN not recognised. Check with Moorey if you think this is wrong.");
      return;
    }
    const sessionUser = { name: data.name, isAdmin: data.is_admin };
    setUser(sessionUser);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser)); } catch {}
  }

  function handleLogout() {
    setUser(null);
    setPin("");
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  if (checking) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">CODA</h1>
            <p className="text-sm text-slate-500">Enter your PIN to continue.</p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
            placeholder="••••"
            className="w-full border border-slate-300 rounded-lg px-3 py-3 text-center text-2xl tracking-[0.5em]"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleUnlock}
            disabled={submitting}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold disabled:bg-slate-300"
          >
            {submitting ? "Checking..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <span>Signed in as {user.name}{user.isAdmin ? " (admin)" : ""}</span>
        <button onClick={handleLogout} className="underline hover:no-underline">Sign out</button>
      </div>
      <CoachObservationApp />
    </div>
  );
}
