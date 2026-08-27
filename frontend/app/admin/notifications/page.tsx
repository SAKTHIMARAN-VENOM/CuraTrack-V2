'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function AdminNotificationCenterPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/notifications`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.warn('Fetch notifications warning:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await fetch(`${API_BASE}/api/admin/notifications/${id}/read`, { method: 'POST' });
        } catch {}
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        Administrator Notification Center
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Real-time alerts on doctor approvals, ASHA onboarding, outbreak spikes, and facility bed capacity
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-surface-container transition-colors cursor-pointer font-headline"
                        >
                            Mark All as Read
                        </button>
                    )}
                </div>
            </div>

            {/* Notification List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container-low font-headline">
                    <h2 className="text-sm font-bold text-on-surface">Incoming System Notifications</h2>
                    <span className="text-xs font-bold text-primary">{unreadCount} Unread Alerts</span>
                </div>

                <div className="space-y-3 font-sans">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                                notif.read ? 'bg-surface-container-low/60 border-surface-container opacity-80' : 'bg-white border-primary/30 shadow-sm ring-1 ring-primary/10'
                            }`}
                        >
                            <div className="flex items-start gap-3.5">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                                    notif.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                                    notif.priority === 'HIGH' ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'
                                }`}>
                                    <span className="material-symbols-outlined text-xl">
                                        {notif.type === 'DISEASE_OUTBREAK' ? 'crisis_alert' :
                                         notif.type === 'EMERGENCY_REFERRAL' ? 'alt_route' :
                                         notif.type === 'WORKER_VERIFICATION' || notif.type === 'ASHA_VERIFICATION' ? 'verified_user' : 'notifications'}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-on-surface font-headline">{notif.title}</h3>
                                        {!notif.read && (
                                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        )}
                                    </div>
                                    <p className="text-xs text-tertiary leading-relaxed font-medium">{notif.message}</p>
                                    <span className="text-[10px] text-tertiary font-medium block">{notif.time}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-headline">
                                {notif.link && (
                                    <Link
                                        href={notif.link}
                                        onClick={() => markAsRead(notif.id)}
                                        className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-colors"
                                    >
                                        View
                                    </Link>
                                )}
                                {!notif.read && (
                                    <button
                                        onClick={() => markAsRead(notif.id)}
                                        className="p-1.5 text-tertiary hover:text-on-surface"
                                        title="Mark read"
                                    >
                                        <span className="material-symbols-outlined text-sm">done</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
