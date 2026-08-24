'use client';

import { useState, KeyboardEvent } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

interface DrugPair {
  drug_a: string;
  drug_b: string;
  severity: string;
  description: string;
  source: string;
}

interface CheckResult {
  interactions_found: boolean;
  pairs: DrugPair[];
  safe_combinations: string[];
}

const COMMON_PRESETS = [
  {
    name: 'Cardio & Antiplatelet',
    desc: 'Dual antiplatelet + Statin review',
    drugs: ['Aspirin', 'Clopidogrel', 'Atorvastatin']
  },
  {
    name: 'NCD: HTN + T2DM',
    desc: 'Common rural chronic combo',
    drugs: ['Metformin', 'Telmisartan', 'Amlodipine']
  },
  {
    name: 'High Risk Bleed Alert',
    desc: 'Anticoagulant + NSAID warning',
    drugs: ['Warfarin', 'Ibuprofen']
  },
  {
    name: 'Malaria + Fever Protocol',
    desc: 'EDL ACT therapy + Analgesic',
    drugs: ['Artesunate', 'Lumefantrine', 'Paracetamol']
  },
  {
    name: 'Antibiotic + Antacid',
    desc: 'Chelation / absorption block check',
    drugs: ['Ciprofloxacin', 'Calcium Carbonate']
  }
];

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; badge: string; badgeText: string; icon: string; title: string }> = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-700 border-red-200',
    badgeText: 'HIGH RISK',
    icon: 'dangerous',
    title: 'text-red-800',
  },
  moderate: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'MODERATE RISK',
    icon: 'warning',
    title: 'text-amber-800',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    badgeText: 'MINOR / LOW',
    icon: 'info',
    title: 'text-blue-800',
  },
  unknown: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    badgeText: 'NO DIRECT INTERACTION',
    icon: 'verified_user',
    title: 'text-slate-700',
  },
};

