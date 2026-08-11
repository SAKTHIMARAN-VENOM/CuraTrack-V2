"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: 'home' },
    { href: '/appointments', label: 'Appointments', icon: 'calendar_month' },
    { href: '/schemes', label: 'Schemes', icon: 'account_balance_wallet' },
    { href: '/vitals', label: 'Vitals', icon: 'monitoring' },
    { href: '/profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <div className="bg-white border-t border-slate-200 py-2 px-4 flex items-center justify-around shrink-0 select-none shadow-sm">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 transition-all ${
              isActive
                ? 'text-[#008080]'
                : 'text-slate-400 hover:text-[#008080]'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {item.icon}
            </span>
            <span className={`text-[10px] ${isActive ? 'font-extrabold' : 'font-bold'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
