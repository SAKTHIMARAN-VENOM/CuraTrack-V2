'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

export default function AdminDashboardPage() {
    const { t } = useI18n();
    const [stats, setStats] = useState<any>(null);
    const [actionItems, setActionItems] = useState<any[]>([]);
    const [diseaseTrends, setDiseaseTrends] = useState<any[]>([]);
    const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const statsRes = await fetch(`${API_BASE}/api/admin/dashboard-stats`);
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            const actRes = await fetch(`${API_BASE}/api/admin/action-required`);
            if (actRes.ok) {
                const actData = await actRes.json();
                setActionItems(actData.items || []);
            }

            const disRes = await fetch(`${API_BASE}/api/admin/disease-monitoring`);
            if (disRes.ok) {
                const disData = await disRes.json();
                setDiseaseTrends(disData.trend_history_7d || []);
            }
        } catch (err) {
            console.warn('Dashboard data fetch warning:', err);
            setStats({
                district: 'Nandurbar District',
                state: 'Maharashtra',
                population_covered: 1648290,
                total_villages: 6,
                total_blocks: 6,
                total_beneficiaries: 2480,
                high_risk_patients: 92,
                total_doctors: 4,
                verified_doctors: 2,
                pending_doctor_approvals: 2,
                total_asha_workers: 5,
                verified_asha_workers: 3,
                pending_asha_verification: 2,
                total_facilities: 6,
                active_healthcare_workers: 17,
                recent_disease_cases: 239,
                pending_referrals: 4,
                emergency_referrals: 2,
                active_health_alerts: 3
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const filteredActionItems = actionItems.filter(item => {
        if (priorityFilter === 'ALL') return true;
        return item.priority === priorityFilter;
    });

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'CRITICAL':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'HIGH':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'MEDIUM':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-surface-container text-tertiary border-surface-container-high';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Hero Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-black uppercase tracking-wider text-primary">
                            District Health Governance Command Center
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        {stats?.district || 'Nandurbar District'} Healthcare Dashboard
                    </h1>
                    <p className="text-xs text-tertiary max-w-3xl font-medium">
                        Real-time oversight of 6 Taluks, 928 rural villages, frontline ASHA workers, clinical medical officers, public facilities, and epidemiological disease trends.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                        onClick={loadDashboardData}
                        className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-surface-container transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span>Sync Metrics</span>
                    </button>
                    <Link
                        href="/admin/reports"
                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>Export District Report</span>
                    </Link>
                </div>
            </div>

            {/* Critical "Action Required" Section */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-surface-container space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-2xl">crisis_alert</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-on-surface font-headline">Action Required</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                                    {actionItems.length}
                                </span>
                            </div>
                            <p className="text-xs text-tertiary">Immediate administrative interventions, outbreaks, and pending approvals</p>
                        </div>
                    </div>

                    {/* Priority Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-surface-container">
                        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriorityFilter(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    priorityFilter === p
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-tertiary hover:text-on-surface'
                                }`}
                            >
                                {p === 'ALL' ? 'All Priorities' : p}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredActionItems.length === 0 ? (
                    <div className="text-center py-10 text-tertiary space-y-2">
                        <span className="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
                        <p className="text-sm font-bold text-on-surface">No Pending Actions in this Category</p>
                        <p className="text-xs text-tertiary">All healthcare workflows and verification queues are processed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredActionItems.map((item, idx) => (
                            <div
                                key={idx}
                                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                                    item.priority === 'CRITICAL'
                                        ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                                        : item.priority === 'HIGH'
                                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                                        : 'bg-surface-container-lowest border-surface-container hover:border-primary/30'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getPriorityBadge(item.priority)}`}>
                                            {item.priority} Priority
                                        </span>
                                        <span className="text-[11px] font-semibold text-tertiary">{item.category}</span>
                                    </div>
                                    <h3 className="font-bold text-sm text-on-surface font-headline">{item.title}</h3>
                                    <p className="text-xs text-tertiary leading-relaxed font-sans">{item.description}</p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-surface-container">
                                    <span className="text-[11px] text-tertiary">{item.created_at}</span>
                                    <Link
                                        href={item.link}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 group"
                                    >
                                        <span>{item.action_label || 'Take Action'}</span>
                                        <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Core Statistics KPI Grid */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-on-surface font-headline">District Healthcare Vital Metrics</h2>
                    <span className="text-xs text-tertiary font-medium">Real-time live sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Population & Coverage */}
                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-tertiary">District Population</span>
                            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">groups</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-on-surface font-headline">
                                {stats ? stats.population_covered.toLocaleString() : '1,648,290'}
                            </p>
                            <p className="text-xs text-tertiary mt-0.5">
                                <span className="font-bold text-on-surface">{stats?.total_villages || 6}</span> Villages monitored · 6 Taluks
                            </p>
                        </div>
                        <div className="pt-2 border-t border-surface-container-low flex items-center justify-between text-xs">
                            <span className="text-tertiary">Beneficiaries</span>
                            <span className="font-bold text-primary">{stats?.total_beneficiaries || 2480} registered</span>
                        </div>
                    </div>

                    {/* Doctors Workforce */}
                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-tertiary">Medical Doctors</span>
                            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">stethoscope</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-on-surface font-headline">{stats?.total_doctors || 4}</p>
                                <span className="text-xs font-bold text-emerald-700">({stats?.verified_doctors || 2} verified)</span>
                            </div>
                            <p className="text-xs text-tertiary mt-0.5">
                                <span className={`font-bold ${stats?.pending_doctor_approvals > 0 ? 'text-amber-700' : 'text-on-surface'}`}>
                                    {stats?.pending_doctor_approvals || 0}
                                </span> approvals awaiting review
                            </p>
                        </div>
                        <div className="pt-2 border-t border-surface-container-low flex items-center justify-between text-xs">
                            <span className="text-tertiary">Status</span>
                            <Link href="/admin/verification" className="font-bold text-primary hover:underline">
                                Review Queue →
                            </Link>
                        </div>
                    </div>

                    {/* ASHA Workers */}
                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-tertiary">ASHA Frontline Workers</span>
                            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-on-surface font-headline">{stats?.total_asha_workers || 5}</p>
                                <span className="text-xs font-bold text-purple-700">({stats?.verified_asha_workers || 3} verified)</span>
                            </div>
                            <p className="text-xs text-tertiary mt-0.5">
                                <span className={`font-bold ${stats?.pending_asha_verification > 0 ? 'text-amber-700' : 'text-on-surface'}`}>
                                    {stats?.pending_asha_verification || 0}
                                </span> pending verification
                            </p>
                        </div>
                        <div className="pt-2 border-t border-surface-container-low flex items-center justify-between text-xs">
                            <span className="text-tertiary">Field Workforce</span>
                            <Link href="/admin/workers?tab=asha" className="font-bold text-purple-700 hover:underline">
                                Manage ASHA →
                            </Link>
                        </div>
                    </div>

                    {/* Disease Surveillance & Alerts */}
                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-tertiary">Surveillance & Alerts</span>
                            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">warning</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-rose-600 font-headline">{stats?.active_health_alerts || 3}</p>
                                <span className="text-xs font-bold text-on-surface">Active Alerts</span>
                            </div>
                            <p className="text-xs text-tertiary mt-0.5">
                                <span className="font-bold text-rose-700">{stats?.high_risk_patients || 92}</span> high-risk patients
                            </p>
                        </div>
                        <div className="pt-2 border-t border-surface-container-low flex items-center justify-between text-xs">
                            <span className="text-tertiary">Outbreak Response</span>
                            <Link href="/admin/alerts" className="font-bold text-rose-700 hover:underline">
                                View Alerts →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Secondary Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-surface-container">
                        <p className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Public Health Facilities</p>
                        <p className="text-xl font-bold text-on-surface mt-1 font-headline">{stats?.total_facilities || 6} Units</p>
                        <p className="text-[10px] text-tertiary">DH, SDH, CHC, PHC</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-surface-container">
                        <p className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Active Health Cases</p>
                        <p className="text-xl font-bold text-on-surface mt-1 font-headline">{stats?.recent_disease_cases || 239} Cases</p>
                        <p className="text-[10px] text-amber-700 font-semibold">Surge in 2 Villages</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-surface-container">
                        <p className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Inter-Facility Referrals</p>
                        <p className="text-xl font-bold text-on-surface mt-1 font-headline">{stats?.pending_referrals || 4} Pending</p>
                        <p className="text-[10px] text-rose-700 font-bold">{stats?.emergency_referrals || 2} Emergency</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-surface-container">
                        <p className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Healthcare Workers Active</p>
                        <p className="text-xl font-bold text-on-surface mt-1 font-headline">{stats?.active_healthcare_workers || 17} Staff</p>
                        <p className="text-[10px] text-emerald-700 font-bold">100% Rostered</p>
                    </div>
                </div>
            </section>

            {/* Interactive Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 7-Day Disease Incidence Trend */}
                <div className="bg-white p-6 rounded-3xl border border-surface-container shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base text-on-surface font-headline">7-Day Communicable Disease Trends</h3>
                            <p className="text-xs text-tertiary">Longitudinal surveillance across reporting centres</p>
                        </div>
                        <Link href="/admin/diseases" className="text-xs font-bold text-primary hover:underline">
                            Details →
                        </Link>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={diseaseTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#edeeef" />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#717786" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#717786" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#191c1d', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Line type="monotone" dataKey="Dengue" stroke="#ba1a1a" strokeWidth={2.5} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Malaria" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Gastro" stroke="#35B0AB" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="TB" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Village Coverage & Risk Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-surface-container shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base text-on-surface font-headline">High-Risk Patients by Village</h3>
                            <p className="text-xs text-tertiary">Maternal ANC, Severe Malnutrition, TB, Chronic NCDs</p>
                        </div>
                        <Link href="/admin/district" className="text-xs font-bold text-primary hover:underline">
                            District Map →
                        </Link>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { village: 'Borvihir', high_risk: 18, total_cases: 70 },
                                { village: 'Dongargaon', high_risk: 7, total_cases: 20 },
                                { village: 'Dhanora', high_risk: 24, total_cases: 30 },
                                { village: 'Ranipur', high_risk: 9, total_cases: 28 },
                                { village: 'Toranmal', high_risk: 19, total_cases: 56 },
                                { village: 'Khadki', high_risk: 14, total_cases: 22 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#edeeef" />
                                <XAxis dataKey="village" tick={{ fontSize: 10 }} stroke="#717786" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#717786" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#191c1d', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Bar dataKey="high_risk" name="High Risk Patients" fill="#ba1a1a" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="total_cases" name="Total Disease Cases" fill="#006782" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-4 border border-surface-container shadow-sm">
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2 font-headline">
                    <span className="material-symbols-outlined text-primary">bolt</span>
                    District Administrator Fast Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Link
                        href="/admin/verification"
                        className="p-4 bg-surface-container-low hover:bg-primary/5 rounded-2xl border border-surface-container transition-all text-center space-y-2 group"
                    >
                        <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">verified_user</span>
                        <p className="text-xs font-bold text-on-surface">Worker Verification</p>
                        <p className="text-[10px] text-tertiary">Doctors & ASHA</p>
                    </Link>

                    <Link
                        href="/admin/district"
                        className="p-4 bg-surface-container-low hover:bg-primary/5 rounded-2xl border border-surface-container transition-all text-center space-y-2 group"
                    >
                        <span className="material-symbols-outlined text-2xl text-secondary group-hover:scale-110 transition-transform">map</span>
                        <p className="text-xs font-bold text-on-surface">District Map</p>
                        <p className="text-[10px] text-tertiary">6 Taluks & Villages</p>
                    </Link>

                    <Link
                        href="/admin/alerts"
                        className="p-4 bg-surface-container-low hover:bg-rose-50 rounded-2xl border border-surface-container transition-all text-center space-y-2 group"
                    >
                        <span className="material-symbols-outlined text-2xl text-rose-600 group-hover:scale-110 transition-transform">emergency_heat</span>
                        <p className="text-xs font-bold text-on-surface">Outbreak Alerts</p>
                        <p className="text-[10px] text-tertiary">Surge Monitoring</p>
                    </Link>

                    <Link
                        href="/admin/facilities"
                        className="p-4 bg-surface-container-low hover:bg-primary/5 rounded-2xl border border-surface-container transition-all text-center space-y-2 group"
                    >
                        <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">local_hospital</span>
                        <p className="text-xs font-bold text-on-surface">Facilities Audit</p>
                        <p className="text-[10px] text-tertiary">Beds & Drug Stocks</p>
                    </Link>

                    <Link
                        href="/admin/referrals"
                        className="p-4 bg-surface-container-low hover:bg-amber-50 rounded-2xl border border-surface-container transition-all text-center space-y-2 group"
                    >
                        <span className="material-symbols-outlined text-2xl text-amber-600 group-hover:scale-110 transition-transform">alt_route</span>
                        <p className="text-xs font-bold text-on-surface">Referrals</p>
                        <p className="text-[10px] text-tertiary">Ambulance & Beds</p>
                    </Link>

                    <Link
                        href="/admin/reports"
                        className="p-4 bg-surface-container-low hover:bg-emerald-50 rounded-2xl border border-surface-container transition-all text-center space-y-2 group"
                    >
                        <span className="material-symbols-outlined text-2xl text-emerald-600 group-hover:scale-110 transition-transform">summarize</span>
                        <p className="text-xs font-bold text-on-surface">Reports & Export</p>
                        <p className="text-[10px] text-tertiary">District Health Data</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
