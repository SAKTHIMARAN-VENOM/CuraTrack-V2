'use client';

import { useState, KeyboardEvent } from 'react';
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

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; badge: string; badgeText: string; icon: string; title: string }> = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-700',
    badgeText: 'HIGH',
    icon: 'dangerous',
    title: 'text-red-800',
  },
  moderate: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
    badgeText: 'MODERATE',
    icon: 'warning',
    title: 'text-amber-800',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    badgeText: 'LOW',
    icon: 'info',
    title: 'text-blue-800',
  },
  unknown: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    badgeText: 'NO DATA',
    icon: 'help',
    title: 'text-slate-700',
  },
};

export default function DrugCheckerPage() {
  const [drugs, setDrugs] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addDrug = () => {
    const val = inputValue.trim();
    if (!val) return;
    if (drugs.length >= 8) return;
    if (drugs.map(d => d.toLowerCase()).includes(val.toLowerCase())) return;
    setDrugs([...drugs, val]);
    setInputValue('');
    setResult(null);
  };

  const removeDrug = (idx: number) => {
    setDrugs(drugs.filter((_, i) => i !== idx));
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
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">medication_liquid</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Drug Interaction Checker</h2>
        </div>
        <p className="text-tertiary ml-14">Add your medications below to check for known interactions via OpenFDA</p>
      </div>

      {/* Drug Input */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container mb-6">
        <label className="text-xs font-bold uppercase tracking-widest text-tertiary mb-3 block">Add Medications</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type drug name and press Enter..."
            className="flex-1 px-4 py-3 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            onClick={addDrug}
            disabled={!inputValue.trim() || drugs.length >= 8}
            className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add
          </button>
        </div>

        {/* Drug Tags */}
        {drugs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {drugs.map((drug, i) => (
              <span
                key={i}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold"
              >
                {drug}
                <button
                  onClick={() => removeDrug(i)}
                  className="hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-tertiary">{drugs.length}/8 medications • Minimum 2 required</p>
          <button
            onClick={checkInteractions}
            disabled={drugs.length < 2 || loading}
            className="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-2xl shadow-md hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                Checking...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">search</span>
                Check Interactions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
              <div className="h-5 bg-slate-100 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-full mb-2" />
              <div className="h-4 bg-slate-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Safe combinations */}
          {result.safe_combinations.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-3xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
              <div>
                <p className="font-bold text-green-800 mb-1">Safe Combinations</p>
                <div className="flex flex-wrap gap-2">
                  {result.safe_combinations.map((combo, i) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{combo}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interaction cards */}
          {result.pairs.map((pair, i) => {
            const cfg = SEVERITY_CONFIG[pair.severity] || SEVERITY_CONFIG.unknown;
            return (
              <div key={i} className={`rounded-3xl p-6 border ${cfg.bg} ${cfg.border} shadow-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${cfg.title}`}>{cfg.icon}</span>
                    <div>
                      <p className={`font-bold text-lg ${cfg.title}`}>
                        {pair.drug_a} <span className="font-normal text-sm">+</span> {pair.drug_b}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Source: {pair.source}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${cfg.badge}`}>{cfg.badgeText}</span>
                </div>
                <p className={`text-sm leading-relaxed ${cfg.title} opacity-80`}>{pair.description}</p>
              </div>
            );
          })}

          {result.pairs.length === 0 && result.safe_combinations.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center">
              <span className="material-symbols-outlined text-green-500 text-4xl mb-2">verified</span>
              <p className="font-bold text-green-800 text-lg">No interactions detected</p>
              <p className="text-green-700 text-sm mt-1">All checked combinations appear safe. Always consult your pharmacist.</p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-tertiary text-center mt-8">
        Data sourced from OpenFDA. This is not a substitute for professional medical advice.
      </p>
    </div>
  );
}
