'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  FileText, 
  Landmark, 
  User 
} from 'lucide-react';

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const [poppingIndex, setPoppingIndex] = useState<number | null>(null);
  const prevPathRef = useRef(pathname);

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/' || pathname === '/dashboard',
    },
    {
      label: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      isActive: pathname.startsWith('/appointments'),
    },
    {
      label: 'Records',
      href: '/records',
      icon: FileText,
      isActive: pathname.startsWith('/records'),
    },
    {
      label: 'Schemes',
      href: '/schemes',
      icon: Landmark,
      isActive: pathname.startsWith('/schemes'),
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: User,
      isActive: pathname.startsWith('/profile'),
    },
  ];

  // Trigger pop when the route changes
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      const activeIdx = navItems.findIndex((item) => item.isActive);
      if (activeIdx !== -1) {
        setPoppingIndex(activeIdx);
        const timer = setTimeout(() => setPoppingIndex(null), 400);
        return () => clearTimeout(timer);
      }
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Hidden on splash, welcome, login, register, emergency
  const hideNavRoutes = ['/splash', '/welcome', '/login', '/register', '/emergency'];
  if (hideNavRoutes.includes(pathname)) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[402px] z-40 rounded-full border transition-all duration-300 shadow-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.68)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        borderColor: 'rgba(255, 255, 255, 0.65)',
        boxShadow: '0 12px 36px -6px rgba(0, 80, 80, 0.18), 0 6px 18px rgba(0, 0, 0, 0.07), inset 0 1px 1.5px rgba(255, 255, 255, 0.9)',
      }}
    >
      <div className="px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isPopping = poppingIndex === idx;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded-2xl transition-all duration-200 ${
                item.isActive
                  ? 'text-primary dark:text-primary-fixed-dim'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  item.isActive
                    ? 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-fixed'
                    : 'bg-transparent text-slate-500'
                } ${isPopping ? 'nav-pop' : ''}`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium transition-all duration-200 ${
                  item.isActive ? 'font-bold text-primary dark:text-primary-fixed' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
