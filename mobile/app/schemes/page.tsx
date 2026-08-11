"use client";

import React, { useState } from 'react';
import MobileFrame from '@/components/MobileFrame';

export default function SchemesPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [insuranceId, setInsuranceId] = useState<string>("INS-[#008080]-98273");
  const [visitType, setVisitType] = useState<string>("Consultation Visit");

  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleVerifyCoverage = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerified(true);
  };

  const handleOpenClaimModal = (schemeName: string) => {
    setSelectedScheme(schemeName);
    setIsModalOpen(true);
  };

  const handleSubmitClaim = () => {
    setIsModalOpen(false);
    setToastMessage("✓ Claim Submitted Successfully!");
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <MobileFrame headerTitle="Benefits & Schemes">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="bg-[#008080] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between z-50 animate-bounce">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Benefits & Schemes</h1>
        <p className="text-xs text-[#434654] font-medium leading-relaxed">
          Maximize your coverage with AI-matched healthcare schemes and seamless insurance claim processing.
        </p>
      </div>

      {/* Check Insurance Eligibility Box */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#0b1c30]">Check Insurance Eligibility</h2>
          <p className="text-xs text-[#434654]">Verify your coverage before requesting schemes.</p>
        </div>

        <form onSubmit={handleVerifyCoverage} className="flex flex-col gap-2.5">
          <select
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#f0f4f8] border border-slate-300 rounded-2xl text-xs font-bold text-[#0b1c30] focus:outline-none focus:border-[#008080]"
          >
            <option>Consultation Visit</option>
            <option>Hospitalization (IPD)</option>
            <option>Diagnostics & Labs</option>
            <option>Emergency Care SOS</option>
          </select>

          <input
            type="text"
            value={insuranceId}
            onChange={(e) => setInsuranceId(e.target.value)}
            required
            placeholder="Enter Insurance ID"
            className="w-full px-3.5 py-2.5 bg-[#f0f4f8] border border-slate-300 rounded-2xl text-xs font-semibold text-[#0b1c30] focus:outline-none focus:border-[#008080]"
          />

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all cursor-pointer"
          >
            Verify Coverage
          </button>
        </form>

        {isVerified && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-emerald-600">verified</span>
              <span className="font-extrabold">100% Cashless Coverage Approved</span>
            </div>
            <span className="bg-emerald-200 text-emerald-900 font-extrabold text-[9px] px-2 py-0.5 rounded-full">ACTIVE</span>
          </div>
        )}
      </div>

      {/* Claim Analytics Box */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
        <h3 className="font-extrabold text-sm text-[#0b1c30]">Claim Analytics</h3>

        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-slate-500">Total Claimed</span>
          <span className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">₹10,00,000</span>
        </div>

        <div className="w-full bg-[#008080] h-2.5 rounded-full overflow-hidden"></div>

        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-1">
          <span>Annual Limit</span>
          <span className="font-extrabold text-[#0b1c30]">₹1,00,000</span>
        </div>
      </div>

      {/* Government Schemes Header */}
      <div className="flex items-center gap-2 mt-2">
        <span className="material-symbols-outlined text-xl text-[#008080]">account_balance</span>
        <h2 className="text-base font-extrabold text-[#0b1c30]">Government Schemes Available</h2>
      </div>

      {/* Govt Scheme Card 1 */}
      <div className="bg-white rounded-3xl p-5 border-2 border-[#008080]/30 shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#008080] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">verified_user</span>
          </div>
          <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
            ⭐ BEST GOVERNMENT OPTION
          </span>
        </div>

        <div>
          <h3 className="font-extrabold text-base text-[#0b1c30]">NPCDCS (National Programme for NCDs)</h3>
          <span className="text-xs text-slate-500 font-semibold">Government Health Programme</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-bold text-[#0b1c30]">
            <span>Eligibility Match</span>
            <span className="text-[#008080]">96%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#008080] h-full rounded-full" style={{ width: '96%' }}></div>
          </div>
        </div>

        <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
          <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
          <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
            Your medical records indicate hypertension & vitals tracking. Qualify for free diagnosis, medication, and follow-up under NPCDCS.
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-[#008080] block">Free screening & treatment</span>
            <span className="text-[10px] text-slate-400 font-semibold">Est. benefit: ₹50,000</span>
          </div>

          <button
            onClick={() => handleOpenClaimModal("NPCDCS Government Health Programme")}
            className="px-4 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all cursor-pointer"
          >
            Apply Now
          </button>
        </div>
      </div>

      {/* Govt Scheme Card 2: Ayushman Bharat PMJAY */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
            CASHLESS HOSPITALIZATION
          </span>
        </div>

        <div>
          <h3 className="font-extrabold text-base text-[#0b1c30]">Ayushman Bharat (PM-JAY)</h3>
          <span className="text-xs text-slate-500 font-semibold">National Health Authority</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-bold text-[#0b1c30]">
            <span>Eligibility Match</span>
            <span className="text-[#008080]">92%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#008080] h-full rounded-full" style={{ width: '92%' }}></div>
          </div>
        </div>

        <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
          <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
          <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
            Secondary and tertiary care hospitalization coverage up to ₹5,00,000 per family per year.
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-[#008080] block">₹5,00,000 Cashless Cover</span>
            <span className="text-[10px] text-slate-400 font-semibold">Est. benefit: ₹5,00,000</span>
          </div>

          <button
            onClick={() => handleOpenClaimModal("Ayushman Bharat (PM-JAY)")}
            className="px-4 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all cursor-pointer"
          >
            Apply Now
          </button>
        </div>
      </div>

      {/* Claim Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-[#0b1c30]">Auto-fill Claim Form</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">SELECTED SCHEME</span>
              <h4 className="font-extrabold text-xs text-[#0b1c30]">{selectedScheme || "NPCDCS Programme"}</h4>
            </div>

            <button
              onClick={handleSubmitClaim}
              className="w-full py-3 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all cursor-pointer"
            >
              Submit Claim
            </button>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
