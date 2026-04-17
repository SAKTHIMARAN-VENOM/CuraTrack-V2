'use client';

import { useEffect, useState } from 'react';
import { HeartRateChart } from '@/components/HeartRateChart';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch session info
        fetch('/api/auth-status')
            .then(r => r.json())
            .then(d => { if (d.isAuthenticated) setUser(d.user); });

        // Fetch fit data (will 401 for email-only users without Google tokens)
        const fetchFitData = async () => {
            try {
                const response = await fetch('/api/fit-data');
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
                // If 401 for email-only users, that's fine — just no Fit data
            } catch (err) {
                // Silently handle — Fit data is optional for email auth users
            } finally {
                setLoading(false);
            }
        };

        fetchFitData();
    }, [router]);

    const userName = user?.name?.split(' ')[0] || 'there';

    const latestBpm = data?.heartRateData && data.heartRateData.length > 0 
        ? data.heartRateData[data.heartRateData.length - 1].bpm 
        : '--';

    const steps = data?.steps || 0;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
                    <p className="text-tertiary font-bold">Syncing vitals...</p>
                </div>
            </div>
        );
    }

    return (
        <section className="p-8 flex flex-col gap-8">
            {/* Hero Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Welcome back, {userName}</h2>
                    <p className="text-tertiary mt-1">Your health overview for today</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white text-on-surface font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined !text-lg">download</span>
                        Export Report
                    </button>
                    <button className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-2xl shadow-md hover:opacity-90 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined !text-lg">add_circle</span>
                        New Reading
                    </button>
                </div>
            </div>

            {/* Bento Grid Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Heart Rate */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-error/10 rounded-2xl text-error">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </div>
                        <span className="text-xs font-bold text-error bg-error/10 px-2 py-1 rounded-lg">Live</span>
                    </div>
                    <div>
                        <p className="text-tertiary text-sm font-medium">Heart Rate</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-on-surface">{latestBpm}</h3>
                            <span className="text-tertiary text-sm">bpm</span>
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                    <div className="p-3 bg-secondary/10 rounded-2xl text-secondary self-start">
                        <span className="material-symbols-outlined">steps</span>
                    </div>
                    <div>
                        <p className="text-tertiary text-sm font-medium">Daily Steps</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-on-surface">{steps.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-secondary h-full rounded-full transition-all" style={{ width: `${Math.min((steps / 10000) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-tertiary font-bold tracking-wider uppercase">{(Math.min((steps / 10000) * 100, 100)).toFixed(0)}% of 10,000 goal</p>
                </div>

                {/* Sleep */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary self-start">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
                    </div>
                    <div>
                        <p className="text-tertiary text-sm font-medium">Sleep Trend</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-on-surface">{data?.sleep?.formatted || '--'}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-secondary text-sm font-bold">
                        <span className="material-symbols-outlined !text-sm">trending_up</span>
                        <span>Sync Active</span>
                    </div>
                </div>

                {/* Medications */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-tertiary text-sm font-bold tracking-wider uppercase">Next Dose</p>
                        <h3 className="text-xl font-extrabold text-on-surface">Lisinopril</h3>
                        <p className="text-primary text-sm font-semibold">10mg • 09:00 AM</p>
                    </div>
                    <button className="mt-4 w-full py-2.5 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container-highest transition-colors">
                        Mark as Taken
                    </button>
                </div>
            </div>

            {/* Chart & Alerts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vitals Chart Card */}
                <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-8 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-extrabold text-on-surface">Heart Rate Trend</h3>
                            <p className="text-sm text-tertiary">Real-time data from CoveIoT wearable</p>
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-xl">
                            <button className="px-4 py-1.5 text-xs font-bold bg-white shadow-sm rounded-lg text-primary">Day</button>
                            <button className="px-4 py-1.5 text-xs font-bold text-tertiary">Week</button>
                        </div>
                    </div>
                    <HeartRateChart data={data?.heartRateData || []} />
                </div>

                {/* Recent Alerts */}
                <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-extrabold text-on-surface">Recent Alerts</h3>
                        <span className="text-xs font-bold text-primary cursor-pointer hover:underline">View All</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-low">
                            <div className="h-10 w-10 shrink-0 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-on-surface">Lab Results Ready</p>
                                <p className="text-xs text-tertiary mt-0.5">Metabolic panel from 05/20 is now available for review.</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">2 HOURS AGO</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-2xl border border-dashed border-outline-variant">
                            <div className="h-10 w-10 shrink-0 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                                <span className="material-symbols-outlined">calendar_today</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-on-surface">Follow-up Reminder</p>
                                <p className="text-xs text-tertiary mt-0.5">Dr. Chen requested a check-in regarding your medication.</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">1 DAY AGO</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div>
                <h3 className="text-lg font-extrabold text-on-surface mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <button onClick={() => router.push('/telemedicine')} className="group p-6 bg-surface-container-lowest rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4 text-left border-b-4 border-transparent hover:border-primary">
                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">video_chat</span>
                        </div>
                        <div>
                            <p className="font-extrabold text-on-surface">Consult Doctor</p>
                            <p className="text-xs text-tertiary">Available in 15 mins</p>
                        </div>
                    </button>
                    <button onClick={() => router.push('/profile')} className="group p-6 bg-surface-container-lowest rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4 text-left border-b-4 border-transparent hover:border-secondary">
                        <div className="h-12 w-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">qr_code_2</span>
                        </div>
                        <div>
                            <p className="font-extrabold text-on-surface">View QR ID</p>
                            <p className="text-xs text-tertiary">Express check-in code</p>
                        </div>
                    </button>
                    <button onClick={() => router.push('/benefits')} className="group p-6 bg-surface-container-lowest rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4 text-left border-b-4 border-transparent hover:border-tertiary">
                        <div className="h-12 w-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="font-extrabold text-on-surface">Benefits & Schemes</p>
                            <p className="text-xs text-tertiary">AI-matched coverage</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Bottom Spacing */}
            <footer className="mt-auto">
                <div className="bg-surface-container-low p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-tertiary font-medium">© 2026 CuraTrack. Secure HIPAA Compliant Health Monitoring.</p>
                    <div className="flex gap-6">
                        <a className="text-xs text-tertiary hover:text-primary font-bold" href="#">Privacy Policy</a>
                        <a className="text-xs text-tertiary hover:text-primary font-bold" href="#">Support</a>
                        <a className="text-xs text-tertiary hover:text-primary font-bold" href="#">Help Center</a>
                    </div>
                </div>
            </footer>
        </section>
    );
}
