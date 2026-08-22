'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, HeartPulse, Sparkles, CheckCircle2 } from 'lucide-react';

export default function WelcomePage() {
  return (
    <main className="flex-1 min-h-screen flex flex-col items-center justify-center p-6 sm:p-10 max-w-lg mx-auto w-full">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
          <HeartPulse className="w-5 h-5" />
        </div>
        <span className="text-xl font-extrabold text-primary dark:text-primary-fixed tracking-tight">
          CuraTrack
        </span>
      </div>

      {/* Hero Illustration Box */}
      <div className="w-full aspect-[4/3] max-w-sm mb-6 rounded-3xl overflow-hidden shadow-lg bg-surface-container-low relative border border-slate-200 dark:border-slate-800">
        <img
          alt="Doctor and patient in consultation"
          className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
          <div className="flex items-center gap-2 text-white text-xs font-semibold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-teal-300" />
            <span>End-to-End Medical Security</span>
          </div>
        </div>
      </div>

      {/* Feature Bullet Points */}
      <div className="text-center w-full mb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-primary dark:text-primary-fixed leading-tight">
          Your Health, Unified.
        </h1>
        <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
          Securely manage clinical records, appointments, real-time vitals, and daily medications in one place.
        </p>

        <div className="pt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Vitals</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Doctor Telehealth</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SOS Response</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-3 flex flex-col">
        <Link
          href="/register"
          className="w-full h-12 bg-primary hover:bg-primary-container text-white rounded-full font-bold text-sm transition-all duration-200 shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/login"
          className="w-full h-12 bg-white dark:bg-slate-900 text-primary dark:text-primary-fixed border border-slate-300 dark:border-slate-700 rounded-full font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 active:scale-95 flex items-center justify-center"
        >
          <span>Log In</span>
        </Link>
      </div>
    </main>
  );
}
