"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface TopHeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function TopHeader({ title, showBack }: TopHeaderProps) {
  const [userName, setUserName] = useState<string>("Account");
  const [userInitial, setUserInitial] = useState<string>("U");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Account";
        setUserName(name);
        setUserInitial(name.charAt(0).toUpperCase());
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="bg-[#f8f9ff] px-5 py-3 flex items-center justify-between border-b border-slate-200 shrink-0 select-none">
      {showBack ? (
        <Link href="/dashboard" className="flex items-center gap-1 text-slate-700 hover:text-[#008080] font-bold text-xs">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span>Back</span>
        </Link>
      ) : (
        <Link href="/profile" className="flex items-center gap-2 group cursor-pointer" title="Go to Profile">
          <div className="w-9 h-9 rounded-full bg-[#008080] text-white font-extrabold flex items-center justify-center text-sm shadow ring-2 ring-[#008080]/30 group-hover:scale-105 transition-transform">
            {userInitial}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROFILE</span>
            <span className="text-xs font-extrabold text-[#0b1c30] group-hover:text-[#008080] truncate max-w-[90px]">{userName}</span>
          </div>
        </Link>
      )}

      {/* App Header Title */}
      <Link href="/dashboard" className="flex items-center gap-1 text-[#008080] font-extrabold text-base">
        <span className="material-symbols-outlined text-xl">ecg_heart</span>
        <span>{title || "CuraTrack"}</span>
      </Link>

      {/* Emergency SOS / Alerts Quick Button */}
      <Link href="/alerts" className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors relative" title="Alerts & SOS">
        <span className="material-symbols-outlined text-lg">notifications</span>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
      </Link>
    </div>
  );
}
