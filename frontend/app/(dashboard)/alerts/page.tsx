'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { offlineStorage } from '@/lib/offline-storage';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AlertsPage() {
    const router = useRouter();
    const [healthNews, setHealthNews] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    
    // Automatic month-based seasonal outbreak state
    const currentMonthNum = new Date().getMonth() + 1;
    const currentMonthName = MONTH_NAMES[currentMonthNum - 1];
    
    const [healthRisks, setHealthRisks] = useState<any[]>([]);
    const [seasonInfo, setSeasonInfo] = useState<{ season?: string; month_name?: string }>({});
    const [loadingRisks, setLoadingRisks] = useState(true);
    
    const [activityData, setActivityData] = useState<any>(null);
    const [loadingActivity, setLoadingActivity] = useState(true);

    useEffect(() => {
        // Hydrate from offline storage first
        const cachedRisks = offlineStorage.getHealthRisks();
        if (cachedRisks) {
            setHealthRisks(cachedRisks.risks || []);
            setSeasonInfo({ season: cachedRisks.season, month_name: cachedRisks.month_name });
            setLoadingRisks(false);
        }

        const cachedNews = offlineStorage.getHealthNews();
        if (cachedNews && cachedNews.length > 0) {
            setHealthNews(cachedNews);
            setLoadingNews(false);
        }

        const cachedFit = offlineStorage.getFitData();
        if (cachedFit) {
            setActivityData(cachedFit);
            setLoadingActivity(false);
        }

        if (!offlineStorage.isOnline()) {
            setIsOffline(true);
        }

        const fetchNews = async () => {
            try {
                const data = await apiFetch('/api/health-news');
                if (data.articles) {
                    setHealthNews(data.articles);
                    offlineStorage.saveHealthNews(data.articles);
                }
            } catch (err) {
                console.error("Failed to fetch health news", err);
                const cached = offlineStorage.getHealthNews();
                if (cached) setHealthNews(cached);
                setIsOffline(true);
            } finally {
                setLoadingNews(false);
            }
        };

        const fetchActivity = async () => {
             try {
                const data = await apiFetch('/api/fit-data');
                setActivityData(data);
                offlineStorage.saveFitData(data);
             } catch (err) {
                 console.error("Failed to fetch activity data", err);
                 const cached = offlineStorage.getFitData();
                 if (cached) setActivityData(cached);
                 setIsOffline(true);
             } finally {
                 setLoadingActivity(false);
             }
        };

        // Fetch seasonal disease outbreaks based on current month
        const fetchRisks = async () => {
             try {
                const data = await apiFetch('/api/health-risks');
                setHealthRisks(data.risks || []);
                setSeasonInfo({ season: data.season, month_name: data.month_name });
                offlineStorage.saveHealthRisks(data);
             } catch (err) {
                 console.error("Failed to fetch seasonal health risks", err);
                 const cached = offlineStorage.getHealthRisks();
                 if (cached) {
                     setHealthRisks(cached.risks || []);
                     setSeasonInfo({ season: cached.season, month_name: cached.month_name });
                 }
                 setIsOffline(true);
             } finally {
                 setLoadingRisks(false);
             }
        };

        fetchNews();
        fetchActivity();
        fetchRisks();

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const activeAlertsCount = (healthRisks ? healthRisks.length : 0) + (activityData && activityData.steps < activityData.goal && activityData.steps > 0 ? 1 : 0);

    return (
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
            {isOffline && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
                    <span className="material-symbols-outlined text-amber-600">wifi_off</span>
                    <span>Offline Mode • Displaying cached seasonal disease outbreak alerts and health risks</span>
                </div>
            )}
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-amber-700">calendar_month</span>
                            {currentMonthName} Seasonal Alerts ({seasonInfo.season || 'Active Season'})
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">
                            {activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}
                        </span>
                    </div>
                    <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Seasonal Health Alerts</h2>
                    <p className="text-tertiary mt-1 text-base">Regional disease outbreak forecasts and health precautions for {currentMonthName}</p>
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Alerts List */}
                <div className="lg:col-span-8 space-y-6">

                    {/* SEASONAL OUTBREAK BANNER */}
                    {healthRisks.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200/80 p-6 rounded-3xl flex items-start gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 text-2xl font-bold">
                                🌧️
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-amber-900 text-lg font-headline">
                                        {currentMonthName} Seasonal Disease Outbreak Alert ({seasonInfo.season})
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">ACTIVE MONTH</span>
                                </div>
                                <p className="text-amber-800 text-sm mt-1 leading-relaxed">
                                    Increased seasonal risk of <span className="font-bold">{healthRisks.map(r => r.disease).join(', ')}</span> detected for {currentMonthName}. Review active precautionary measures below.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* DYNAMIC ALERTS LIST */}
                    {(() => {
                        const dynamicAlerts: any[] = [];

                        // Check health risks alerts for current month
                        if (healthRisks && healthRisks.length > 0) {
                            healthRisks.forEach((risk: any) => {
                                dynamicAlerts.push({
                                    category: 'Outbreaks',
                                    title: `${risk.disease}`,
                                    subtitle: `${risk.month} Seasonal Outbreak · ${risk.urgency || 'Precaution'}`,
                                    description: risk.advisory || `Active seasonal disease alert level: ${risk.risk}.`,
                                    symptoms: risk.symptoms,
                                    precautions: risk.precautions,
                                    riskLevel: risk.risk,
                                    time: `${risk.month} Outbreak Watch`,
                                    color: risk.risk === 'HIGH' ? 'red' : 'amber',
                                    icon: risk.icon || 'bug_report',
                                    actionText: 'WHO Guidelines',
                                    action: () => {
                                        const targetUrl = (risk.who_url && !risk.who_url.includes('/diseases/en/'))
                                            ? risk.who_url 
                                            : 'https://www.who.int/emergencies/disease-outbreak-news';
                                        window.open(targetUrl, '_blank');
                                    }
                                });
                            });
                        }
                        
                        // Check step goal alert
                        if (activityData && activityData.steps < activityData.goal && activityData.steps > 0) {
                            dynamicAlerts.push({
                                category: 'Goals',
                                title: 'Daily Step Goal Progress',
                                subtitle: 'Physical Activity Tracking',
                                description: `You reached ${activityData.steps.toLocaleString()} / ${activityData.goal.toLocaleString()} steps today.`,
                                time: activityData.lastUpdated || 'Today',
                                color: 'sky',
                                icon: 'directions_walk',
                                actionText: 'View Activity',
                                action: () => router.push('/dashboard')
                            });
                        }

                        if (loadingRisks) {
                            return (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="animate-pulse bg-white p-6 rounded-3xl border border-surface-container h-40"></div>
                                    ))}
                                </div>
                            );
                        }

                        if (dynamicAlerts.length === 0) {
                            return (
                                <div className="bg-white p-12 rounded-3xl text-center text-tertiary border border-surface-container shadow-sm space-y-3">
                                    <span className="material-symbols-outlined text-5xl text-secondary/60">notifications_off</span>
                                    <h3 className="font-headline font-bold text-lg text-on-surface">No Outbreak Alerts for {currentMonthName}</h3>
                                    <p className="text-sm text-tertiary">All seasonal health risk metrics are within normal parameters.</p>
                                </div>
                            );
                        }

                        return dynamicAlerts.map((alertItem, idx) => (
                            <div key={idx} className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-2px] shadow-sm border border-surface-container space-y-4">
                                <div className="flex flex-col sm:flex-row gap-5 items-start">
                                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${
                                        alertItem.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        <span className="material-symbols-outlined text-3xl">{alertItem.icon}</span>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap justify-between items-start gap-2">
                                            <div>
                                                <h3 className="text-xl font-bold font-headline text-on-surface">{alertItem.title}</h3>
                                                <p className="text-xs font-bold text-tertiary">{alertItem.subtitle}</p>
                                            </div>
                                            {alertItem.riskLevel && (
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase ${
                                                    alertItem.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {alertItem.riskLevel} RISK
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-on-surface-variant text-sm leading-relaxed">{alertItem.description}</p>

                                        {/* Symptoms & Precautions box */}
                                        {alertItem.symptoms && (
                                            <div className="p-4 bg-surface-container-low rounded-2xl space-y-2 border border-surface-container text-xs">
                                                <div>
                                                    <span className="font-bold text-error uppercase tracking-wider text-[10px] block mb-0.5">Key Symptoms:</span>
                                                    <p className="text-on-surface font-medium">{alertItem.symptoms}</p>
                                                </div>
                                                {alertItem.precautions && (
                                                    <div>
                                                        <span className="font-bold text-primary uppercase tracking-wider text-[10px] block mb-0.5">Recommended Precautions:</span>
                                                        <p className="text-on-surface font-medium">{alertItem.precautions}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-2 flex items-center justify-between">
                                            <button 
                                                onClick={alertItem.action}
                                                className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-base">verified</span>
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
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container space-y-4">
                        <h3 className="text-lg font-extrabold font-headline text-on-surface">Outbreak Watch Summary</h3>
                        <div className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-tertiary font-bold uppercase tracking-wider">{currentMonthName} Outbreaks</p>
                                <p className="text-2xl font-black font-headline text-on-surface mt-0.5">{healthRisks.length}</p>
                            </div>
                            <span className="material-symbols-outlined text-3xl text-amber-600">bug_report</span>
                        </div>
                    </div>

                    {/* Regional Outbreaks List */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                        <h4 className="text-base font-bold font-headline mb-4 tracking-tight text-on-surface">
                            {currentMonthName} Seasonal Outbreaks
                        </h4>
                        {loadingRisks ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-10 bg-surface-container rounded-xl w-full"></div>
                                <div className="h-10 bg-surface-container rounded-xl w-full"></div>
                            </div>
                        ) : healthRisks.length > 0 ? (
                            <div className="space-y-3">
                                {healthRisks.map((risk, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-surface-container hover:bg-surface-container-low transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                risk.risk === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                <span className="material-symbols-outlined text-lg">{risk.icon}</span>
                                            </div>
                                            <span className="font-bold text-on-surface text-xs group-hover:text-primary transition-colors">{risk.disease}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                            risk.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {risk.risk}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-tertiary">No regional health risks identified for {currentMonthName}.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Health News Section */}
            <div className="mt-12 pt-8 border-t border-surface-container">
                <h3 className="text-2xl font-bold font-headline mb-6 text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">article</span>
                    Global Health News
                </h3>
                
                {loadingNews ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="animate-pulse flex gap-4 bg-white p-4 rounded-3xl border border-surface-container h-28"></div>
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
