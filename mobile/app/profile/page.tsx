"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MobileFrame from '@/components/MobileFrame';
import { generatePassport, calculateSDOH, getFitAuthUrl, PassportGenerateResponse, SDOHResponse } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();
  const [isFitConnected, setIsFitConnected] = useState(true);
  const [fitLoading, setFitLoading] = useState(false);

  const handleConnectFit = async () => {
    setFitLoading(true);
    try {
      const res = await getFitAuthUrl();
      if (res && res.auth_url) {
        window.location.href = res.auth_url;
      } else {
        setIsFitConnected(!isFitConnected);
      }
    } catch {
      setIsFitConnected(!isFitConnected);
    } finally {
      setFitLoading(false);
    }
  };
  const [passportData, setPassportData] = useState<null | PassportGenerateResponse>(null);
  const [sdohScore, setSdohScore] = useState<null | SDOHResponse>(null);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string>("pat_authenticated");
  const [userProfile, setUserProfile] = useState<{ name: string; email: string }>({
    name: "Patient",
    email: "user@curatrack.org",
  });

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserProfile({
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Authenticated Patient",
          email: user.email || "user@curatrack.org",
        });
      }
    }).catch((err) => console.warn("Supabase getUser error:", err));
  }, []);

  const handleGeneratePassport = async () => {
    setGenerating(true);
    try {
      const res = await generatePassport(userId);
      setPassportData(res);
    } finally {
      setGenerating(false);
    }
  };

  const handleCalculateSdoh = async () => {
    const res = await calculateSDOH({
      patient_id: userId,
      income_band: 1,
      food_security: 0,
      hospital_distance: 1,
      employment: 0,
      health_literacy: 1,
    });
    setSdohScore(res);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out exception:", err);
    } finally {
      router.push('/login');
    }
  };

  return (
    <MobileFrame headerTitle="User Profile">
      {/* User Info Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#008080] text-white font-extrabold text-2xl flex items-center justify-center shadow ring-4 ring-[#008080]/20 shrink-0">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold text-[#0b1c30] truncate max-w-[160px]">{userProfile.name}</h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-[#008080]">
              PREMIUM
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{userProfile.email}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">+91 98765 43210</p>
        </div>
      </div>

      {/* Emergency Digital Medical ID & Patient Passport */}
      <div className="bg-gradient-to-r from-slate-900 to-[#0b1c30] rounded-3xl p-5 text-white shadow-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-base">badge</span>
            </div>
            <span className="text-xs font-extrabold tracking-wider uppercase text-slate-200">EMERGENCY MEDICAL ID</span>
          </div>
          <span className="text-[10px] font-mono text-teal-300 font-bold">ABHA: 91-0024-9120</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">BLOOD GROUP</span>
            <span className="font-extrabold text-red-400 text-sm">O Positive (O+)</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ALLERGIES</span>
            <span className="font-extrabold text-amber-300 text-sm">Penicillin, Dust</span>
          </div>
        </div>

        {/* Patient Passport Generation */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-300 font-medium">256-bit Scoped Patient Passport</span>
            <button
              onClick={handleGeneratePassport}
              disabled={generating}
              className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px] transition-colors"
            >
              {generating ? "Generating..." : "Generate Token"}
            </button>
          </div>
          {passportData && (
            <div className="bg-slate-950 p-2.5 rounded-xl text-[10px] font-mono text-emerald-400 border border-teal-800/50 flex flex-col gap-1">
              <div>Passport ID: <span className="text-white font-bold">{passportData.passportId}</span></div>
              <div className="text-slate-400 text-[9px]">Expires in 5 minutes (JWT Scoped)</div>
            </div>
          )}
        </div>
      </div>

      {/* SDOH Risk Score Calculation */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-xs text-[#0b1c30]">Social Determinants of Health (SDOH)</h4>
          <p className="text-[11px] text-slate-400 font-medium">
            {sdohScore ? `Calculated Score: ${sdohScore.score} (${sdohScore.risk_level} Risk)` : "Income, housing & occupational health index"}
          </p>
        </div>
        <button
          onClick={handleCalculateSdoh}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-xs"
        >
          {sdohScore ? "Recalculate" : "Calculate"}
        </button>
      </div>

      {/* Connected Wearables / Integration */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Health Data Sync</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">watch</span>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-[#0b1c30]">Google Fit & Wearable</h4>
              <p className="text-[11px] text-slate-400 font-medium">OAuth2 callback URL configured</p>
            </div>
          </div>

          <button
            onClick={handleConnectFit}
            disabled={fitLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              isFitConnected
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {fitLoading ? "Syncing..." : isFitConnected ? "Connected (Re-sync)" : "Connect Google Fit"}
          </button>
        </div>
      </div>

      {/* Account Settings Menu */}
      <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-col divide-y divide-slate-100 text-xs font-bold">
        <Link href="/records" className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl text-slate-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-teal-600 text-lg">folder_shared</span>
            <span>Encrypted Records Vault</span>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
        </Link>

        <Link href="/schemes" className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-slate-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 text-lg">account_balance_wallet</span>
            <span>Ayushman & Health Insurance</span>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
        </Link>

        <button
          onClick={handleLogout}
          className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-red-600 text-left w-full cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-lg">logout</span>
            <span>Log Out Account</span>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
        </button>
      </div>
    </MobileFrame>
  );
}
