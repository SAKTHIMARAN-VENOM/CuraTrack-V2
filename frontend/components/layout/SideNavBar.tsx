'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  return (
    <aside className="hidden md:flex w-72 flex-col p-6 rounded-r-3xl my-4 ml-4 h-[calc(100vh-2rem)] bg-slate-50 shadow-sm font-headline antialiased tracking-tight shrink-0 sticky top-4">
        <div className="flex flex-col gap-1 mb-10">
            <h1 className="text-2xl font-bold tracking-tighter text-blue-700">CuraTrack</h1>
            <p className="text-xs text-tertiary uppercase tracking-widest font-semibold">Empathetic Precision</p>
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
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all scale-95",
                                isActive 
                                    ? "bg-white text-blue-700 font-bold shadow-sm" 
                                    : "hover:bg-slate-200/50 text-slate-500 font-medium"
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
                    window.location.href = '/login';
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all scale-95 hover:bg-red-50 text-red-600 font-bold"
            >
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
            </button>

            <div className="pt-6 border-t border-slate-200 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-surface-container flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <div>
                    <p className="text-sm font-bold text-on-surface">Dr. Sarah Chen</p>
                    <p className="text-xs text-tertiary">Primary Care</p>
                </div>
            </div>
        </div>
    </aside>
  );
}
