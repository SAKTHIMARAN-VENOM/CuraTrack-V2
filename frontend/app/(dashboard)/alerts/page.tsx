'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function AlertsPage() {
    const router = useRouter();
    const [healthNews, setHealthNews] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [healthRisks, setHealthRisks] = useState<any[]>([]);
    const [loadingRisks, setLoadingRisks] = useState(true);
    const [activityData, setActivityData] = useState<any>(null);
    const [loadingActivity, setLoadingActivity] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const data = await apiFetch('/api/health-news');
                setHealthNews(data.articles || []);
            } catch (err) {
                console.error("Failed to fetch health news", err);
            } finally {
                setLoadingNews(false);
            }
        };
        
        const fetchRisks = async () => {
             try {
                const data = await apiFetch('/api/health-risks');
                setHealthRisks(data.risks || []);
             } catch (err) {
                 console.error("Failed to fetch health risks", err);
             } finally {
                 setLoadingRisks(false);
             }
        };

        const fetchActivity = async () => {
             try {
                const data = await apiFetch('/api/fit-data');
                setActivityData(data);
             } catch (err) {
                 console.error("Failed to fetch activity data", err);
             } finally {
                 setLoadingActivity(false);
             }
        };

        fetchNews();
        fetchRisks();
        fetchActivity();
    }, []);

    const [reminderSet, setReminderSet] = useState(false);

    const activeAlertsCount = (healthRisks ? healthRisks.length : 0) + (activityData && activityData.steps < activityData.goal && activityData.steps > 0 ? 1 : 0);

    const handleRemindMe = () => {
        setReminderSet(true);
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Medication Reminder Set", { body: "You will be reminded for your upcoming medication dose." });
        } else if ("Notification" in window && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Medication Reminder Set", { body: "You will be reminded for your upcoming medication dose." });
                }
            });
        }
        alert("⏰ Reminder set! We will notify you for your upcoming medication dose.");
    };

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* Page Header */}
            <div className="mb-10">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Health Alerts</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">
                        {activeAlertsCount} {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}
                    </span>
                </div>
                <p className="text-tertiary mt-2 text-lg">Track critical health activities and stay informed</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
                {[ 'All', 'Medications', 'Outbreaks', 'Goals', 'Appointments' ].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveFilter(tab)}
                        className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 ${
                            activeFilter === tab
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
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

                    {/* DYNAMIC ALERTS LIST */}
                    {(() => {
                        const dynamicAlerts = [];
                        
                        // Check step goal alert
                        if (activityData && activityData.steps < activityData.goal && activityData.steps > 0) {
                            dynamicAlerts.push({
                                category: 'Goals',
                                title: 'Daily Step Goal Progress',
                                description: `You reached ${activityData.steps.toLocaleString()} / ${activityData.goal.toLocaleString()} steps today.`,
                                time: activityData.lastUpdated || 'Today',
                                color: 'sky',
                                icon: 'directions_walk',
                                actionText: 'View Activity',
                                action: () => router.push('/dashboard')
                            });
                        }

                        // Check health risks alerts
                        if (healthRisks && healthRisks.length > 0) {
                            healthRisks.forEach((risk: any) => {
                                dynamicAlerts.push({
                                    category: 'Outbreaks',
                                    title: `${risk.disease} Precautionary Alert`,
                                    description: `Active regional alert level: ${risk.risk}. Review precautionary measures for ${risk.disease}.`,
                                    time: 'Active',
                                    color: 'amber',
                                    icon: risk.icon || 'warning',
                                    actionText: 'View Guidelines',
                                    action: () => window.open('https://www.who.int', '_blank')
                                });
                            });
                        }

                        const filtered = activeFilter === 'All' 
                            ? dynamicAlerts 
                            : dynamicAlerts.filter(a => a.category === activeFilter);

                        if (filtered.length === 0) {
                            return (
                                <div className="bg-white p-12 rounded-3xl text-center text-tertiary border border-surface-container shadow-sm">
                                    <span className="material-symbols-outlined text-5xl mb-3 text-secondary/60">notifications_off</span>
                                    <h3 className="font-headline font-bold text-lg text-on-surface">No Active Health Alerts</h3>
                                    <p className="text-sm text-tertiary mt-1">You are all caught up! High priority health alerts, missed doses, and notifications will appear here when triggered.</p>
                                </div>
                            );
                        }

                        return filtered.map((alertItem, idx) => (
                            <div key={idx} className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                                <div className={`absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-${alertItem.color}-500 rounded-r-full`}></div>
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className={`w-14 h-14 shrink-0 rounded-2xl bg-${alertItem.color}-50 flex items-center justify-center text-${alertItem.color}-600`}>
                                        <span className="material-symbols-outlined text-3xl">{alertItem.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-xl font-bold font-headline text-on-surface">{alertItem.title}</h3>
                                            <span className="text-xs font-medium text-slate-400">{alertItem.time}</span>
                                        </div>
                                        <p className="text-on-surface-variant text-sm leading-relaxed mb-6">{alertItem.description}</p>
                                        <div className="flex flex-wrap gap-3">
                                            <button 
                                                onClick={alertItem.action}
                                                className={`px-5 py-2 rounded-xl bg-${alertItem.color}-100 text-${alertItem.color}-700 text-sm font-bold hover:bg-${alertItem.color}-200 transition-colors`}
                                            >
                                                {alertItem.actionText}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>

                {/* Right Column: Summary Panel + Health Risks */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
                        <h3 className="text-xl font-extrabold font-headline mb-6 text-on-surface">Alert Summary</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="text-sm font-medium text-tertiary">Active Alerts</span>
                                </div>
                                <span className="text-2xl font-black font-headline text-on-surface">{healthRisks.length}</span>
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
                            </div>
                        ) : (
                            <p className="text-sm text-tertiary px-2">No regional health risks identified at this time.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Health News Section */}
            <div className="mt-12 pt-8 border-t border-surface-container">
                <h3 className="text-2xl font-bold font-headline mb-6 text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">article</span>
                    Health News
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
                                        <span suppressHydrationWarning className="text-xs font-semibold text-slate-400">
                                            {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
        </div>
    );
}
