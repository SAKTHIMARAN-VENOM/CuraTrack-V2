'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Fingerprint, Sparkles, HeartPulse, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useApp();
  const [email, setEmail] = useState('sarah.jenkins@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/');
    }, 500);
  };

  const handleBiometricLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/');
    }, 400);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-surface-container-lowest dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto">
        {/* Branding & Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3 shadow-sm">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Access your secure CuraTrack clinical dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-teal-400"></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah.jenkins@example.com"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-on-surface outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-[11px] font-semibold text-primary hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-on-surface outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-full py-3 px-4 shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Or Sign In With
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          {/* Biometric Quick Login */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleBiometricLogin}
              className="w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed flex items-center justify-center transition-all active:scale-90 border border-primary/20 shadow-sm"
              title="Sign in with FaceID / Biometrics"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-slate-500 font-medium">Use Touch ID / Face ID</span>
          </div>
        </div>

        {/* Footer Register Link */}
        <p className="text-center text-xs text-on-surface-variant mt-6">
          Don&apos;t have a CuraTrack account?{' '}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </main>
  );
}
