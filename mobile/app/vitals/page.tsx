"use client";

import React, { useState, useEffect } from 'react';
import MobileFrame from '@/components/MobileFrame';
import { getFitData } from '@/lib/api';

export default function VitalsPage() {
  const [vitals, setVitals] = useState<{ steps: number; heart_rate: number; spo2: number } | null>(null);

  useEffect(() => {
    getFitData().then((res: any) => {
      if (res) {
        const hr = res.heart_rate || (res.heartRateData && res.heartRateData.length > 0 ? res.heartRateData[res.heartRateData.length - 1].bpm : 74);
        setVitals({
          steps: res.steps || 0,
          heart_rate: hr,
          spo2: res.spo2 || 98,
        });
      }
    }).catch((err) => console.warn("Vitals API error:", err));
  }, []);

  return (
    <MobileFrame headerTitle="Health Vitals">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b1c30]">Vitals & ECG Waveform</h1>
        <p className="text-xs text-[#434654] font-medium">Real-time biometrics from smartwatch & mobile sensors</p>
      </div>

      {/* ECG Animation Container */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-lg text-white flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-xs font-bold tracking-wider text-slate-300">LIVE ECG MONITORING</span>
          </div>
          <span className="text-xs font-extrabold text-[#008080] bg-[#008080]/20 px-2.5 py-0.5 rounded-full border border-[#008080]/30">
            Lead II Normal
          </span>
        </div>

        {/* Animated Waveform */}
        <div className="h-20 w-full overflow-hidden relative flex items-center justify-center my-1 bg-slate-950/80 rounded-2xl border border-slate-800 p-2">
          <svg viewBox="0 0 400 60" className="w-full h-full text-emerald-400 stroke-current fill-none stroke-[2.5]">
            <path d="M0,30 L60,30 L70,10 L80,50 L90,20 L100,35 L110,30 L200,30 L210,10 L220,50 L230,20 L240,35 L250,30 L340,30 L350,10 L360,50 L370,20 L380,35 L390,30 L400,30" />
          </svg>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-400">
          <span>R-R Interval: 820ms</span>
          <span>ST Segment: Normal</span>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Heart Rate */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">favorite</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600">NORMAL</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">HEART RATE</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals ? vitals.heart_rate : "--"}</span>
            <span className="text-xs font-semibold text-slate-400">BPM</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">water_drop</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600">OPTIMAL</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">BLOOD OXYGEN</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals ? vitals.spo2 : "--"}</span>
            <span className="text-xs font-semibold text-slate-400">%</span>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">speed</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600">IDEAL</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">BLOOD PRESSURE</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-[#0b1c30]">118/78</span>
            <span className="text-[10px] font-semibold text-slate-400">mmHg</span>
          </div>
        </div>

        {/* Body Temp */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">thermostat</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600">NORMAL</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">BODY TEMP</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-[#0b1c30]">98.6</span>
            <span className="text-xs font-semibold text-slate-400">°F</span>
          </div>
        </div>
      </div>

      {/* History Log */}
      <div className="flex flex-col gap-2">
        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Recent Measurement History</h3>
        <div className="flex flex-col gap-2">
          {vitals ? (
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#0b1c30] block">Live Synced Just Now</span>
                <span className="text-[11px] text-slate-500 font-medium">HR: {vitals.heart_rate} BPM • SpO2: {vitals.spo2}% • Steps: {vitals.steps.toLocaleString()}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                Live Optimal
              </span>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center text-xs text-slate-400 font-medium">
              Fetching live sensor biometrics...
            </div>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
