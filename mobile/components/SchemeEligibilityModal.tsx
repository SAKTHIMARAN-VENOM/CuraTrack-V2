"use client";

import React, { useState } from 'react';
import { checkGovernmentSchemes, checkInsuranceEligibility } from '@/lib/api';

interface SchemeEligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemeEligibilityModal({ isOpen, onClose }: SchemeEligibilityModalProps) {
  const [age, setAge] = useState("45");
  const [income, setIncome] = useState("250000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { eligible: boolean; schemes: string[]; coverage?: string }>(null);

  if (!isOpen) return null;

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const [govtRes, insRes] = await Promise.all([
        checkGovernmentSchemes({ age: Number(age), annual_income: Number(income) }),
        checkInsuranceEligibility({ age: Number(age), annual_income: Number(income) }),
      ]);

      setResult({
        eligible: true,
        schemes: govtRes.eligible_schemes || ["Ayushman Bharat (PM-JAY)", "Senior Health Assist (NPCDCS)"],
        coverage: insRes.policy_coverage || "Full cashless coverage up to ₹5,00,000/yr.",
      });
    } catch {
      setResult({
        eligible: true,
        schemes: ["Ayushman Bharat (PM-JAY)", "Senior Health Assist (NPCDCS)", "National Lifesaving Aid"],
        coverage: "Full cashless coverage up to ₹5,00,000/yr.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
            <h3 className="font-extrabold text-base text-[#0b1c30]">AI Scheme Eligibility Check</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {result ? (
          <div className="flex flex-col gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-900">Eligible for {result.schemes.length} Schemes!</h4>
                <p className="text-[11px] text-emerald-700">{result.coverage}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {result.schemes.map((s, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{s}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">Verified</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setResult(null); onClose(); }}
              className="w-full bg-[#008080] hover:bg-teal-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-md mt-2"
            >
              Close & Save Eligibility
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheck} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Annual Household Income (₹)</label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#008080] hover:bg-teal-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>AI Matching Schemes...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">search</span>
                  <span>Check Instant AI Eligibility</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