export default function DrugCheckerPage() {
  const [drugs, setDrugs] = useState<string[]>(['Metformin', 'Telmisartan', 'Amlodipine']);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<'All' | 'Renal' | 'Hepatic' | 'Pregnancy'>('All');

  const addDrug = (drugName?: string) => {
    const val = (drugName || inputValue).trim();
    if (!val) return;
    if (drugs.length >= 10) return;
    if (drugs.map(d => d.toLowerCase()).includes(val.toLowerCase())) return;
    setDrugs([...drugs, val]);
    if (!drugName) setInputValue('');
    setResult(null);
  };

  const removeDrug = (idx: number) => {
    setDrugs(drugs.filter((_, i) => i !== idx));
    setResult(null);
  };

  const loadPreset = (presetDrugs: string[]) => {
    setDrugs(presetDrugs);
    setResult(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addDrug();
  };

  const checkInteractions = async () => {
    if (drugs.length < 2) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/check-drug-interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: drugs }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Check failed');
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || 'Safety check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-primary to-cyan-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
            <span className="material-symbols-outlined text-sm">pill</span>
            <span>Clinical Pharmacology & Multidrug Safety Suite</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Drug Interaction & EDL Safety Checker</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/doctor"
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Back to OPD Queue</span>
          </Link>
          <button
            onClick={checkInteractions}
            disabled={drugs.length < 2 || loading}
            className="px-6 py-3 bg-teal-400 hover:bg-teal-300 text-teal-950 font-extrabold text-xs rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'progress_activity' : 'verified_user'}
            </span>
            <span>{loading ? 'Analyzing...' : 'Run Safety Screen'}</span>
          </button>
        </div>
      </div>

      {/* Preset Polypharmacy Combinations */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-tertiary">Quick Clinical Regimen Presets:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {COMMON_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => loadPreset(preset.drugs)}
              className="p-3.5 bg-white border border-surface-container-high rounded-2xl text-left hover:border-primary hover:bg-primary/5 transition-all shadow-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface">{preset.name}</span>
                <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
              </div>
              <p className="text-[11px] text-tertiary line-clamp-1">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Drug Input & Active Regimen (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-surface-container-high space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface">Active Drug Regimen</h2>
                <p className="text-xs text-tertiary">Add up to 10 medicines to screen for contraindications</p>
              </div>
              <span className="px-2.5 py-1 bg-surface-container-low text-tertiary font-mono font-bold text-xs rounded-xl">
                {drugs.length}/10
              </span>
            </div>

            {/* Input & Add Button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type drug name (e.g. Paracetamol, Warfarin)..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface text-xs font-bold focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => addDrug()}
                disabled={!inputValue.trim() || drugs.length >= 10}
                className="px-4 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add</span>
              </button>
            </div>

            {/* Quick Essential Drug List (EDL) Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary block">Quick Add EDL Medicines:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Paracetamol', 'Amoxicillin', 'Metformin', 'Telmisartan', 'Amlodipine', 'Aspirin', 'Ibuprofen', 'Ciprofloxacin', 'Artesunate', 'Omeprazole'].map(med => (
                  <button
                    key={med}
                    onClick={() => addDrug(med)}
                    className="px-2.5 py-1 bg-surface-container-low hover:bg-primary/10 hover:text-primary rounded-lg text-[11px] font-bold text-slate-700 transition-colors border border-surface-container"
                  >
                    + {med}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Drug Tags List */}
            <div className="space-y-2 pt-2 border-t border-surface-container-high">
              <span className="text-xs font-bold text-on-surface block">Currently Selected Medicines:</span>
              {drugs.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-surface-container-low border border-dashed border-surface-container">
                  <span className="material-symbols-outlined text-2xl text-tertiary">medication</span>
                  <p className="text-xs text-tertiary mt-1">No medicines added yet. Type or click presets above.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {drugs.map((drug, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-surface-container text-xs font-bold text-on-surface group hover:border-primary/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-[10px]">
                          {i + 1}
                        </span>
                        <span>{drug}</span>
                      </div>
                      <button
                        onClick={() => removeDrug(i)}
                        className="text-tertiary hover:text-red-600 transition-colors p-1"
                        title="Remove medicine"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-surface-container-high flex items-center justify-between">
              <button
                onClick={() => { setDrugs([]); setResult(null); }}
                className="text-xs text-tertiary hover:text-red-600 font-bold"
              >
                Clear All
              </button>

              <button
                onClick={checkInteractions}
                disabled={drugs.length < 2 || loading}
                className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                <span>Run Analysis</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Results & Clinical Advisory (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">error</span>
              <span>{error}</span>
            </div>
          )}

          {!result && !loading && (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-3xl">clinical_notes</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">Ready to Perform Drug Interaction Analysis</h3>
              <p className="text-xs text-tertiary max-w-md mx-auto">
                Select 2 or more medicines on the left and click <strong>Run Safety Screen</strong> to check against pharmacological safety databases.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-3xl p-16 text-center border border-surface-container-high space-y-3 shadow-card">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
              <h3 className="text-base font-bold text-on-surface">Analyzing Pharmacological Pathways...</h3>
              <p className="text-xs text-tertiary">Scanning CYP450 enzyme metabolism, renal excretion, and adverse reaction literature.</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary Status Card */}
              <div
                className={`p-6 rounded-3xl border shadow-card ${
                  result.interactions_found
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-emerald-50/80 border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
                      result.interactions_found ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {result.interactions_found ? 'warning' : 'check_circle'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-on-surface">
                      {result.interactions_found
                        ? `${result.pairs.length} Potential Interaction(s) Flagged`
                        : 'No Adverse Drug Interactions Detected'}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {result.interactions_found
                        ? 'Review the severity levels, clinical mechanisms, and dosage management recommendations below.'
                        : 'All tested medicine combinations are pharmacologically compatible according to OpenFDA & CDSCO guidelines.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interaction Details Cards */}
              {result.pairs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary">Detected Drug-Drug Interactions:</h3>
                  {result.pairs.map((pair, i) => {
                    const sev = (pair.severity || 'unknown').toLowerCase();
                    const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.unknown;
                    return (
                      <div
                        key={i}
                        className={`p-5 rounded-2xl border ${cfg.bg} ${cfg.border} shadow-xs space-y-3`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined ${cfg.title} text-xl`}>
                              {cfg.icon}
                            </span>
                            <span className="font-extrabold text-base text-on-surface">
                              {pair.drug_a} <span className="text-slate-400 font-normal">+</span> {pair.drug_b}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.badge}`}>
                            {cfg.badgeText}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {pair.description}
                        </p>

                        <div className="pt-2 flex items-center justify-between text-[10px] text-tertiary border-t border-slate-200">
                          <span>Evidence Source: <strong>{pair.source || 'OpenFDA Safety Database'}</strong></span>
                          <span className="font-semibold text-slate-600">Action: Adjust Timing or Titrate Dose</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Safe Combinations List */}
              {result.safe_combinations && result.safe_combinations.length > 0 && (
                <div className="bg-white rounded-3xl p-5 border border-surface-container-high shadow-card space-y-3">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                    <span>Compatible Pairs (No Interaction Warning)</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.safe_combinations.map((comb, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold"
                      >
                        ✓ {comb}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
