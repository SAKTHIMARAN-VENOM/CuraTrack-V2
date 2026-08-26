'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Heart, ShieldCheck, ArrowRight, CheckCircle2, Phone, AlertCircle, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

const COMMON_ALLERGIES = [
  'No Known Allergies (NKDA)',
  'Penicillin',
  'Sulfa Drugs',
  'Aspirin / NSAIDs',
  'Latex',
  'Peanuts / Nuts',
  'Dust / Pollen'
];

const COMMON_CONDITIONS = [
  'None',
  'Hypertension',
  'Type 2 Diabetes',
  'Asthma / COPD',
  'Thyroid Disorder',
  'Cardiac Condition'
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, updateUser, authError, isAuthenticated, user } = useApp();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    age: '28',
    gender: 'Female',
    phone: '',
    emergencyName: '',
    emergencyPhone: '',
    bloodType: 'O+',
    allergiesText: '',
    selectedAllergies: ['No Known Allergies (NKDA)'],
    selectedConditions: ['None'],
    termsAccepted: true,
  });

  const [existingDataFound, setExistingDataFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Auto-detect existing profile or session data
  useEffect(() => {
    const checkExistingProfile = async () => {
      // 1. Check AppContext user
      if (user && (user.name || user.email)) {
        setExistingDataFound(true);
        setFormData(prev => ({
          ...prev,
          fullName: user.name || prev.fullName,
          email: user.email || prev.email,
          age: user.age ? String(user.age) : prev.age,
          gender: user.gender || prev.gender,
          phone: user.phone || prev.phone,
          bloodType: user.bloodType || prev.bloodType,
          emergencyName: user.emergencyContact?.name || prev.emergencyName,
          emergencyPhone: user.emergencyContact?.phone || prev.emergencyPhone,
          selectedAllergies: user.allergies && user.allergies.length > 0 ? user.allergies : prev.selectedAllergies,
          selectedConditions: user.chronicConditions && user.chronicConditions.length > 0 ? user.chronicConditions : prev.selectedConditions,
        }));
      }

      // 2. Check Supabase auth session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setExistingDataFound(true);
          const meta = session.user.user_metadata || {};
          setFormData(prev => ({
            ...prev,
            email: session.user.email || prev.email,
            fullName: meta.name || meta.full_name || prev.fullName,
          }));

          // Fetch profile table
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (prof) {
            setFormData(prev => ({
              ...prev,
              fullName: prof.name || prev.fullName,
              age: prof.age ? String(prof.age) : prev.age,
              gender: prof.gender || prev.gender,
              phone: prof.phone || prev.phone,
              bloodType: prof.blood_group || prev.bloodType,
              selectedAllergies: prof.allergies ? (Array.isArray(prof.allergies) ? prof.allergies : [prof.allergies]) : prev.selectedAllergies,
              selectedConditions: prof.chronic_conditions ? (Array.isArray(prof.chronic_conditions) ? prof.chronic_conditions : [prof.chronic_conditions]) : prev.selectedConditions,
            }));
          }
        }
      } catch {}
    };

    checkExistingProfile();
  }, [user]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const toggleAllergy = (allergy: string) => {
    if (allergy === 'No Known Allergies (NKDA)') {
      setFormData(prev => ({ ...prev, selectedAllergies: ['No Known Allergies (NKDA)'] }));
      return;
    }
    setFormData(prev => {
      const filtered = prev.selectedAllergies.filter(a => a !== 'No Known Allergies (NKDA)');
      const exists = filtered.includes(allergy);
      const updated = exists ? filtered.filter(a => a !== allergy) : [...filtered, allergy];
      return {
        ...prev,
        selectedAllergies: updated.length === 0 ? ['No Known Allergies (NKDA)'] : updated
      };
    });
  };

  const toggleCondition = (condition: string) => {
    if (condition === 'None') {
      setFormData(prev => ({ ...prev, selectedConditions: ['None'] }));
      return;
    }
    setFormData(prev => {
      const filtered = prev.selectedConditions.filter(c => c !== 'None');
      const exists = filtered.includes(condition);
      const updated = exists ? filtered.filter(c => c !== condition) : [...filtered, condition];
      return {
        ...prev,
        selectedConditions: updated.length === 0 ? ['None'] : updated
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsLoading(true);

    const allAllergies = [...formData.selectedAllergies];
    if (formData.allergiesText.trim() && !allAllergies.includes(formData.allergiesText.trim())) {
      allAllergies.push(formData.allergiesText.trim());
    }

    try {
      const result = await signUpWithEmail(formData.email, formData.password, formData.fullName);
      if (result.error) {
        setLocalError(result.error);
      } else {
        // Update local and database profile with full clinical & personal details
        updateUser({
          name: formData.fullName,
          email: formData.email,
          age: parseInt(formData.age, 10) || 28,
          gender: formData.gender,
          bloodType: formData.bloodType,
          phone: formData.phone || '+91 98765 43210',
          allergies: allAllergies,
          chronicConditions: formData.selectedConditions,
          emergencyContact: {
            name: formData.emergencyName || 'Emergency Contact',
            relationship: 'Primary Contact',
            phone: formData.emergencyPhone || '+91 98765 43211',
          }
        });
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
              Comprehensive Care,<br />from First Registration.
            </h2>
            <p className="text-teal-100 text-sm leading-relaxed mb-6">
              Connect your essential personal records, verified blood type, and allergy alerts for instant hospital emergency response and teleconsultations.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
                <span className="text-xs">Clinical Allergy & Emergency Passport Integration</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
                <span className="text-xs">Live Telemetry & Wearable Sync</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
                <span className="text-xs">Instant Emergency Contact & 108 Dispatch</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-teal-200/80">
            © 2026 CuraTrack Systems • ISO 27001 & ABDM Certified
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-surface-container-lowest dark:bg-slate-950 overflow-y-auto max-h-screen">
          <div className="w-full max-w-md flex flex-col py-6">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-primary dark:text-primary-fixed">CuraTrack</span>
            </div>

            <div className="mb-5 text-center lg:text-left">
              <h1 className="text-2xl font-bold text-on-surface">Patient Registration</h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Enter your initial personal details and allergies to set up your clinical health passport.
              </p>
            </div>

            {/* Existing Data Connected Notification */}
            {existingDataFound && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Existing health profile detected and pre-filled! Verify details below.</span>
              </div>
            )}

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
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 mb-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-on-surface hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <span className="text-xs">Connecting Google Health ID...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Initial Patient Information</span>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="fullName">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="e.g. Kavita Bai"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 pl-9 pr-3 text-xs text-on-surface outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="email">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="patient@curatrack.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 pl-9 pr-3 text-xs text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Age, Gender & Phone */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 px-3 text-xs text-on-surface outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 px-2 text-xs text-on-surface outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 px-3 text-xs text-on-surface outline-none"
                  />
                </div>
              </div>

              {/* Blood Group Selection */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Blood Group *
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, bloodType: type })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        formData.bloodType === type
                          ? 'bg-primary text-white shadow-xs ring-2 ring-primary/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Allergies Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-red-600 dark:text-red-400">
                    Known Patient Allergies (Critical Clinical Info) *
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_ALLERGIES.map((allergy) => {
                    const isSelected = formData.selectedAllergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => toggleAllergy(allergy)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Other allergy (e.g. Codeine, Egg protein...)"
                  value={formData.allergiesText}
                  onChange={(e) => setFormData({ ...formData, allergiesText: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-red-500 py-1.5 px-3 text-xs text-on-surface outline-none"
                />
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Pre-existing Conditions / Medical History
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CONDITIONS.map((cond) => {
                    const isSelected = formData.selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={formData.emergencyName}
                    onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 px-3 text-xs text-on-surface outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Emergency Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Contact Phone Number"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 px-3 text-xs text-on-surface outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="password">
                  Security Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Create password (min. 6 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary py-2 pl-9 pr-3 text-xs text-on-surface outline-none"
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
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <label htmlFor="terms" className="text-[11px] text-on-surface-variant">
                  I agree to healthcare data privacy &amp; ABDM consent rules.
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl py-3 px-4 shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Registering &amp; Connecting Profile...</span>
                ) : (
                  <>
                    <span>Complete Patient Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-on-surface-variant mt-4">
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
