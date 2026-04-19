'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/records', icon: 'folder_shared', label: 'Health Records' },
  { href: '/alerts', icon: 'notifications_active', label: 'Alerts' },
  { href: '/telemedicine', icon: 'video_chat', label: 'Telemedicine' },
  { href: '/benefits', icon: 'account_balance_wallet', label: 'Benefits & Insurance' },
  { href: '/profile', icon: 'person', label: 'Profile' }
];

export function SideNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(data);
    }
    fetchProfile();
  }, [supabase]);

  return (
    <aside className="hidden md:flex w-72 flex-col p-8 rounded-[2rem] my-4 ml-4 h-[calc(100vh-2rem)] bg-white border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] font-headline antialiased tracking-tight shrink-0 sticky top-4">
        <div className="flex flex-col gap-1 mb-10">
            <h1 className="text-2xl font-black tracking-tighter text-primary">CuraTrack</h1>
            <p className="text-[10px] text-tertiary uppercase tracking-[0.2em] font-bold">Clinical Care</p>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={twMerge(
                            clsx(
                                "flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all",
                                isActive 
                                    ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" 
                                    : "hover:bg-surface-container-low text-tertiary font-medium"
                            )
                        )}
                    >
                        <span 
                            className="material-symbols-outlined" 
                            style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                            {item.icon}
                        </span>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>

        <div className="mt-auto space-y-4">
            <button 
                onClick={async () => {
                    await fetch('/api/logout', { method: 'POST' });
                    router.push('/login');
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all hover:bg-error/5 text-error font-bold"
            >
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
            </button>

            <div className="pt-6 border-t border-outline-variant/20 flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {profile?.role === 'doctor' ? 'medical_services' : 'person'}
                    </span>
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">
                        {profile?.name || 'User'}
                    </p>
                    <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">
                        {profile?.role === 'doctor' ? 'Professional' : 'Patient Account'}
                    </p>
                </div>
            </div>
        </div>
    </aside>
  );
}
