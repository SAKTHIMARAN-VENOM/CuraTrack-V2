'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react';

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 25;
      });
    }, 400);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-surface via-surface-container-lowest to-surface-container-low dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-between p-6 sm:p-10">
      {/* Top spacer */}
      <div className="w-full flex justify-end">
        <Link
          href="/welcome"
          className="text-xs font-semibold text-primary dark:text-primary-fixed hover:underline flex items-center gap-1"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Center Branding Animation */}
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-primary to-teal-400 p-0.5 shadow-2xl shadow-primary/30 flex items-center justify-center animate-bounce">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[22px] flex items-center justify-center">
              <HeartPulse className="w-14 h-14 text-primary animate-pulse" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-secondary-container text-on-secondary-container p-2 rounded-xl shadow-md">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-primary dark:text-primary-fixed tracking-tight">
          CuraTrack
        </h1>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">
          Clinical Precision Care
        </p>

        <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">
          Intelligent vitals monitoring, medication schedules, and unified medical health records.
        </p>

        {/* Loading bar */}
        <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-8 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="w-full max-w-xs flex flex-col gap-2.5 text-center">
        <Link
          href="/welcome"
          className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <span>Enter CuraTrack</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <span className="text-[11px] text-slate-400">HIPAA Compliant & Encrypted</span>
      </div>
    </div>
  );
}
