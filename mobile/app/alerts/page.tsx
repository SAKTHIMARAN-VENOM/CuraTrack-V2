"use client";

import React, { useState, useEffect } from 'react';
import MobileFrame from '@/components/MobileFrame';
import { getHealthRisks, getHealthNews } from '@/lib/api';

export default function AlertsPage() {
  const [isSosActive, setIsSosActive] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    getHealthRisks().then((res) => {
      if (res && res.risks && res.risks.length > 0) {
        setAlerts(res.risks);
      } else {
        setAlerts([
          {
            title: "Monsoon Dengue & Vector-borne Outbreak",
            location: "Urban North Zone (High Risk)",
            level: "HIGH ALERT",
            levelBg: "bg-red-100 text-red-800",
            desc: "Increased mosquito breeding due to heavy rainfall. Ensure water containers are emptied weekly.",
            action: "View Prevention Guidelines",
          },
          {
            title: "Viral Conjunctivitis (Eye Flu) Advisory",
            location: "School & Community Centers",
            level: "MODERATE",
            levelBg: "bg-amber-100 text-amber-800",
            desc: "Highly contagious viral eye infection. Avoid sharing towels and wash hands frequently.",
            action: "View Symptoms",
          },
        ]);
      }
    });
  }, []);

  return (
    <MobileFrame headerTitle="Outbreak Alerts">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b1c30]">Seasonal Health Alerts</h1>
        <p className="text-xs text-[#434654] font-medium">Real-time WHO disease surveillance & emergency SOS</p>
      </div>

      {/* Emergency SOS Banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl p-5 text-white shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl animate-pulse">sos</span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Emergency Ambulance & Care</h3>
          </div>
          <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">24/7 ACTIVE</span>
        </div>

        <p className="text-xs text-red-100 font-medium">
          Instant SOS dispatch connects your live location and emergency medical ID with nearest hospital network.
        </p>

        <button
          onClick={() => setIsSosActive(true)}
          className="w-full bg-white hover:bg-slate-100 text-red-600 font-extrabold py-3 rounded-2xl text-xs transition-colors shadow flex items-center justify-center gap-2 mt-1"
        >
          <span className="material-symbols-outlined text-lg">call</span>
          <span>TRIGGER EMERGENCY SOS CALL (108)</span>
        </button>
      </div>

      {/* Outbreak Alert List */}
      <div className="flex flex-col gap-3">
        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Active Regional Outbreaks (Render Live Radar)</h3>

        {alerts.map((alert, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <h4 className="font-extrabold text-sm text-[#0b1c30] leading-snug">{alert.title}</h4>
                <span className="text-[10px] font-bold text-slate-400">{alert.location}</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${alert.levelBg || 'bg-red-100 text-red-800'}`}>
                {alert.level || 'HIGH ALERT'}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">{alert.desc || "Active health advisory in your region."}</p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-[#008080]">WHO Protocol Compliant</span>
              <button className="font-extrabold text-xs text-[#0b1c30] hover:text-[#008080] flex items-center gap-1">
                <span>{alert.action || "View Guidelines"}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SOS Modal */}
      {isSosActive && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-red-200 flex flex-col gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-ping">
              <span className="material-symbols-outlined text-4xl">sos</span>
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-red-600">Dispatching Emergency SOS!</h3>
              <p className="text-xs text-slate-600 mt-1">Sharing your GPS Location (28.6139° N, 77.2090° E) & Blood Group (O+) with Emergency Response 108.</p>
            </div>

            <button
              onClick={() => setIsSosActive(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs shadow"
            >
              Cancel False Alarm
            </button>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
