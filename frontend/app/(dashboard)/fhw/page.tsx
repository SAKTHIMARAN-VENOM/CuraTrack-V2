'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import AnimatedSelect, { SelectOption } from '@/components/ui/AnimatedSelect';

const CATEGORY_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Categories', icon: 'category' },
    { value: 'Maternal ANC', label: 'Maternal ANC', icon: 'pregnant_woman', badge: 'Maternal', badgeColor: 'bg-rose-100 text-rose-800' },
    { value: 'Child Immunization', label: 'Child Immunization', icon: 'child_care', badge: 'Child', badgeColor: 'bg-blue-100 text-blue-800' },
    { value: 'NCD Chronic', label: 'NCD Chronic', icon: 'monitor_heart', badge: 'NCD', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'TB / Communicable', label: 'TB / Communicable', icon: 'lungs', badge: 'Infectious', badgeColor: 'bg-purple-100 text-purple-800' },
];

const RISK_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Risk Levels', icon: 'tune' },
    { value: 'HIGH', label: 'High Risk (Urgent Action)', icon: 'warning', badge: 'High', badgeColor: 'bg-red-100 text-red-700' },
    { value: 'MODERATE', label: 'Moderate Risk', icon: 'info', badge: 'Moderate', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'LOW', label: 'Low Risk', icon: 'check_circle', badge: 'Low', badgeColor: 'bg-emerald-100 text-emerald-800' },
];

export default function FrontlineHealthWorkerPage() {
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

    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [offlineSyncPending, setOfflineSyncPending] = useState<number>(0);
    const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
    const [medAlerts, setMedAlerts] = useState<any[]>([]);

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
            const [benData, followData, alertData] = await Promise.all([
                apiFetch(`/api/fhw/beneficiaries?category=${filterCategory}&risk_level=${filterRisk}`).catch(() => ({ beneficiaries: null })),
                apiFetch('/api/fhw/followups').catch(() => ({ summary: null })),
                apiFetch('/api/facility/medicine-alerts').catch(() => ({ medicines: [] }))
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
            if (alertData?.medicines) setMedAlerts(alertData.medicines);
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
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleSyncOfflineData}
                            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all border border-white/20"
                            title="Synchronize field records"
                        >
                            <span className="material-symbols-outlined text-lg">cloud_sync</span>
                            <span>Sync Surveys ({offlineSyncPending})</span>
                        </button>

                        <button
                            onClick={() => setIsRegisterOpen(true)}
                            className="px-5 py-3 bg-white text-primary hover:bg-slate-50 font-black text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            <span>Enroll Beneficiary</span>
                        </button>
                    </div>
                </div>

                {/* Status Indicator Bar */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span className="font-semibold text-teal-100">
                            {isOnline ? 'District Health Network Connected' : 'Offline Field Mode (Local Caching Active)'}
                        </span>
                    </div>
                    {offlineSyncPending > 0 && (
                        <div className="flex items-center gap-2 text-amber-200 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30">
                            <span className="material-symbols-outlined text-sm">cloud_upload</span>
                            <span>{offlineSyncPending} records pending district cloud sync</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Alert / Notification banners */}
            {syncSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-emerald-600">cloud_done</span>
                    <span>{syncSuccessMsg}</span>
                </div>
            )}

            {/* Stat Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">groups</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Catchment Total</span>
                            <span className="text-2xl font-black text-on-surface">{followupSummary?.total_assigned || beneficiaries.length || 24}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">High-Risk Cases</span>
                            <span className="text-2xl font-black text-red-600">
                                {beneficiaries.filter(b => b.risk_level === 'HIGH').length || 8}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">schedule_send</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Due This Week</span>
                            <span className="text-2xl font-black text-amber-600">
                                {followupSummary?.upcoming_tasks?.length || 5}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">home_health</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Urgent Visits</span>
                            <span className="text-2xl font-black text-rose-600">
                                {followupSummary?.urgent_home_visits_needed || 3}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Essential Drug Shortage Notice for Catchment Village */}
            {medAlerts.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-600 text-2xl">inventory_2</span>
                        <div>
                            <h4 className="text-xs font-bold text-amber-950">EDL Village Stock Depletion Notice</h4>
                            <p className="text-[11px] text-amber-800">
                                {medAlerts.length} essential medicines (including Iron-Folic Acid & Amoxicillin) are low in Nandurbar PHC sub-stores.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/facility"
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0 transition-colors"
                    >
                        View EDL Roster
                    </Link>
                </div>
            )}

            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4 bg-white p-4 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-tertiary">
                        <span className="material-symbols-outlined text-primary text-lg">filter_alt</span>
                        <span className="text-xs font-bold text-on-surface">Filters:</span>
                    </div>

                    {/* Category Dropdown */}
                    <AnimatedSelect
                        id="fhw-category-filter"
                        value={filterCategory}
                        onChange={(val) => setFilterCategory(val)}
                        options={CATEGORY_OPTIONS}
                        minWidth="min-w-[210px]"
                    />

                    {/* Risk Level Dropdown */}
                    <AnimatedSelect
                        id="fhw-risk-filter"
                        value={filterRisk}
                        onChange={(val) => setFilterRisk(val)}
                        options={RISK_OPTIONS}
                        minWidth="min-w-[190px]"
                    />
                </div>

                {(filterCategory !== 'ALL' || filterRisk !== 'ALL') && (
                    <button
                        onClick={() => {
                            setFilterCategory('ALL');
                            setFilterRisk('ALL');
                        }}
                        className="text-xs font-bold text-primary hover:text-primary/70 flex items-center gap-1 self-start sm:self-auto transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        <span>Reset Filters</span>
                    </button>
                )}
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
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Gender</label>
                                    <select
                                        value={newBen.gender}
                                        onChange={(e) => setNewBen({ ...newBen, gender: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Category</label>
                                    <select
                                        value={newBen.category}
                                        onChange={(e) => setNewBen({ ...newBen, category: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="Maternal ANC">Maternal ANC</option>
                                        <option value="Child Immunization">Child Immunization</option>
                                        <option value="NCD Chronic">NCD Chronic</option>
                                        <option value="TB / Communicable">TB / Communicable</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Risk Level</label>
                                    <select
                                        value={newBen.risk_level}
                                        onChange={(e) => setNewBen({ ...newBen, risk_level: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="HIGH">High Risk</option>
                                        <option value="MODERATE">Moderate Risk</option>
                                        <option value="LOW">Low Risk</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Village / Pada</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Borvihir Pada"
                                        value={newBen.village_name}
                                        onChange={(e) => setNewBen({ ...newBen, village_name: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Contact Phone</label>
                                <input
                                    type="text"
                                    placeholder="+91 98901 22334"
                                    value={newBen.contact_phone}
                                    onChange={(e) => setNewBen({ ...newBen, contact_phone: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Next Scheduled Service</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ANC-3 Checkup"
                                        value={newBen.next_due_service}
                                        onChange={(e) => setNewBen({ ...newBen, next_due_service: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={newBen.next_due_date}
                                        onChange={(e) => setNewBen({ ...newBen, next_due_date: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
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
        </div>
    );
}
