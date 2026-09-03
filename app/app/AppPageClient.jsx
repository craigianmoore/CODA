"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CoachObservationApp from "../../components/CoachObservationApp";

const VISITOR_KEY = "coda_visitor_fa";

export default function AppPageClient() {
  const searchParams = useSearchParams();
  const mfParam = searchParams.get("mf");
  const [checking, setChecking] = useState(true);
  const [faNumber, setFaNumber] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VISITOR_KEY);
      if (saved) setFaNumber(saved);
    } catch {}
    setChecking(false);
  }, []);

  function handleContinue() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Enter your FA Number to continue.");
      return;
    }
    setFaNumber(trimmed);
    try { localStorage.setItem(VISITOR_KEY, trimmed); } catch {}
  }

  function handleChangeIdentity() {
    setFaNumber(null);
    setInput("");
    try { localStorage.removeItem(VISITOR_KEY); } catch {}
  }

  if (checking) return null;

  if (!faNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">CODA</h1>
            <p className="text-sm text-slate-500">Enter your FA Number to continue. This just identifies you — no password needed.</p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => { setInput(e.target.value.replace(/\D/g, "")); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
            placeholder="e.g. 1234567"
            className="w-full border border-slate-300 rounded-lg px-3 py-3 text-center text-lg tracking-wide"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleContinue}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <span>FA# {faNumber}</span>
        <button onClick={handleChangeIdentity} className="underline hover:no-underline">Not you? Change</button>
      </div>
      <CoachObservationApp initialMemberFederation={mfParam} />
    </div>
  );
}
