"use client";

import React, { useState, useEffect } from 'react';
import MobileFrame from '@/components/MobileFrame';
import SchemeEligibilityModal from '@/components/SchemeEligibilityModal';
import { fetchRecommendedSchemes, submitInsuranceClaim } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function SchemesPage() {
  const [isCheckerOpen, setIsCheckerOpen] = useState(false);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("user_default");
  const [userName, setUserName] = useState<string>("Sarah Johnson");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const activeId = user?.id || "user_default";
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Authenticated User");
      }
      fetchRecommendedSchemes(activeId).then((res) => {
        if (res && res.availableSchemes) {
          setSchemes(res.availableSchemes);
        }
      });
    }).catch(() => {
      fetchRecommendedSchemes("user_default").then((res) => {
        if (res && res.availableSchemes) {
          setSchemes(res.availableSchemes);
        }
      });
    });
  }, []);

  const handleClaim = async (schemeName: string) => {
    setClaiming(schemeName);
    try {
      const res = await submitInsuranceClaim(userId, schemeName, 50000);
      setClaimMessage(res.message);
      setTimeout(() => setClaimMessage(null), 4000);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <MobileFrame headerTitle="Health Schemes">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30]">Benefits & Schemes</h1>
          <p className="text-xs text-[#434654] font-medium">AI recommendations & cashless claim filing</p>
        </div>
        <button
          onClick={() => setIsCheckerOpen(true)}
          className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-3 py-2 rounded-2xl transition-colors shadow text-xs flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">fact_check</span>
          <span>Check AI Status</span>
        </button>
      </div>

      {/* Claim Success Banner */}
      {claimMessage && (
        <div className="bg-emerald-100 border border-emerald-300 rounded-2xl p-3.5 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
          <span>{claimMessage}</span>
        </div>
      )}

      {/* Digital Ayushman Card Widget */}
      <div className="bg-gradient-to-br from-[#0b1c30] via-slate-900 to-teal-950 rounded-3xl p-5 text-white shadow-xl border border-slate-800 flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#008080] text-2xl">verified</span>
            <span className="font-extrabold text-xs tracking-wider text-teal-200 uppercase">AYUSHMAN BHARAT CARD</span>
          </div>
          <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            VERIFIED
          </span>
        </div>

        <div className="z-10">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">CARDHOLDER NAME</span>
          <h3 className="font-extrabold text-lg text-white">{userName}</h3>
          <p className="text-xs font-mono text-teal-300 tracking-widest mt-0.5">PMJAY - 9081 - 2234 - 1045</p>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 z-10 text-slate-300">
          <div>
            <span className="text-[10px] text-slate-400 block">Annual Balance</span>
            <span className="font-extrabold text-emerald-400">₹4,20,000 / ₹5,00,000</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold">
            <span className="material-symbols-outlined text-lg">qr_code_2</span>
          </div>
        </div>

        {/* Decorative Circle */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#008080]/10 blur-xl"></div>
      </div>

      {/* AI Recommended Schemes */}
      <div className="flex flex-col gap-3">
        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">AI Recommended Health Schemes</h3>

        {schemes.map((s, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#008080] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#0b1c30]">{s.name}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{s.type}</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {s.match_percentage || 94}% Match
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">{s.reason}</p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="font-extrabold text-[#008080]">{s.amount}</span>
              <button
                onClick={() => handleClaim(s.name)}
                disabled={claiming === s.name}
                className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-3 py-1.5 rounded-xl transition-colors shadow text-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                <span>{claiming === s.name ? "Filing..." : "File Claim"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Scheme Eligibility Modal */}
      <SchemeEligibilityModal
        isOpen={isCheckerOpen}
        onClose={() => setIsCheckerOpen(false)}
      />
    </MobileFrame>
  );
}
