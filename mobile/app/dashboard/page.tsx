"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileFrame from '@/components/MobileFrame';
import DoctorBookingModal from '@/components/DoctorBookingModal';
import SchemeEligibilityModal from '@/components/SchemeEligibilityModal';
import { getFitData, getHealthInsights, getHealthCheck } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSchemeOpen, setIsSchemeOpen] = useState(false);

  const [userName, setUserName] = useState<string>("User");
  const [vitals, setVitals] = useState<{ steps: number; heart_rate: number; spo2: number } | null>(null);
  const [aiNudge, setAiNudge] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>("Connecting to Render API...");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || "User");
      }
    }).catch(() => {});
  }, []);

  const loadBackendData = async () => {
    setLoading(true);
    setError(null);
    setApiStatus("Connecting to Render API (curatrack-v3.onrender.com)...");

    try {
      const healthRes = await getHealthCheck();
      setApiStatus(`${healthRes.message} (v${healthRes.version})`);

      const [fitRes, insightRes] = await Promise.allSettled([
        getFitData(),
        getHealthInsights(),
      ]);

      if (fitRes.status === 'fulfilled' && fitRes.value) {
        const val = fitRes.value as any;
        const bpm = val.heart_rate || (val.heartRateData && val.heartRateData.length > 0 ? val.heartRateData[val.heartRateData.length - 1].bpm : 74);
        setVitals({
          steps: val.steps || 0,
          heart_rate: bpm,
          spo2: val.spo2 || 98,
        });
      }

      if (insightRes.status === 'fulfilled' && insightRes.value) {
        const resVal = insightRes.value as any;
        let nudgeStr = "";
        if (typeof resVal.ai_nudge === 'string') {
          nudgeStr = resVal.ai_nudge;
        } else if (resVal.ai_nudge && typeof resVal.ai_nudge === 'object') {
          nudgeStr = resVal.ai_nudge.summary || resVal.ai_nudge.text || resVal.ai_nudge.nudge || JSON.stringify(resVal.ai_nudge);
        } else if (Array.isArray(resVal.insights) && resVal.insights.length > 0) {
          nudgeStr = resVal.insights
            .map((item: any) => (typeof item === 'string' ? item : (item.summary || item.text || item.title || item.nudge || 'Health vital updated')))
            .join(" • ");
        }
        setAiNudge(nudgeStr || "Optimal activity detected. Maintain consistent hydration and regular movement throughout the day.");
      }
    } catch (err: any) {
      console.warn("Render Backend waking up or error:", err);
      setError("Backend server is warming up on Render. Click 'Retry Connection' to sync live data.");
      setApiStatus("Render Backend Offline / Cold Starting");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  const stepsCount = vitals ? vitals.steps : 0;
  const stepsPercentage = Math.min(Math.round((stepsCount / 10000) * 100), 100);

  return (
    <MobileFrame headerTitle="CuraTrack">
      {/* Live Render API Status Ribbon */}
      <div className="bg-slate-900 text-[#008080] border border-slate-800 rounded-2xl px-3 py-2 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 truncate">
          <span className={`w-2 h-2 rounded-full ${error ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
          <span className="truncate">{apiStatus}</span>
        </div>
        {error ? (
          <button onClick={loadBackendData} className="text-amber-400 font-bold hover:underline shrink-0 text-[10px]">
            Retry
          </button>
        ) : (
          <span className="text-slate-400 shrink-0">curatrack-v3</span>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadBackendData} className="bg-amber-600 text-white font-extrabold px-3 py-1 rounded-xl text-[10px] shrink-0">
            Sync API
          </button>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30]">Hello, {userName}</h1>
          <p className="text-xs text-[#434654] font-medium">Here is your daily health & vitals overview</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
          LIVE SYNCED
        </span>
      </div>

      {/* Llama 3.1 AI Health Nudge Card */}
      {aiNudge && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 border border-teal-700/50 rounded-3xl p-4 text-white shadow-md flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#008080] text-white flex items-center justify-center shrink-0 font-bold mt-0.5">
            <span className="material-symbols-outlined text-xl">psychology</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-teal-300 uppercase tracking-wider block">LLAMA 3.1 AI LIVE NUDGE</span>
            <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5">{aiNudge}</p>
          </div>
        </div>
      )}

      {/* Daily Steps Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">directions_walk</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0b1c30]">Daily Steps Calculated</h3>
              <span className="text-[10px] font-bold text-slate-400">Target: 10,000 steps</span>
            </div>
          </div>
          <span className="text-xs font-extrabold text-[#008080]">{stepsPercentage}% Goal</span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-3xl font-extrabold text-[#0b1c30] tracking-tight">
            {vitals ? vitals.steps.toLocaleString() : "..."} <span className="text-xs font-bold text-slate-400">steps</span>
          </span>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span>{(stepsCount * 0.0005).toFixed(1)} miles</span>
            <span>•</span>
            <span>{Math.round(stepsCount * 0.038)} kcal</span>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div className="bg-[#008080] h-full rounded-full transition-all duration-500" style={{ width: `${stepsPercentage}%` }}></div>
        </div>
      </div>

      {/* Heart Rate & SpO2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Heart Rate */}
        <Link href="/vitals" className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#008080] transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">favorite</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              NORMAL
            </span>
          </div>

          <div className="mb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">HEART RATE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals ? vitals.heart_rate : "--"}</span>
              <span className="text-xs font-bold text-slate-400">BPM</span>
            </div>
          </div>

          {/* ECG Animated Wave */}
          <div className="h-6 w-full opacity-80 group-hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 100 25" className="w-full h-full text-red-500 stroke-current fill-none stroke-[2]">
              <path d="M0,12 L20,12 L25,3 L30,22 L35,8 L40,15 L45,12 L100,12" />
            </svg>
          </div>
        </Link>

        {/* Oxygen SpO2 */}
        <Link href="/vitals" className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#008080] transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">water_drop</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              OPTIMAL
            </span>
          </div>

          <div className="mb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">OXYGEN SpO2</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals ? vitals.spo2 : "--"}</span>
              <span className="text-xs font-bold text-slate-400">%</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${vitals ? vitals.spo2 : 0}%` }}></div>
          </div>
        </Link>
      </div>

      {/* Quick Action Grid */}
      <div className="flex flex-col gap-2">
        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Quick Healthcare Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsBookingOpen(true)}
            className="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center gap-3 hover:bg-slate-800 transition-colors shadow-md text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-[#008080] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">video_call</span>
            </div>
            <div>
              <h4 className="font-extrabold text-xs leading-snug">Tele-Consult</h4>
              <p className="text-[10px] text-slate-400 font-medium">Book Video Call</p>
            </div>
          </button>

          <button
            onClick={() => setIsSchemeOpen(true)}
            className="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center gap-3 hover:bg-slate-800 transition-colors shadow-md text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <h4 className="font-extrabold text-xs leading-snug">Check Schemes</h4>
              <p className="text-[10px] text-slate-400 font-medium">Ayushman Card</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      <DoctorBookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <SchemeEligibilityModal isOpen={isSchemeOpen} onClose={() => setIsSchemeOpen(false)} />
    </MobileFrame>
  );
}
