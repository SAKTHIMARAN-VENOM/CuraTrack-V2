'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  ArrowLeft, 
  Bell, 
  AlertTriangle, 
  PhoneCall, 
  MoreVertical 
} from 'lucide-react';

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  showEmergency?: boolean;
  showNotifications?: boolean;
  customAction?: React.ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  showBack,
  showEmergency = true,
  showNotifications = true,
  customAction,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, notifications } = useApp();

  const isHome = pathname === '/' || pathname === '/dashboard';
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 w-full z-40 bg-gradient-to-r from-[#005f5f] via-[#006e6e] to-[#005252] text-white shadow-md border-b border-teal-700/60 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          {showBack || !isHome ? (
            <Link
              href="/"
              className="p-2 -ml-2 rounded-full text-white hover:bg-white/15 active:scale-95 transition-transform"
              aria-label="Back to Dashboard"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
          ) : null}

          {isHome ? (
            <Link href="/profile" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/40 group-hover:ring-white transition-all shadow-sm">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-teal-200 uppercase tracking-widest leading-tight">CuraTrack</span>
                <span className="text-sm font-bold text-white leading-tight">{user.name}</span>
              </div>
            </Link>
          ) : (
            <h1 className="text-lg font-bold text-white truncate">
              {title || 'CuraTrack'}
            </h1>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Notifications */}
          {showNotifications && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-full text-teal-100 hover:bg-white/15 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          )}

          {/* Emergency SOS Shortcut */}
          {showEmergency && (
            <Link
              href="/emergency"
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm border border-red-400/40"
              title="Emergency SOS"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">SOS</span>
            </Link>
          )}

          {customAction}
        </div>
      </div>
    </header>
  );
};
