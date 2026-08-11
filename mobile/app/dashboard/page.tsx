"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileFrame from '@/components/MobileFrame';
import DoctorBookingModal from '@/components/DoctorBookingModal';
import SchemeEligibilityModal from '@/components/SchemeEligibilityModal';
import { getFitData, getHealthInsights } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSchemeOpen, setIsSchemeOpen] = useState(false);

  const [userName, setUserName] = useState<string>("Sarah");
  const [vitals, setVitals] = useState<{ steps: number; heart_rate: number; spo2: number } | null>(null);
  const [aiNudge, setAiNudge] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Sarah";
        setUserName(fullName.split(' ')[0]);
      }
    }).catch(() => {});
  }, []);

  const loadBackendData = async () => {
    setLoading(true);
    try {
      const [fitRes, insightRes] = await Promise.allSettled([
        getFitData(),
        getHealthInsights(),
      ]);

      if (fitRes.status === 'fulfilled' && fitRes.value) {
        const val = fitRes.value as any;
        const bpm = val.heart_rate || (val.heartRateData && val.heartRateData.length > 0 ? val.heartRateData[val.heartRateData.length - 1].bpm : 72);
        const stepsVal = typeof val.steps === 'number' ? val.steps : 0;
        setVitals({
          steps: stepsVal,
          heart_rate: bpm || 72,
          spo2: val.spo2 || 98,
        });
      } else {
        setVitals({ steps: 0, heart_rate: 72, spo2: 98 });
      }

      if (insightRes.status === 'fulfilled' && insightRes.value) {
        const resVal = insightRes.value as any;
        let nudgeText = "";
        if (typeof resVal.ai_nudge === 'string') {
          nudgeText = resVal.ai_nudge;
        } else if (resVal.ai_nudge && typeof resVal.ai_nudge === 'object') {
          nudgeText = resVal.ai_nudge.summary || resVal.ai_nudge.text || resVal.ai_nudge.nudge || "";
        } else if (Array.isArray(resVal.insights) && resVal.insights.length > 0) {
          const first = resVal.insights[0];
          if (typeof first === 'string') {
            nudgeText = first;
          } else if (typeof first === 'object' && first !== null) {
            nudgeText = first.insight || first.tip || first.summary || first.text || "";
          }
        }
        if (nudgeText) setAiNudge(nudgeText);
      }
    } catch (err) {
      setVitals({ steps: 0, heart_rate: 72, spo2: 98 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  const stepsCount = vitals ? vitals.steps : 0;
  const stepsTarget = 10000;
  const stepsPercentage = Math.min(Math.round((stepsCount / stepsTarget) * 100), 100);
  const miles = (stepsCount * 0.0005).toFixed(1);
  const kcal = Math.round(stepsCount * 0.0375);

  return (
    <MobileFrame headerTitle="CuraTrack">
      {/* Greeting Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30]">Hello, {userName}</h1>
          <p className="text-xs text-[#434654] font-medium">Here is your daily health & vitals overview</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
          LIVE SYNCED
        </span>
      </div>

      {/* AI Health Nudge Card */}
      {aiNudge && (
        <div className="bg-gradient-to-r from-[#008080]/10 to-emerald-500/10 border border-[#008080]/20 rounded-3xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#008080] text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">psychology</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-[#008080] uppercase tracking-wider block">AI HEALTH NUDGE</span>
            <p className="text-xs text-slate-700 font-medium leading-relaxed mt-0.5">
              {typeof aiNudge === 'string' ? aiNudge : String((aiNudge as any)?.insight || (aiNudge as any)?.tip || '')}
            </p>
          </div>
        </div>
      )}

      {/* Bento Grid Vitals */}
      <div className="flex flex-col gap-3">
        {/* Daily Steps Calculated Card */}
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
              {stepsCount.toLocaleString()} <span className="text-xs font-bold text-slate-400">steps</span>
            </span>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span>{miles} miles</span>
              <span>•</span>
              <span>{kcal} kcal</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-[#008080] h-full rounded-full transition-all duration-500" style={{ width: `${stepsPercentage}%` }}></div>
          </div>
        </div>

        {/* Heart Rate & Oxygen SpO2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Heart Rate Card */}
          <Link href="/vitals" className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#008080] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">favorite</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Normal</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HEART RATE</span>
              <span className="text-2xl font-extrabold text-[#0b1c30]">
                {vitals ? vitals.heart_rate : 72} <span className="text-xs font-bold text-slate-400">BPM</span>
              </span>
            </div>
          </Link>

          {/* Oxygen SpO2 Card */}
          <Link href="/vitals" className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#008080] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">water_drop</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Optimal</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OXYGEN (SPO2)</span>
              <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals ? vitals.spo2 : 98}%</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div>
        <h2 className="text-sm font-bold text-[#0b1c30] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-blue-50 active:scale-95 transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Book Visit</span>
          </button>

          <Link
            href="/vitals"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-emerald-50 active:scale-95 transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Vitals</span>
          </Link>

          <Link
            href="/alerts"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-amber-50 active:scale-95 transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Alerts</span>
          </Link>

          <button
            onClick={() => setIsSchemeOpen(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-teal-50 active:scale-95 transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Schemes</span>
          </button>
        </div>
      </div>

      {/* Upcoming Appointment Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#008080] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-base">calendar_clock</span>
            Upcoming Telehealth Visit
          </span>
          <Link href="/appointments" className="text-xs font-extrabold text-[#008080] hover:underline">View All</Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 font-extrabold text-lg flex items-center justify-center">
            D
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm text-[#0b1c30]">Dr. James Alexander</h3>
            <p className="text-xs text-slate-500 font-semibold">General Specialist • Video Consultation</p>
            <p className="text-xs font-bold text-[#008080] mt-0.5">Today at 02:30 PM (In 15 mins)</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DoctorBookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <SchemeEligibilityModal isOpen={isSchemeOpen} onClose={() => setIsSchemeOpen(false)} />
    </MobileFrame>
  );
}
