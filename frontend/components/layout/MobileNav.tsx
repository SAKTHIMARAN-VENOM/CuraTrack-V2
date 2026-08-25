'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useI18n } from '@/lib/i18n';

const MOBILE_NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', i18nKey: 'navigation.dashboard', label: 'Home' },
  { href: '/records', icon: 'folder_shared', i18nKey: 'navigation.records', label: 'Records' },
  { href: '/alerts', icon: 'notifications_active', i18nKey: 'navigation.alerts', label: 'Alerts' },
  { href: '/profile', icon: 'person', i18nKey: 'navigation.profile', label: 'Profile' }
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-2xl flex justify-around items-center h-16 px-4 z-50 rounded-t-3xl border-t border-surface-container-high">
        {MOBILE_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={twMerge(
                        clsx(
                            "flex flex-col items-center gap-1",
                            isActive ? "text-primary font-bold" : "text-slate-400"
                        )
                    )}
                >
                    <span 
                        className="material-symbols-outlined !text-xl" 
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                        {item.icon}
                    </span>
                    <span className="text-[10px] font-bold">{t(item.i18nKey, item.label)}</span>
                </Link>
            );
        })}
    </nav>
  );
}
