'use client';

import { useEffect, useState } from 'react';
import { HeartRateChart } from '@/components/HeartRateChart';
import { useRouter } from 'next/navigation';
import { PassportQRModal } from '@/components/PassportQRModal';
import { API_BASE } from '@/lib/api';
import { offlineStorage } from '@/lib/offline-storage';
import { useI18n } from '@/lib/i18n';

export default function Dashboard() {
    const router = useRouter();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isDisconnected, setIsDisconnected] = useState(false);
    const [showPassportModal, setShowPassportModal] = useState(false);
    const [insights, setInsights] = useState<any[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chartRange, setChartRange] = useState<'day' | 'week'>('day');
    const [isOffline, setIsOffline] = useState(false);

    // Weekly trend data fallback when no weekly wearable logs exist
    const weeklyData: any[] = [];

    const chartData = chartRange === 'week' ? weeklyData : (data?.heartRateData || []);

    const fetchFitData = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/fit-data');
            if (response.ok) {
                const result = await response.json();
                setData(result);
                offlineStorage.saveFitData(result);
                setIsDisconnected(false);
                setIsOffline(false);
            } else if (response.status === 403) {
                setIsDisconnected(true);
            } else {
                // Fall back to cached vitals if server response fails
                const cached = offlineStorage.getFitData();
                if (cached) {
                    setData(cached);
                    setIsOffline(true);
                }
            }
        } catch (err) {
            console.error('Fit data fetch error:', err);
            const cached = offlineStorage.getFitData();
            if (cached) {
                setData(cached);
            }
            setIsOffline(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        // Load initial cached data for instant offline rendering
        const cachedUser = offlineStorage.getProfile();
        if (cachedUser) setUser(cachedUser);

        const cachedFit = offlineStorage.getFitData();
        if (cachedFit) {
            setData(cachedFit);
            setLoading(false);
        }

        const cachedInsights = offlineStorage.getInsights();
        if (cachedInsights && cachedInsights.length > 0) {
            setInsights(cachedInsights);
            setLoadingInsights(false);
        }

        if (!offlineStorage.isOnline()) {
            setIsOffline(true);
        }

        // Fetch session info
        fetch('/api/auth-status')
            .then(r => r.json())
            .then(d => { 
                if (d.isAuthenticated && d.user) {
                    setUser(d.user);
                    offlineStorage.saveProfile(d.user);
                }
            })
            .catch(() => {
                setIsOffline(true);
            });

        fetchFitData();

        // Fetch AI health insights
        const fetchInsights = async () => {
            try {
                const res = await fetch('/api/health-insights');
                if (res.ok) {
                    const result = await res.json();
                    if (result.insights && Array.isArray(result.insights)) {
                        setInsights(result.insights);
                        offlineStorage.saveInsights(result.insights);
                    }
                }
            } catch (err) {
                console.warn('Insights fetch notice (using offline cache):', err);
                const cached = offlineStorage.getInsights();
                if (cached.length > 0) setInsights(cached);
            } finally {
                setLoadingInsights(false);
            }
        };
        fetchInsights();

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        const handleProfileUpdated = (e: any) => {
            setUser((prev: any) => ({
                ...prev,
                ...(e.detail || {}),
            }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('curatrack-profile-updated', handleProfileUpdated);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('curatrack-profile-updated', handleProfileUpdated);
        };
    }, [router]);

    const handleConnectGoogle = () => {
        window.location.href = '/api/auth/google';
    };

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
            {isOffline && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
                    <span className="material-symbols-outlined text-amber-600">wifi_off</span>
                    <span>Offline Mode • Displaying cached health metrics and vitals</span>
                </div>
            )}
            {/* Hero Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
                            {t('topNav.hello', 'Welcome back')}, {userName}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-health-profile-modal', { detail: user }))}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                title="Click to edit Blood Group, Gender & Existing Diseases & Allergies"
                            >
                                <span className="material-symbols-outlined text-xs">bloodtype</span>
                                <span>{user?.blood_group ? `Blood: ${user.blood_group}` : 'Set Blood Group'}</span>
                                <span className="text-red-300">•</span>
                                <span>{user?.gender ? user.gender : 'Set Gender'}</span>
                                {(user?.allergies || user?.chronic_diseases) && (user?.allergies !== 'None' && user?.chronic_diseases !== 'None') && (
                                    <>
                                        <span className="text-red-300">•</span>
                                        <span className="max-w-[160px] truncate">{user.allergies || user.chronic_diseases}</span>
                                    </>
                                )}
                                <span className="material-symbols-outlined text-xs text-red-500">edit</span>
                            </button>
                            <span className="w-1 h-1 bg-tertiary/40 rounded-full"></span>
                            <p className="text-tertiary text-xs sm:text-sm">{t('dashboard.subtitle', 'Your health overview for today')}</p>
                            <span className="w-1 h-1 bg-tertiary/40 rounded-full"></span>
                            <button 
                                onClick={fetchFitData}
                                disabled={refreshing}
                                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <span className={`material-symbols-outlined !text-sm ${refreshing ? 'animate-spin' : ''}`}>
                                    {refreshing ? 'refresh' : 'sync'}
                                </span>
                                {refreshing ? t('actions.loading', 'Syncing...') : t('actions.refresh', 'Sync Now')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row items-center gap-3 shrink-0">
                    <button 
                        onClick={() => router.push('/self-triage')}
                        className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-2xl shadow-md hover:opacity-95 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined !text-lg animate-pulse">emergency</span>
                        {t('dashboard.emergencyTriage', 'Emergency Self-Triage')}
                    </button>
                    <button 
                        onClick={() => setShowPassportModal(true)}
                        className="px-5 py-3 bg-gradient-to-br from-secondary to-secondary/80 text-white font-bold rounded-2xl shadow-md hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined !text-lg">qr_code_2</span>
                        {t('nav.profile', 'Medical ID & Passport')}
                    </button>
                </div>
            </div>

            {/* Bento Grid Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Heart Rate */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-error/10 rounded-2xl text-error">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </div>
                        <span className="text-xs font-bold text-error bg-error/10 px-2 py-1 rounded-lg">Live</span>
                    </div>
                    <div>
                        <p className="text-tertiary text-sm font-medium">{t('dashboard.heartRate', 'Heart Rate')}</p>
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
                        <p className="text-tertiary text-sm font-medium">{t('dashboard.dailySteps', 'Daily Steps')}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-on-surface">{steps.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-secondary h-full rounded-full transition-all" style={{ width: `${Math.min((steps / 10000) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-tertiary font-bold tracking-wider uppercase">{t('dashboard.goalProgress', { pct: (Math.min((steps / 10000) * 100, 100)).toFixed(0) })}</p>
                </div>

                {/* Sleep */}
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary self-start">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
                    </div>
                    <div>
                        <p className="text-tertiary text-sm font-medium">{t('dashboard.sleepTrend', 'Sleep Trend')}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-on-surface">{data?.sleep?.formatted || '--'}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-secondary text-sm font-bold">
                        <span className="material-symbols-outlined !text-sm">trending_up</span>
                        <span>{t('dashboard.syncActive', 'Sync Active')}</span>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm relative overflow-hidden">
                {isDisconnected && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 rotate-12">
                            <span className="material-symbols-outlined text-3xl">link_off</span>
                        </div>
                        <h3 className="text-xl font-bold text-on-surface mb-2">Google Fit Disconnected</h3>
                        <p className="text-tertiary mb-6 max-w-sm">We need your permission to sync your heart rate, steps, and sleep data from Google Fit.</p>
                        <button 
                            onClick={handleConnectGoogle}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">sync</span>
                            Connect Google Fit
                        </button>
                    </div>
                )}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-extrabold text-on-surface">Heart Rate Trend</h3>
                        <p className="text-sm text-tertiary">Real-time data from CoveIoT wearable</p>
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-xl">
                        <button 
                            onClick={() => setChartRange('day')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                chartRange === 'day' 
                                    ? 'bg-white shadow-sm text-primary' 
                                    : 'text-tertiary hover:text-on-surface'
                            }`}
                        >
                            Day
                        </button>
                        <button 
                            onClick={() => setChartRange('week')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                chartRange === 'week' 
                                    ? 'bg-white shadow-sm text-primary' 
                                    : 'text-tertiary hover:text-on-surface'
                            }`}
                        >
                            Week
                        </button>
                    </div>
                </div>
                <HeartRateChart data={chartData} />
            </div>

            {/* Health Tips - Moved Below Graph */}
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-on-surface">Health Tips</h3>
                            <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest">Powered by Llama 3.1</p>
                        </div>
                    </div>
                </div>

                {loadingInsights ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex gap-4 p-4 rounded-2xl bg-surface-container-low">
                                <div className="h-10 w-10 rounded-xl bg-surface-container shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-3 bg-surface-container rounded w-1/3"></div>
                                    <div className="h-3 bg-surface-container rounded w-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : insights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {insights.map((item, idx) => (
                            <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors group border border-transparent hover:border-surface-container-highest">
                                <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${
                                    item.statusColor === 'green' ? 'bg-green-50 text-green-600' :
                                    item.statusColor === 'amber' ? 'bg-amber-50 text-amber-600' :
                                    'bg-red-50 text-red-600'
                                } shadow-sm`}>
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-on-surface">{item.category}</p>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                                            item.statusColor === 'green' ? 'bg-green-100 text-green-700' :
                                            item.statusColor === 'amber' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>{item.status}</span>
                                    </div>
                                    <p className="text-xs text-tertiary leading-relaxed mb-2">{item.insight}</p>
                                    <div className="p-2.5 bg-white/50 rounded-xl border border-surface-container-high">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-[12px]">lightbulb</span>
                                            Recommendation
                                        </p>
                                        <p className="text-xs text-on-surface font-medium leading-relaxed">{item.tip}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <span className="material-symbols-outlined text-4xl text-tertiary/40 mb-2">psychology</span>
                        <p className="text-sm text-tertiary">No insights available. Ensure Ollama is running.</p>
                    </div>
                )}
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

            {/* Passport QR Modal */}
            {showPassportModal && (
                <PassportQRModal 
                    userId={user?.id || 'demo-patient-001'}
                    userName={user?.name || 'Demo Patient'}
                    onClose={() => setShowPassportModal(false)} 
                />
            )}
        </section>
    );
}
