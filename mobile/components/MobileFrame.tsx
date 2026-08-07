"use client";

import React from 'react';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';

interface MobileFrameProps {
  children: React.ReactNode;
  headerTitle?: string;
  showBack?: boolean;
  hideNav?: boolean;
}

export default function MobileFrame({ children, headerTitle, showBack, hideNav }: MobileFrameProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center sm:py-6 sm:px-4">
      {/* Mobile Device Frame Container */}
      <div className="w-full max-w-[420px] h-screen sm:h-[844px] bg-[#f8f9ff] text-slate-900 rounded-none sm:rounded-[44px] sm:border-[8px] sm:border-slate-900 shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Top Header */}
        <TopHeader title={headerTitle} showBack={showBack} />

        {/* Scrollable Mobile Screen Content */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar bg-[#f8f9ff]">
          {children}
        </div>

        {/* Bottom Navigation */}
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
