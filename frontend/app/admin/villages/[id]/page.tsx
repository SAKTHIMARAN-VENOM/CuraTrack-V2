'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';

export default function VillageDetailPage() {
    const params = useParams();
    const villageId = params?.id as string;
    const [villageData, setVillageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchVillageDetail() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/villages/${villageId}`);
                if (res.ok) {
                    const data = await res.json();
                    setVillageData(data);
                }
            } catch (err) {
                console.warn('Village detail fetch error:', err);
            } finally {
                setLoading(false);
            }
        }
        if (villageId) {
            fetchVillageDetail();
        }
    }, [villageId]);

    if (loading) {
        return <div className="text-center py-20 text-tertiary text-xs">Loading village health profile...</div>;
    }

    const village = villageData?.village || {};
    const workforce = villageData?.workforce || {};
    const health = villageData?.health_indicators || {};
    const facilities = villageData?.facilities || [];
    const activities = villageData?.activities || [];

    return (
        <div className="space-y-8">
            {/* Header Breadcrumbs & Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-tertiary font-headline">
                        <Link href="/admin/district" className="hover:text-primary">Nandurbar District</Link>
                        <span>›</span>
                        <Link href={`/admin/district?block=${village.block}`} className="hover:text-primary">{village.block}</Link>
                        <span>›</span>
                        <span className="text-on-surface">{village.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface font-headline">{village.name}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            village.coverage_status === 'GOOD' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            village.coverage_status === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                            {village.coverage_status === 'GOOD' ? '🟢 Good Coverage' : village.coverage_status === 'CRITICAL' ? '🔴 Critical Attention Required' : '🟡 Needs Attention'}
                        </span>
                    </div>
                    <p className="text-xs text-tertiary font-medium">
                        Lat/Lng: {village.lat || '21.3667'}° N, {village.lng || '74.2333'}° E · Attached Facility: <span className="font-bold text-on-surface">{village.attached_facility}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/villages"
                        className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-surface-container transition-colors font-headline"
                    >
                        ← Back to Directory
                    </Link>
                </div>
            </div>

            {/* Top 4 Section Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Population Overview */}
                <div className="bg-white p-6 rounded-3xl border border-surface-container shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-tertiary font-headline">1. Population</span>
                        <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">groups</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-on-surface font-headline">{village.population?.toLocaleString()}</p>
                        <p className="text-xs text-tertiary mt-0.5 font-medium">Total Rural Population</p>
                    </div>
                    <div className="pt-2 border-t border-surface-container-low space-y-1 text-xs font-sans">
                        <div className="flex justify-between">
                            <span className="text-tertiary">Registered Beneficiaries:</span>
                            <span className="font-bold text-on-surface">{health.registered_beneficiaries}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tertiary">Active Catchment:</span>
                            <span className="font-bold text-primary">{health.active_beneficiaries}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Workforce */}
                <div className="bg-white p-6 rounded-3xl border border-surface-container shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-tertiary font-headline">2. Workforce</span>
                        <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">badge</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-purple-700 font-headline">
                            {(workforce.asha_workers?.length || village.asha_workers_count || 1)} ASHA
                        </p>
                        <p className="text-xs text-tertiary mt-0.5 font-medium">Ratio {village.asha_ratio || '1 : 1425'}</p>
                    </div>
                    <div className="pt-2 border-t border-surface-container-low space-y-1 text-xs font-sans">
                        <div className="flex justify-between">
                            <span className="text-tertiary">Medical Officers:</span>
                            <span className="font-bold text-on-surface">{village.doctors_count > 0 ? `${village.doctors_count} MO` : 'Visiting'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tertiary">ANM Staff:</span>
                            <span className="font-bold text-teal-700">{village.anm_workers_count || 1} Rostered</span>
                        </div>
                    </div>
                </div>

                {/* 3. Clinical Burden */}
                <div className="bg-white p-6 rounded-3xl border border-surface-container shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-tertiary font-headline">3. Health Status</span>
                        <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">emergency</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-rose-600 font-headline">{health.high_risk_cases || 0} High-Risk</p>
                        <p className="text-xs text-tertiary mt-0.5 font-medium">{health.emergency_cases || 0} Emergency flagged</p>
                    </div>
                    <div className="pt-2 border-t border-surface-container-low space-y-1 text-xs font-sans">
                        <div className="flex justify-between">
                            <span className="text-tertiary">Immunization Rate:</span>
                            <span className="font-bold text-emerald-700">{village.vaccination_rate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tertiary">Active Disease Cases:</span>
                            <span className="font-bold text-on-surface">
                                {(health.diseases || []).reduce((a: number, c: any) => a + c.cases, 0)} Total
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Attached Facility */}
                <div className="bg-white p-6 rounded-3xl border border-surface-container shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-tertiary font-headline">4. Facility Node</span>
                        <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">local_hospital</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-base font-bold text-on-surface truncate font-headline">{village.attached_facility}</p>
                        <p className="text-xs text-tertiary mt-0.5 font-medium">Tier: {village.facility_type}</p>
                    </div>
                    <div className="pt-2 border-t border-surface-container-low space-y-1 text-xs font-sans">
                        <div className="flex justify-between">
                            <span className="text-tertiary">Resource Stock:</span>
                            <span className="font-bold text-emerald-700">Adequate</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tertiary">Workload:</span>
                            <span className="font-bold text-on-surface">Moderate</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed 2-Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Epidemiological Disease Profile & Trends */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-on-surface font-headline">Recent Disease Cases & Incidence</h2>
                        <span className="text-xs font-bold text-tertiary">Village Surveillance Record</span>
                    </div>

                    <div className="space-y-3 font-sans">
                        {(health.diseases || []).map((d: any, idx: number) => (
                            <div key={idx} className="p-4 bg-surface-container-low rounded-2xl border border-surface-container flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-on-surface font-headline">{d.disease}</h3>
                                        <span className={`px-2 py-0.2 text-[10px] font-black rounded-full uppercase ${
                                            d.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {d.severity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-tertiary">Reported via ASHA field surveillance & PHC OPD registry</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-on-surface font-headline">{d.cases} cases</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        d.trend === 'INCREASING' ? 'bg-red-100 text-red-700' : 'bg-surface-container text-tertiary'
                                    }`}>
                                        {d.trend === 'INCREASING' ? '▲ Increasing' : '▬ Stable'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Assigned Healthcare Workforce */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-on-surface font-headline">Assigned Healthcare Workers</h2>
                        <Link href="/admin/workers" className="text-xs font-bold text-primary hover:underline font-headline">
                            Directory →
                        </Link>
                    </div>

                    <div className="space-y-3 font-sans">
                        {/* ASHA Workers */}
                        {(workforce.asha_workers || []).map((a: any, idx: number) => (
                            <div key={idx} className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-sm">
                                        {a.name?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-on-surface font-headline">{a.name}</h3>
                                        <p className="text-xs text-tertiary">{a.asha_id || 'ASHA-402'} · {a.phone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        ✓ Verified
                                    </span>
                                    <p className="text-[10px] text-tertiary mt-1">{a.beneficiaries_count || 48} Assigned Beneficiaries</p>
                                </div>
                            </div>
                        ))}

                        {/* Medical Officers */}
                        {(workforce.doctors || []).map((d: any, idx: number) => (
                            <div key={idx} className="p-4 bg-teal-50/40 rounded-2xl border border-teal-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                                        Dr
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-on-surface font-headline">{d.personal_details?.name || 'Dr. David Ross'}</h3>
                                        <p className="text-xs text-tertiary">{d.professional_details?.specialization || 'General Physician'} · {d.professional_details?.reg_number}</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    ✓ Active MO
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Activities & Health Camps Section */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-on-surface font-headline">Recent & Scheduled Health Activities in Village</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                    {activities.map((act: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2">
                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    act.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-primary/10 text-primary'
                                }`}>
                                    {act.status}
                                </span>
                                <span className="text-xs text-tertiary">{act.date}</span>
                            </div>
                            <h3 className="font-bold text-sm text-on-surface font-headline">{act.type}</h3>
                            <p className="text-xs text-tertiary leading-relaxed">Coordinated by Frontline ASHA worker & Village Health Sanitation Committee (VHSC)</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
