'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

export default function AlertsPage() {
    const router = useRouter();
    const [healthNews, setHealthNews] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [healthRisks, setHealthRisks] = useState<any[]>([]);
    const [loadingRisks, setLoadingRisks] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/health-news`);
                const data = await res.json();
                setHealthNews(data.articles || []);
            } catch (err) {
                console.error("Failed to fetch health news", err);
            } finally {
                setLoadingNews(false);
            }
        };
        
        const fetchRisks = async () => {
             try {
                const res = await fetch(`${API_BASE}/api/health-risks`);
                const data = await res.json();
                setHealthRisks(data.risks || []);
             } catch (err) {
                 console.error("Failed to fetch health risks", err);
             } finally {
                 setLoadingRisks(false);
             }
        };

        fetchNews();
        fetchRisks();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* Page Header */}
            <div className="mb-10">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Health Alerts</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">4 New</span>
                </div>
                <p className="text-tertiary mt-2 text-lg">Track critical health activities and stay informed</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
                <button className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm shadow-md shadow-primary/20 transition-transform active:scale-95">All</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Medications</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Outbreaks</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Goals</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Appointments</button>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Alerts List */}
                <div className="lg:col-span-8 space-y-6">

                    {/* SEASONAL ALERT BLOCK */}
                    {healthRisks.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-start gap-4 shadow-sm">
                            <span className="text-3xl mt-1">🌧️</span>
                            <div>
                                <h4 className="font-bold text-amber-800 text-lg font-headline">Seasonal Health Alert</h4>
                                <p className="text-amber-700 text-sm mt-1">Increased risk of {healthRisks.filter(r => r.risk === 'HIGH').map(r => r.disease).join(', ') || 'seasonal illnesses'} in your area. Check local precautions.</p>
                            </div>
                        </div>
                    )}

                    {/* 1. MEDICATION TRACKER */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-amber-400 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <span className="material-symbols-outlined text-3xl">pill</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Missed Medication</h3>
                                    <span className="text-xs font-medium text-slate-400">1 hour ago</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">You missed your 8:00 AM dose of <span className="font-semibold text-on-surface">Lisinopril</span>. Timely dosage is critical for managing your blood pressure levels.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="px-5 py-2 rounded-xl bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200 transition-colors">Log Now</button>
                                    <button className="px-5 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-sm font-bold hover:bg-surface-container-high transition-colors">Remind Me</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. DISEASE OUTBREAK */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-red-500 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold font-headline text-on-surface">Dengue Alert in Your Area</h3>
                                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-tighter">High Priority</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400">30 mins ago</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">Increased dengue cases reported within <span className="font-semibold">5 km radius</span>. Please ensure there is no standing water around your premises.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button 
                                        className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                        onClick={() => router.push("/alerts/precautions?type=dengue")}
                                    >
                                        View Precautions
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. MISSED GOALS */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-sky-500 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                                <span className="material-symbols-outlined text-3xl">steps</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Daily Step Goal Not Met</h3>
                                    <span className="text-xs font-medium text-slate-400">2 hours ago</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">You reached only <span className="font-bold">4,200 / 8,000</span> steps today. A short 15-minute walk can help you bridge the gap!</p>
                                <div className="mb-6 bg-surface-container rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-sky-500 h-full rounded-full transition-all duration-1000" style={{ width: '52.5%' }}></div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button 
                                        className="px-5 py-2 rounded-xl bg-sky-100 text-sky-700 text-sm font-bold hover:bg-sky-200 transition-colors"
                                        onClick={() => router.push("/dashboard?section=steps")}
                                    >
                                        View Activity
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. MISSED APPOINTMENT */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-purple-500 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <span className="material-symbols-outlined text-3xl">calendar_today</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Missed Appointment</h3>
                                    <span className="text-xs font-medium text-slate-400">Yesterday</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">You missed your consultation with <span className="font-semibold">Dr. Sharma</span> at 10:30 AM. Missing regular check-ups can delay your recovery progress.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button 
                                        className="px-5 py-2 rounded-xl bg-purple-100 text-purple-700 text-sm font-bold hover:bg-purple-200 transition-colors"
                                        onClick={() => router.push("/telemedicine")}
                                    >
                                        Reschedule
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. HEALTH INSIGHTS SECTION */}
                <div className="lg:col-span-8 mt-12 pt-8 border-t border-surface-container">
                    <h3 className="text-2xl font-bold font-headline mb-6 text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">article</span>
                        Health Insights
                    </h3>
                    
                    {loadingNews ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse flex gap-4 bg-white p-4 rounded-3xl border border-surface-container">
                                    <div className="w-24 h-24 bg-surface-container rounded-2xl shrink-0"></div>
                                    <div className="flex-1 space-y-3 py-2">
                                        <div className="h-4 bg-surface-container rounded w-3/4"></div>
                                        <div className="h-3 bg-surface-container rounded w-full"></div>
                                        <div className="h-3 bg-surface-container rounded w-5/6"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : healthNews.length > 0 ? (
                        <div className="space-y-4">
                            {healthNews.map((article, idx) => (
                                <div key={idx} className="group relative bg-white p-4 rounded-3xl transition-all duration-300 hover:shadow-md border border-surface-container flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                                    <div className="w-full sm:w-32 h-40 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-surface-container-low">
                                        <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-on-surface mb-1 line-clamp-1">{article.title}</h4>
                                        <p className="text-sm text-tertiary mb-3 line-clamp-2">{article.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-400">
                                                {new Date(article.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            <button 
                                                className="text-primary text-sm font-bold hover:underline py-1 px-2 -mr-2 flex items-center gap-1"
                                                onClick={() => window.open(article.url, "_blank")}
                                            >
                                                Read More <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-surface-container-low rounded-3xl p-8 text-center text-tertiary">
                            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">news</span>
                            <p className="font-medium">No recent health news available at the moment.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Summary Panel */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
                        <h3 className="text-xl font-extrabold font-headline mb-6 text-on-surface">Alert Summary</h3>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="text-sm font-medium text-tertiary">Total Alerts</span>
                                </div>
                                <span className="text-2xl font-black font-headline text-on-surface">4</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-500">pill</span>
                                        <span className="text-sm font-medium">Missed Medications</span>
                                    </div>
                                    <span className="font-bold">1</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-sky-500">fitness_center</span>
                                        <span className="text-sm font-medium">Missed Goals</span>
                                    </div>
                                    <span className="font-bold">1</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-surface-container">
                                <h4 className="text-xs uppercase tracking-widest font-black text-slate-400 mb-4">Upcoming Actions</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border-l-4 border-primary">
                                        <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">Dr. Lee Follow-up</p>
                                            <p className="text-[10px] text-tertiary">Today, 2:30 PM</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border-l-4 border-amber-400">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-amber-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>medical_information</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">2pm Dose</p>
                                            <p className="text-[10px] text-tertiary">Lisinopril 10mg</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Risks API Block */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                        <h4 className="text-lg font-bold font-headline mb-4 px-2 tracking-tight">Health Risks in Your Area</h4>
                        {loadingRisks ? (
                            <div className="animate-pulse space-y-4 px-2">
                                <div className="h-12 bg-surface-container rounded-2xl w-full"></div>
                                <div className="h-12 bg-surface-container rounded-2xl w-full"></div>
                            </div>
                        ) : healthRisks.length > 0 ? (
                            <div className="space-y-3">
                                {healthRisks.map((risk, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-surface-container hover:bg-surface-container-low transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                risk.risk === 'HIGH' ? 'bg-red-50 text-red-600' :
                                                risk.risk === 'MODERATE' ? 'bg-amber-50 text-amber-600' :
                                                'bg-green-50 text-green-600'
                                            }`}>
                                                <span className="material-symbols-outlined text-lg">{risk.icon}</span>
                                            </div>
                                            <span className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors">{risk.disease}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                                            risk.risk === 'HIGH' ? 'bg-red-100 text-red-700' :
                                            risk.risk === 'MODERATE' ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {risk.risk}
                                        </span>
                                    </div>
                                ))}
                                <button 
                                    className="w-full mt-2 px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-bold hover:bg-surface-container-highest transition-colors flex justify-center items-center gap-2"
                                    onClick={() => router.push("/alerts/precautions?type=dengue")}
                                >
                                    <span className="material-symbols-outlined text-sm text-tertiary">health_and_safety</span>
                                    View Precautions
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-tertiary px-2">No regional health risks identified at this time.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
