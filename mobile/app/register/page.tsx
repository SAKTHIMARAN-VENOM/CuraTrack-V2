'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Heart, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, updateUser, authError, isAuthenticated } = useApp();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    bloodType: 'A+',
    termsAccepted: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsLoading(true);
    try {
      const result = await signUpWithEmail(formData.email, formData.password, formData.fullName);
      if (result.error) {
        setLocalError(result.error);
      } else {
        // Update local profile with registration data
        if (formData.fullName) {
          updateUser({
            name: formData.fullName,
            email: formData.email || 'user@example.com',
            bloodType: formData.bloodType,
          });
        }
        router.push('/');
      }
    } catch {
      setLocalError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setLocalError('Google sign-up failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const displayError = localError || authError;

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

            {/* Error Alert */}
            {displayError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
                {displayError}
              </div>
            )}

            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-on-surface hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <span className="text-xs">Redirecting to Google...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span>Sign Up with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Or register with email</span>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
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
                    minLength={6}
                    placeholder="Create a strong password (min. 6 characters)"
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
