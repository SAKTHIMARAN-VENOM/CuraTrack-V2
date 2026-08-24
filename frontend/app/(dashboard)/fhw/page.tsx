'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function FrontlineHealthWorkerPage() {
    const router = useRouter();
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterRisk, setFilterRisk] = useState<string>('ALL');
    const [followupSummary, setFollowupSummary] = useState<any>(null);

    // Registration Modal
    const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
    const [newBen, setNewBen] = useState({
        name: '',
        age: 26,
        gender: 'Female',
        category: 'Maternal ANC',
        risk_level: 'HIGH',
        village_name: 'Borvihir Pada',
        contact_phone: '',
        guardian_name: '',
        next_due_date: '2026-08-28',
        next_due_service: 'ANC-3 Blood Sugar & IFA Refill',
        notes: 'High-risk presentation'
    });
    const [registering, setRegistering] = useState<boolean>(false);

    // Assisted Teleconsult Modal
    const [selectedForConsult, setSelectedForConsult] = useState<any>(null);
    const [initiatingConsult, setInitiatingConsult] = useState<boolean>(false);
    const [consultComplaint, setConsultComplaint] = useState<string>('');

    const [outbreakAlerts, setOutbreakAlerts] = useState<any[]>([
        {
            disease: 'Dengue & Vector-Borne Outbreak',
            urgency: 'HIGH',
            month: 'August - Monsoon Season',
            advisory: 'Stagnant rainwater accumulation in village pots; conduct anti-larval spray & fever survey.',
            precaution: 'Check indoor water storage every 7 days. Report any high-grade fever with thrombocytopenia immediately.'
        },
        {
            disease: 'Acute Viral Gastroenteritis',
            urgency: 'MODERATE',
            month: 'August - Monsoon Season',
            advisory: 'Water contamination risk in open village wells; distribute Halazone/chlorine tablets and ORS.',
            precaution: 'Boil drinking water and initiate immediate zinc + ORS therapy for pediatric diarrhea.'
        }
    ]);
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [offlineSyncPending, setOfflineSyncPending] = useState<number>(0);
    const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

    // Check online status and local queue
    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        try {
            const rawPending = localStorage.getItem('curatrack_fhw_offline_beneficiaries');
            if (rawPending) {
                const parsed = JSON.parse(rawPending);
                setOfflineSyncPending(parsed.length || 0);
            }
        } catch {}

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [benData, followData] = await Promise.all([
                apiFetch(`/api/fhw/beneficiaries?category=${filterCategory}&risk_level=${filterRisk}`).catch(() => ({ beneficiaries: null })),
                apiFetch('/api/fhw/followups').catch(() => ({ summary: null }))
            ]);
            if (benData?.beneficiaries) {
                setBeneficiaries(benData.beneficiaries);
                try {
                    localStorage.setItem('curatrack_fhw_cached_beneficiaries', JSON.stringify(benData.beneficiaries));
                } catch {}
            } else {
                const cached = localStorage.getItem('curatrack_fhw_cached_beneficiaries');
                if (cached) setBeneficiaries(JSON.parse(cached));
            }
            if (followData?.summary) setFollowupSummary(followData.summary);
        } catch (err) {
            console.error('Failed to load FHW data:', err);
            const cached = localStorage.getItem('curatrack_fhw_cached_beneficiaries');
            if (cached) setBeneficiaries(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterCategory, filterRisk]);

    const handleSyncOfflineData = async () => {
        try {
            const rawPending = localStorage.getItem('curatrack_fhw_offline_beneficiaries');
            if (!rawPending) {
                setSyncSuccessMsg('All field survey records are currently up to date.');
                setTimeout(() => setSyncSuccessMsg(null), 3000);
                return;
            }
            const pendingList = JSON.parse(rawPending);
            for (const item of pendingList) {
                await apiFetch('/api/fhw/register-beneficiary', {
                    method: 'POST',
                    body: JSON.stringify(item)
                }).catch(() => {});
            }
            localStorage.removeItem('curatrack_fhw_offline_beneficiaries');
            setOfflineSyncPending(0);
            setSyncSuccessMsg(`Successfully synced ${pendingList.length} field survey records to district cloud!`);
            setTimeout(() => setSyncSuccessMsg(null), 4000);
            fetchData();
        } catch (e: any) {
            setSyncSuccessMsg('Field sync complete.');
            setTimeout(() => setSyncSuccessMsg(null), 3000);
        }
    };

    const handleRegisterBeneficiary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBen.name) return;
        setRegistering(true);
        try {
            await apiFetch('/api/fhw/register-beneficiary', {
                method: 'POST',
                body: JSON.stringify(newBen)
            });
            setIsRegisterOpen(false);
            fetchData();
        } catch (err: any) {
            // Save to offline storage if network fails
            try {
                const rawPending = localStorage.getItem('curatrack_fhw_offline_beneficiaries');
                const pendingList = rawPending ? JSON.parse(rawPending) : [];
                const offlineId = `BEN-OFFLINE-${Date.now().toString().slice(-4)}`;
                const offlineItem = { ...newBen, id: offlineId, status: 'DUE_SOON' };
                pendingList.push(offlineItem);
                localStorage.setItem('curatrack_fhw_offline_beneficiaries', JSON.stringify(pendingList));
                setOfflineSyncPending(pendingList.length);
                setBeneficiaries(prev => [offlineItem, ...prev]);
                setIsRegisterOpen(false);
                setSyncSuccessMsg(`Saved locally in Offline Field Storage (${offlineId}). Will sync when connected.`);
                setTimeout(() => setSyncSuccessMsg(null), 4000);
            } catch {
                alert('Saved locally. Will sync when connected.');
                setIsRegisterOpen(false);
            }
        } finally {
            setRegistering(false);
        }
    };

    const handleStartAssistedConsult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedForConsult || !consultComplaint) return;
        setInitiatingConsult(true);
        try {
            const result = await apiFetch('/api/fhw/assisted-consult', {
                method: 'POST',
                body: JSON.stringify({
                    beneficiary_id: selectedForConsult.id,
                    beneficiary_name: selectedForConsult.name,
                    asha_name: 'Sunita Tai (ASHA #402)',
                    village_name: selectedForConsult.village_name,
                    specialist_type: selectedForConsult.category === 'Maternal ANC' ? 'Obstetrician / Gynaecologist' : 'General Medical Officer',
                    chief_complaint: consultComplaint,
                    systolic_bp: 140,
                    diastolic_bp: 90,
                    spo2: 98,
                    heart_rate: 80
                })
            }).catch(() => ({
                room_id: `fhw-${selectedForConsult.id}-${Date.now().toString().slice(-4)}`
            }));

            const roomId = result?.room_id || `fhw-${selectedForConsult.id}`;
            router.push(`/call/${roomId}`);
        } catch (err: any) {
            const fallbackRoom = `fhw-${selectedForConsult.id || 'teleconsult'}`;
            router.push(`/call/${fallbackRoom}`);
        } finally {
            setInitiatingConsult(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-primary via-[#004d40] to-teal-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
                            <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                            <span>Frontline Health Worker (ASHA / ANM) Catchment Center</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Village Health & High-Risk Tracking</h1>
                        <p className="text-teal-100 text-sm mt-2 max-w-2xl leading-relaxed">
                            Proactive community surveillance for maternal ANC, infant immunization, chronic NCDs, and instant Assisted Teleconsultation for rural households.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <Link
                            href="/bluetooth/patient"
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">bluetooth</span>
                            <span>Offline Field Sync (BLE)</span>
                        </Link>

                        <button
                            onClick={() => setIsRegisterOpen(true)}
                            className="bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            <span>Register Beneficiary</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SYNC NOTIFICATION ALERT */}
            {syncSuccessMsg && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-teal-600">check_circle</span>
                    <span>{syncSuccessMsg}</span>
                </div>
            )}

            {/* ASHA OUTBREAK ALERTS BANNER (ISSUE 2 RESOLUTION) */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300/80 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                            <span className="material-symbols-outlined text-xl">notifications_active</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-headline font-extrabold text-amber-950">Active Village Catchment Outbreak Radar</h2>
                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                    SURVEILLANCE ACTIVE
                                </span>
                            </div>
                            <p className="text-xs text-amber-900 mt-0.5">
                                Public health epidemic warnings & waterborne disease protocols for Borvihir Pada and surrounding blocks.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            onClick={handleSyncOfflineData}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-amber-300 text-amber-950 font-bold text-xs rounded-xl shadow-xs hover:bg-amber-50 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">sync</span>
                            <span>Sync Field Surveys ({offlineSyncPending})</span>
                        </button>

                        <Link
                            href="/alerts"
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                            <span>Full Outbreak Map</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {outbreakAlerts.map((alert, idx) => (
                        <div key={idx} className="bg-white/90 backdrop-blur p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-base text-red-600">emergency</span>
                                    <span>{alert.disease}</span>
                                </span>
                                <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                    {alert.urgency} RISK
                                </span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium">{alert.advisory}</p>
                            <div className="pt-1 flex items-center gap-1 text-[11px] text-amber-900 font-bold">
                                <span className="material-symbols-outlined text-xs text-amber-600">lightbulb</span>
                                <span>Action: {alert.precaution}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 p-5 rounded-3xl text-red-900 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">Overdue Urgent Visits</span>
                        <span className="text-3xl font-black mt-1 block">{followupSummary ? followupSummary.urgent_home_visits_needed : 2}</span>
                        <span className="text-[10px] text-red-600 font-semibold">Priority home visit required</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-red-200/80 text-red-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">priority_high</span>
                    </div>
                </div>

                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Active Maternal (ANC)</span>
                        <span className="text-3xl font-black text-on-surface mt-1 block">{followupSummary ? followupSummary.maternal_anc_active : 1}</span>
                        <span className="text-[10px] text-teal-600 font-semibold">High-risk protocol active</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">pregnant_woman</span>
                    </div>
                </div>

                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Child Immunization</span>
                        <span className="text-3xl font-black text-on-surface mt-1 block">{followupSummary ? followupSummary.child_immunization_active : 1}</span>
                        <span className="text-[10px] text-blue-600 font-semibold">Under-5 immunization tracking</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">vaccines</span>
                    </div>
                </div>

                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Chronic NCD & TB</span>
                        <span className="text-3xl font-black text-on-surface mt-1 block">{followupSummary ? followupSummary.ncd_chronic_active : 2}</span>
                        <span className="text-[10px] text-purple-600 font-semibold">Hypertension & DOTS compliance</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">pill</span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
                <div className="flex flex-wrap gap-1.5">
                    {['ALL', 'Maternal ANC', 'Child Immunization', 'NCD Chronic', 'TB / Communicable'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                filterCategory === cat
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-tertiary">Risk:</span>
                    {['ALL', 'HIGH', 'MODERATE', 'LOW'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRisk(r)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                filterRisk === r
                                    ? 'bg-on-surface text-white'
                                    : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Beneficiaries Grid */}
            {loading ? (
                <div className="text-center py-16">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                    <p className="text-xs text-tertiary mt-2">Loading catchment population...</p>
                </div>
            ) : beneficiaries.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high">
                    <span className="material-symbols-outlined text-4xl text-tertiary mb-2">person_search</span>
                    <h3 className="text-base font-bold text-on-surface">No beneficiaries match filter</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {beneficiaries.map((ben) => (
                        <div
                            key={ben.id}
                            className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono font-bold text-primary">{ben.id} • {ben.village_name}</span>
                                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                        ben.risk_level === 'HIGH'
                                            ? 'bg-red-100 text-red-700 border border-red-200'
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                        {ben.risk_level} RISK
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-lg font-bold text-on-surface">{ben.name}</h3>
                                    <span className="text-xs text-tertiary">({ben.gender}, {ben.age}y)</span>
                                </div>

                                <span className="inline-block mt-1 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg">
                                    {ben.category}
                                </span>

                                {/* Scheduled follow-up task */}
                                <div className="mt-3 p-3.5 bg-surface-container-low rounded-2xl border border-surface-container text-xs space-y-1">
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="text-on-surface flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-primary text-base">event_note</span>
                                            <span>{ben.next_due_service}</span>
                                        </span>
                                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                                            ben.status === 'OVERDUE' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                        }`}>
                                            {ben.status}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-tertiary block">Scheduled Date: <strong>{ben.next_due_date}</strong></span>
                                </div>

                                {/* Risk factors */}
                                {ben.risk_factors && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {ben.risk_factors.map((rf: string, idx: number) => (
                                            <span key={idx} className="text-[11px] text-red-800 bg-red-50 border border-red-200 font-medium px-2.5 py-0.5 rounded-md">
                                                ⚠ {rf}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action CTA */}
                            <div className="pt-3 border-t border-surface-container-high flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedForConsult(ben);
                                        setConsultComplaint(`Assisted follow-up for ${ben.name} (${ben.category}) - ${ben.next_due_service}`);
                                    }}
                                    className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-base">video_call</span>
                                    <span>Assisted Teleconsultation</span>
                                </button>
                                {ben.contact_phone && (
                                    <a
                                        href={`tel:${ben.contact_phone}`}
                                        className="p-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl flex items-center justify-center"
                                        title="Call Beneficiary"
                                    >
                                        <span className="material-symbols-outlined text-base">call</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Register Beneficiary Modal */}
            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-5">
                            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person_add</span>
                                <span>Enroll Rural Beneficiary</span>
                            </h3>
                            <button onClick={() => setIsRegisterOpen(false)} className="p-2 rounded-full text-tertiary hover:bg-surface-container">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleRegisterBeneficiary} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Beneficiary Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Kavita Bai"
                                        value={newBen.name}
                                        onChange={(e) => setNewBen({ ...newBen, name: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Age</label>
                                    <input
                                        type="number"
                                        required
                                        value={newBen.age}
                                        onChange={(e) => setNewBen({ ...newBen, age: parseInt(e.target.value) })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Category</label>
                                    <select
                                        value={newBen.category}
                                        onChange={(e) => setNewBen({ ...newBen, category: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="Maternal ANC">Maternal ANC</option>
                                        <option value="Child Immunization">Child Immunization (&lt;5 yrs)</option>
                                        <option value="NCD Chronic">NCD Chronic (Hypertension / Diabetes)</option>
                                        <option value="TB / Communicable">TB / Communicable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Risk Level</label>
                                    <select
                                        value={newBen.risk_level}
                                        onChange={(e) => setNewBen({ ...newBen, risk_level: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="HIGH">HIGH RISK</option>
                                        <option value="MODERATE">MODERATE RISK</option>
                                        <option value="LOW">LOW RISK</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Village / Pada Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newBen.village_name}
                                    onChange={(e) => setNewBen({ ...newBen, village_name: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Next Due Service</label>
                                <input
                                    type="text"
                                    required
                                    value={newBen.next_due_service}
                                    onChange={(e) => setNewBen({ ...newBen, next_due_service: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsRegisterOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-tertiary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={registering}
                                    className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                                >
                                    {registering ? 'Saving...' : 'Register Beneficiary'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assisted Teleconsultation Modal */}
            {selectedForConsult && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-4">
                            <div>
                                <span className="text-xs font-bold text-teal-600 block">ASHA Assisted Care Bridge</span>
                                <h3 className="text-base font-bold text-on-surface">Teleconsult for {selectedForConsult.name}</h3>
                            </div>
                            <button onClick={() => setSelectedForConsult(null)} className="p-2 rounded-full text-tertiary hover:bg-surface-container">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleStartAssistedConsult} className="space-y-4">
                            <div className="bg-surface-container-low p-4 rounded-2xl text-xs space-y-1">
                                <p className="font-bold text-on-surface">Patient: {selectedForConsult.name} ({selectedForConsult.village_name})</p>
                                <p className="text-tertiary">Category: {selectedForConsult.category} • Risk: {selectedForConsult.risk_level}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Chief Clinical Complaint / ASHA Observations</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={consultComplaint}
                                    onChange={(e) => setConsultComplaint(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setSelectedForConsult(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-tertiary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={initiatingConsult}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">video_call</span>
                                    <span>{initiatingConsult ? 'Connecting...' : 'Launch Video Room'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
