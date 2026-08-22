'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Heart, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function RegisterPage() {
  const router = useRouter();
  const { updateUser } = useApp();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    bloodType: 'A+',
    termsAccepted: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (formData.fullName) {
      updateUser({
        name: formData.fullName,
        email: formData.email || 'user@example.com',
        bloodType: formData.bloodType,
      });
    }
    setTimeout(() => {
      setIsLoading(false);
      router.push('/');
    }, 600);
  };

  return (
    <main className="min-h-screen flex text-on-surface bg-surface font-sans">
      <div className="flex w-full min-h-screen">
        {/* Left Atmosphere Panel (Desktop) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary via-[#005555] to-[#003838] relative overflow-hidden flex-col justify-between p-12 text-white">
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-200" />
            </div>
            <span className="text-xl font-bold tracking-tight">CuraTrack Clinical</span>
          </div>

          <div className="relative z-10 max-w-md">
            <h2 className="text-3xl font-extrabold leading-snug mb-4">
              Precision care,<br />effortless control.
            </h2>
            <p className="text-teal-100 text-sm leading-relaxed mb-6">
              Join an interconnected health management platform engineered to deliver hospital-grade security and clarity.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
                <span className="text-xs">Live Telemetry & Wearable Sync</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
                <span className="text-xs">Instant Emergency Contact & 911 Dispatch</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
                <span className="text-xs">Encrypted Diagnostic Reports & Medical ID</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-teal-200/80">
            © 2026 CuraTrack Systems • ISO 27001 Certified
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-surface-container-lowest dark:bg-slate-950 overflow-y-auto">
          <div className="w-full max-w-md flex flex-col">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-primary dark:text-primary-fixed">CuraTrack</span>
            </div>

            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-2xl font-bold text-on-surface">Create Account</h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Enter your medical profile details to set up your dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-on-surface outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="sarah.jenkins@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-on-surface outline-none transition-all"
                  />
                </div>
              </div>

              {/* Blood Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Blood Type (Optional Medical ID)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['A+', 'O+', 'B+', 'AB+'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, bloodType: type })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        formData.bloodType === type
                          ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-on-surface outline-none transition-all"
                  />
                </div>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="terms" className="text-xs text-on-surface-variant">
                  I agree to HIPAA health terms & data privacy policies.
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-full py-3 px-4 shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-on-surface-variant mt-6">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
