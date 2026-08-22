"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string>("Connecting your account to CuraTrack...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error_description') || searchParams.get('error');

        if (error) {
          console.error("Supabase Auth callback error:", error);
          setErrorMsg(error);
          setStatusMessage("Authentication failed. Redirecting to login...");
          setTimeout(() => router.push('/login'), 2500);
          return;
        }

        if (code) {
          setStatusMessage("Exchanging code for session...");
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.error("Error exchanging auth code for session:", exchangeErr.message);
            setErrorMsg(exchangeErr.message);
            setStatusMessage("Session exchange failed. Redirecting...");
            setTimeout(() => router.push('/login'), 2500);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatusMessage("Successfully authenticated! Redirecting to Dashboard...");
          router.push('/');
        } else {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          if (hashParams.get('access_token')) {
            setStatusMessage("Token parsed! Redirecting to Dashboard...");
            router.push('/');
          } else {
            setStatusMessage("Redirecting to Dashboard...");
            router.push('/');
          }
        }
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        router.push('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-6 bg-surface-container-lowest dark:bg-slate-950 text-center">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Completing Sign In</h2>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
            {errorMsg ? `Notice: ${errorMsg}` : statusMessage}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Clinical Authentication</span>
        </div>
      </div>
    </div>
  );
}
