'use client';

import { useEffect, useState } from 'react';
import { HeartRateChart } from '@/components/HeartRateChart';
import { useRouter } from 'next/navigation';
import { PassportQRModal } from '@/components/PassportQRModal';
import { API_BASE } from '@/lib/api';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isDisconnected, setIsDisconnected] = useState(false);
    const [showPassportModal, setShowPassportModal] = useState(false);
    const [insights, setInsights] = useState<any[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFitData = async () => {
        setRefreshing(true);
        try {
            const response = await fetch('/api/fit-data');
            if (response.ok) {
                const result = await response.json();
                setData(result);
                setIsDisconnected(false);
            } else if (response.status === 403) {
                setIsDisconnected(true);
            }
        } catch (err) {
            console.error('Fit data fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        // Fetch session info
        fetch('/api/auth-status')
            .then(r => r.json())
            .then(d => { if (d.isAuthenticated) setUser(d.user); })
            .catch(() => {});

        fetchFitData();

        // Fetch AI health insights
        const fetchInsights = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/health-insights`);
                const result = await res.json();
                setInsights(result.insights || []);
            } catch (err) {
                console.error('Insights fetch error:', err);
            } finally {
                setLoadingInsights(false);
            }
        };
        fetchInsights();
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
            {/* Hero Header */}
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Welcome back, {userName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-tertiary">Your health overview for today</p>
                            <span className="w-1 h-1 bg-tertiary/40 rounded-full"></span>
                            <button 
                                onClick={fetchFitData}
                                disabled={refreshing}
                                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined !text-sm ${refreshing ? 'animate-spin' : ''}`}>
                                    {refreshing ? 'refresh' : 'sync'}
                                </span>
                                {refreshing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowPassportModal(true)}
                        className="px-6 py-3 bg-gradient-to-br from-secondary to-secondary/80 text-white font-bold rounded-2xl shadow-md hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined !text-lg">qr_code_2</span>
                        Generate Passport
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
                        <button className="px-4 py-1.5 text-xs font-bold bg-white shadow-sm rounded-lg text-primary">Day</button>
                        <button className="px-4 py-1.5 text-xs font-bold text-tertiary">Week</button>
                    </div>
                </div>
                <HeartRateChart data={data?.heartRateData || []} />
            </div>

            {/* AI Health Insights - Moved Below Graph */}
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-on-surface">AI Health Insights</h3>
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
                    <button onClick={() => setShowPassportModal(true)} className="group p-6 bg-surface-container-lowest rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4 text-left border-b-4 border-transparent hover:border-secondary">
                        <div className="h-12 w-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">qr_code_2</span>
                        </div>
                        <div>
                            <p className="font-extrabold text-on-surface">Patient Passport</p>
                            <p className="text-xs text-tertiary">Generate secure QR</p>
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
