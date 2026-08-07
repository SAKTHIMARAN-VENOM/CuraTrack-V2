"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: 'home' },
    { href: '/appointments', label: 'Doctors', icon: 'calendar_month' },
    { href: '/drug-checker', label: 'Meds Check', icon: 'medication' },
    { href: '/records', label: 'Records', icon: 'folder_shared' },
    { href: '/schemes', label: 'Schemes', icon: 'account_balance_wallet' },
    { href: '/profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <div className="bg-white px-2 py-2 border-t border-slate-200 flex items-center justify-around shrink-0 select-none shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all ${
              isActive
                ? 'text-[#008080] font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <span className={`material-symbols-outlined text-lg ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[9px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
