"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MobileFrame from '@/components/MobileFrame';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string>("Connecting your account to CuraTrack...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse search params and hash fragment
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

        // Verify session state
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatusMessage("Successfully authenticated! Redirecting to Dashboard...");
          router.push('/dashboard');
        } else {
          // If no session found yet, wait briefly or check hash fragment
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          if (hashParams.get('access_token')) {
            setStatusMessage("Token parsed! Redirecting to Dashboard...");
            router.push('/dashboard');
          } else {
            setStatusMessage("Redirecting to Dashboard...");
            router.push('/dashboard');
          }
        }
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        router.push('/dashboard');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <MobileFrame headerTitle="Authenticating" hideNav showBack={false}>
      <div className="flex flex-col items-center justify-center my-auto py-12 text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#008080]/10 text-[#008080] flex items-center justify-center animate-pulse shadow-md">
          <span className="material-symbols-outlined text-3xl">sync</span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0b1c30]">Completing Sign In</h2>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs">
            {errorMsg ? `Notice: ${errorMsg}` : statusMessage}
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
