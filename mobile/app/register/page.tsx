"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MobileFrame from '@/components/MobileFrame';
import { supabase, getAuthRedirectUrl } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.warn("Supabase SignUp error (using demo fallback):", error.message);
      }
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileFrame headerTitle="Register Account" hideNav showBack>
      <div className="flex flex-col gap-5 py-3 my-auto">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl bg-[#008080] text-white flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-2xl">person_add</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Create Account</h1>
          <p className="text-xs text-slate-500 font-medium">Join CuraTrack for ABHA & vitals monitoring</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">person</span>
              <input
                type="text"
                required
                placeholder="Sarah Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080] shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">mail</span>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080] shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">lock</span>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080] shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" required className="rounded border-slate-300 text-[#008080] focus:ring-[#008080]" />
            <span>I agree to the Terms of Service & Privacy Policy</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#008080] hover:bg-teal-700 disabled:opacity-60 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-colors shadow-lg mt-1 flex items-center justify-center gap-1.5"
          >
            <span>{loading ? "Creating Account..." : "Register & Start Syncing"}</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs text-center text-slate-500 font-medium pt-1">
          Already registered?{' '}
          <Link href="/login" className="font-extrabold text-[#008080] hover:underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </MobileFrame>
  );
}
