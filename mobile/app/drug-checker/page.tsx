"use client";

import React, { useState } from 'react';
import MobileFrame from '@/components/MobileFrame';
import { checkDrugInteractions, DrugInteractionPair } from '@/lib/api';

export default function DrugCheckerPage() {
  const [meds, setMeds] = useState<string[]>(["Amlodipine", "Atorvastatin"]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { pairs: DrugInteractionPair[]; safe: any[] }>(null);

  const addMed = () => {
    if (inputVal.trim() && meds.length < 8 && !meds.includes(inputVal.trim())) {
      setMeds([...meds, inputVal.trim()]);
      setInputVal("");
    }
  };

  const removeMed = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (meds.length < 2) return;
    setLoading(true);
    try {
      const res = await checkDrugInteractions(meds);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileFrame headerTitle="Drug Checker" showBack>
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b1c30]">Drug Interaction Checker</h1>
        <p className="text-xs text-[#434654] font-medium">FDA Database & Llama 3.1 Contraindication Analysis</p>
      </div>

      {/* Input Box */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
        <label className="block text-xs font-bold text-slate-700">Add Medications (2 to 8)</label>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Metformin, Aspirin, Lisinopril..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMed(); } }}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080]"
          />
          <button
            type="button"
            onClick={addMed}
            className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs"
          >
            Add
          </button>
        </div>

        {/* Selected Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {meds.map((m, idx) => (
            <span
              key={idx}
              className="bg-slate-100 border border-slate-300 text-slate-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5"
            >
              <span>{m}</span>
              <button onClick={() => removeMed(idx)} className="text-slate-400 hover:text-red-500 font-bold text-xs">
                ×
              </button>
            </span>
          ))}
        </div>

        <button
          onClick={handleCheck}
          disabled={loading || meds.length < 2}
          className="w-full bg-[#008080] hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-2xl text-xs transition-colors shadow-md mt-1 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Analyzing FDA & Llama 3.1 Rules...</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">clinical_notes</span>
              <span>Check Interactions ({meds.length} Meds)</span>
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-3">
          <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Analysis Results</h3>

          {result.pairs.map((pair, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#0b1c30]">
                  {pair.drug_a} + {pair.drug_b}
                </h4>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    pair.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : pair.severity === 'moderate'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {pair.severity.toUpperCase()} SEVERITY
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {pair.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </MobileFrame>
  );
}
