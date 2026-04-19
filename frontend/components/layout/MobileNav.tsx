'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const MOBILE_NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Home' },
  { href: '/records', icon: 'folder_shared', label: 'Records' },
  { href: '/alerts', icon: 'notifications_active', label: 'Alerts' },
  { href: '/profile', icon: 'person', label: 'Profile' }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-2xl flex justify-around items-center h-16 px-4 z-50 rounded-t-3xl">
        {MOBILE_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={twMerge(
                        clsx(
                            "flex flex-col items-center gap-1",
                            isActive ? "text-blue-600" : "text-slate-400"
                        )
                    )}
                >
                    <span 
                        className="material-symbols-outlined !text-xl" 
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                        {item.icon}
                    </span>
                    <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
            );
        })}
    </nav>
  );
}
