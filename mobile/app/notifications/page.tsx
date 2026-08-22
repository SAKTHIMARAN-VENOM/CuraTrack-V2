'use client';

import React from 'react';
import Link from 'next/link';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { 
  Bell, 
  Calendar, 
  Pill, 
  FileText, 
  AlertCircle, 
  Check, 
  Trash2, 
  CheckCheck,
  ChevronRight
} from 'lucide-react';

export default function NotificationsPage() {
  const { 
    notifications, 
    markNotificationRead, 
    dismissNotification, 
    markAllNotificationsRead 
  } = useApp();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="w-5 h-5 text-primary" />;
      case 'medication':
        return <Pill className="w-5 h-5 text-teal-600" />;
      case 'record':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Notifications" showBack={true} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Header & Mark All Read */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">Notifications</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Stay informed about appointments, medication reminders & clinical logs
            </p>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <Bell className="w-10 h-10 text-slate-400 mb-2" />
            <h3 className="text-base font-bold text-on-surface">All Caught Up!</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              You don&apos;t have any new or pending alerts right now.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 shadow-card ${
                  !n.read
                    ? 'bg-white dark:bg-slate-900 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-surface-container-low dark:bg-slate-800 rounded-2xl shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs sm:text-sm font-bold ${!n.read ? 'text-on-surface' : 'text-slate-600 dark:text-slate-300'}`}>
                        {n.title}
                      </h3>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">
                      {n.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(n.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/30 rounded-xl transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
