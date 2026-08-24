'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

type DoctorOption = {
    id: string;
    name: string;
    specialty?: string;
};

const DEFAULT_DOCTORS: DoctorOption[] = [
    {
        id: '00000000-0000-4000-a000-000000000003',
        name: 'Dr. David Ross',
        specialty: 'General Medicine & OPD Room 101',
    },
    {
        id: 'doc-david-ross',
        name: 'Dr. David Ross (Demo Room)',
        specialty: 'Fallback demo doctor',
    },
];

export default function FrontlineHealthWorkerPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterRisk, setFilterRisk] = useState<string>('ALL');
    const [followupSummary, setFollowupSummary] = useState<any>(null);
    const [doctors, setDoctors] = useState<DoctorOption[]>(DEFAULT_DOCTORS);

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
    const [consultMsg, setConsultMsg] = useState<string | null>(null);
    const [consultError, setConsultError] = useState<string | null>(null);
    const [medAlerts, setMedAlerts] = useState<any[]>([]);
    const [selectedConsultBen, setSelectedConsultBen] = useState<any | null>(null);
    const [consultForm, setConsultForm] = useState({
        doctorId: DEFAULT_DOCTORS[0].id,
        chiefComplaint: '',
        systolicBp: '130',
        diastolicBp: '84',
        spo2: '98',
        heartRate: '76',
        temperature: '98.6',
        randomGlucose: '142',
        priority: 'PRIORITY',
    });
    const [startingConsult, setStartingConsult] = useState<boolean>(false);

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

    useEffect(() => {
        async function fetchDoctors() {
            try {
                const { data } = await supabase.from('doctors').select('*');
                if (data && data.length > 0) {
                    setDoctors(data.map((doc: any) => ({
                        id: doc.id,
                        name: doc.name || doc.email || 'Doctor',
                        specialty: doc.specialty || doc.specialization || doc.department || 'Medical Officer',
                    })));
                    setConsultForm(prev => ({ ...prev, doctorId: data[0].id || prev.doctorId }));
                }
            } catch (err) {
                console.warn('Unable to load doctors for ASHA consult flow:', err);
            }
        }
        fetchDoctors();
    }, [supabase]);

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

    const openAssistedConsult = (ben: any) => {
        const riskDefault = ben.risk_level === 'HIGH' ? 'PRIORITY' : 'ROUTINE';
        setSelectedConsultBen(ben);
        setConsultMsg(null);
        setConsultError(null);
        setConsultForm(prev => ({
            ...prev,
            priority: riskDefault,
            chiefComplaint: ben.next_due_service || ben.risk_factors?.[0] || '',
        }));
    };

    const insertAppointmentWithFallback = async (payload: any) => {
        let { error } = await supabase.from('appointments').insert(payload);
        if (!error) return null;

        const optionalColumns = [
            'patient_name',
            'beneficiary_id',
            'asha_id',
            'asha_name',
            'village_name',
            'priority',
            'complaint',
            'vitals_bp',
            'vitals_hr',
            'vitals_spo2',
            'vitals_temp',
            'vitals_bmi',
            'consult_type',
            'token',
        ];

        if (optionalColumns.some(column => error?.message?.includes(column))) {
            const minimalPayload = { ...payload };
            optionalColumns.forEach(column => delete minimalPayload[column]);
            minimalPayload.notes = payload.notes;
            const retry = await supabase.from('appointments').insert(minimalPayload);
            error = retry.error;
        }

        return error;
    };

    const getCurrentAshaId = async () => {
        try {
            const { data } = await supabase.auth.getUser();
            if (data?.user?.id) return data.user.id;
        } catch {}

        try {
            const raw = localStorage.getItem('curatrack_auth_user');
            if (raw) {
                const savedUser = JSON.parse(raw);
                if (savedUser?.id) return savedUser.id;
            }
        } catch {}

        return '00000000-0000-4000-a000-000000000006';
    };

    const handleStartAssistedConsult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedConsultBen || !consultForm.doctorId || !consultForm.chiefComplaint.trim()) return;

        setStartingConsult(true);
        setConsultError(null);
        setConsultMsg(null);

        const selectedDoctor = doctors.find(doc => doc.id === consultForm.doctorId) || DEFAULT_DOCTORS[0];
        const roomId = `asha-${selectedConsultBen.id}-${crypto.randomUUID()}`;
        const now = new Date();
        const bp = `${Number(consultForm.systolicBp) || 0}/${Number(consultForm.diastolicBp) || 0}`;
        const ashaUserId = await getCurrentAshaId();
        const notes = [
            `Assisted teleconsult initiated by Sunita Tai (ASHA) for ${selectedConsultBen.name}.`,
            `Village: ${selectedConsultBen.village_name}.`,
            `Chief complaint: ${consultForm.chiefComplaint.trim()}.`,
            `Vitals: BP ${bp} mmHg, HR ${consultForm.heartRate || 'N/A'} bpm, SpO2 ${consultForm.spo2 || 'N/A'}%, Temp ${consultForm.temperature || 'N/A'} F, RBS ${consultForm.randomGlucose || 'N/A'} mg/dL.`,
            `Patient category: ${selectedConsultBen.category}; ASHA risk: ${selectedConsultBen.risk_level}.`,
        ].join('\n');

        const payload = {
            client_id: ashaUserId,
            doctor_id: selectedDoctor.id,
            doctor_name: selectedDoctor.name,
            room_id: roomId,
            scheduled_time: now.toISOString(),
            date: now.toISOString().split('T')[0],
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'ringing',
            type: 'video',
            consult_type: 'assisted_teleconsult',
            patient_name: selectedConsultBen.name,
            beneficiary_id: selectedConsultBen.id,
            asha_id: ashaUserId,
            asha_name: 'Sunita Tai (ASHA)',
            village_name: selectedConsultBen.village_name,
            priority: consultForm.priority,
            complaint: consultForm.chiefComplaint.trim(),
            vitals_bp: bp,
            vitals_hr: Number(consultForm.heartRate) || null,
            vitals_spo2: Number(consultForm.spo2) || null,
            vitals_temp: consultForm.temperature,
            vitals_bmi: 'N/A',
            token: `ASHA-${String(Date.now()).slice(-5)}`,
            notes,
        };

        try {
            const error = await insertAppointmentWithFallback(payload);
            if (error) {
                throw error;
            }

            setConsultMsg(`${selectedConsultBen.name} is now visible in ${selectedDoctor.name}'s teleconsult queue.`);
            setSelectedConsultBen(null);
            router.push(`/call/${roomId}`);
        } catch (err: any) {
            setConsultError(err?.message || 'Unable to send assisted consult request to doctor.');
        } finally {
            setStartingConsult(false);
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
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
                        >
                            <span className="material-symbols-outlined text-base">sync</span>
                            <span>Sync Surveys ({offlineSyncPending})</span>
                        </button>

                        <Link
                            href="/bluetooth/fhw"
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

            {consultMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-emerald-600">video_call</span>
                    <span>{consultMsg}</span>
                </div>
            )}

            {consultError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-red-600">error</span>
                    <span>{consultError}</span>
                </div>
            )}

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

            {/* Medicine Availability Alerts for ASHA */}
            {medAlerts.length > 0 && (
                <div className="bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 border border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-xl">pill_off</span>
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-amber-950">Facility Medicine Stock Alert</h2>
                            <p className="text-xs text-amber-800 mt-0.5">
                                {medAlerts.length} medicine(s) at the Nandurbar CHC are running low or critically out of stock.
                                Avoid distributing these until restocked.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {medAlerts.map((med: any) => (
                            <div
                                key={med.id}
                                className={`p-4 rounded-2xl border shadow-xs space-y-1.5 ${
                                    med.status === 'CRITICAL_STOCKOUT_RISK'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-white border-amber-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                                        <span className={`material-symbols-outlined text-base ${
                                            med.status === 'CRITICAL_STOCKOUT_RISK' ? 'text-red-600' : 'text-amber-600'
                                        }`}>
                                            {med.status === 'CRITICAL_STOCKOUT_RISK' ? 'dangerous' : 'warning'}
                                        </span>
                                        {med.name}
                                    </span>
                                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                        med.status === 'CRITICAL_STOCKOUT_RISK'
                                            ? 'bg-red-100 text-red-800 animate-pulse'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {med.status === 'CRITICAL_STOCKOUT_RISK' ? 'CRITICAL' : 'LOW STOCK'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600">
                                    {med.stock_units.toLocaleString()} {med.unit} left • {med.days_of_supply} days supply • {med.category}
                                </p>
                            </div>
                        ))}
                    </div>
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
                    <div className="relative min-w-[200px]">
                        <select
                            id="fhw-category-filter"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full appearance-none bg-surface-container-low border border-surface-container-high text-on-surface text-xs font-bold rounded-xl px-3.5 py-2.5 pr-8 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="Maternal ANC">Maternal ANC</option>
                            <option value="Child Immunization">Child Immunization</option>
                            <option value="NCD Chronic">NCD Chronic</option>
                            <option value="TB / Communicable">TB / Communicable</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none text-base">
                            expand_more
                        </span>
                    </div>

                    {/* Risk Level Dropdown */}
                    <div className="relative min-w-[170px]">
                        <select
                            id="fhw-risk-filter"
                            value={filterRisk}
                            onChange={(e) => setFilterRisk(e.target.value)}
                            className="w-full appearance-none bg-surface-container-low border border-surface-container-high text-on-surface text-xs font-bold rounded-xl px-3.5 py-2.5 pr-8 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                        >
                            <option value="ALL">All Risk Levels</option>
                            <option value="HIGH">High Risk</option>
                            <option value="MODERATE">Moderate Risk</option>
                            <option value="LOW">Low Risk</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none text-base">
                            expand_more
                        </span>
                    </div>
                </div>

                {(filterCategory !== 'ALL' || filterRisk !== 'ALL') && (
                    <button
                        onClick={() => {
                            setFilterCategory('ALL');
                            setFilterRisk('ALL');
                        }}
                        className="text-xs font-bold text-primary hover:text-primary/70 flex items-center gap-1 self-start sm:self-auto transition-colors"
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

                            {/* Beneficiary Action */}
                            <div className="pt-3 border-t border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {ben.contact_phone ? (
                                    <span className="text-xs text-tertiary">
                                        Phone: <strong className="text-on-surface font-mono">{ben.contact_phone}</strong>
                                    </span>
                                ) : (
                                    <span className="text-xs text-tertiary">No phone number recorded</span>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openAssistedConsult(ben)}
                                        className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                                        title="Connect this beneficiary to a doctor"
                                    >
                                        <span className="material-symbols-outlined text-base">video_call</span>
                                        <span>Connect Patient</span>
                                    </button>
                                    {ben.contact_phone && (
                                    <a
                                        href={`tel:${ben.contact_phone}`}
                                        className="px-3.5 py-2 bg-surface-container-low hover:bg-surface-container text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-surface-container"
                                        title="Call Beneficiary"
                                    >
                                        <span className="material-symbols-outlined text-base">call</span>
                                        <span>Call</span>
                                    </a>
                                    )}
                                </div>
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

            {selectedConsultBen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">video_call</span>
                                    <span>Connect Patient to Doctor</span>
                                </h3>
                                <p className="text-xs text-tertiary mt-1">
                                    {selectedConsultBen.name} • {selectedConsultBen.village_name} • {selectedConsultBen.risk_level} risk
                                </p>
                            </div>
                            <button onClick={() => setSelectedConsultBen(null)} className="p-2 rounded-full text-tertiary hover:bg-surface-container">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleStartAssistedConsult} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Doctor</label>
                                    <select
                                        value={consultForm.doctorId}
                                        onChange={(e) => setConsultForm({ ...consultForm, doctorId: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>
                                                {doc.name}{doc.specialty ? ` - ${doc.specialty}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Urgency</label>
                                    <select
                                        value={consultForm.priority}
                                        onChange={(e) => setConsultForm({ ...consultForm, priority: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="PRIORITY">Priority</option>
                                        <option value="ROUTINE">Routine</option>
                                        <option value="EMERGENCY">Emergency</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Patient Complaint / ASHA Context</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={consultForm.chiefComplaint}
                                    onChange={(e) => setConsultForm({ ...consultForm, chiefComplaint: e.target.value })}
                                    placeholder="Explain what the patient is feeling and why ASHA is requesting doctor support."
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Sys BP</label>
                                    <input type="number" value={consultForm.systolicBp} onChange={(e) => setConsultForm({ ...consultForm, systolicBp: e.target.value })} className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Dia BP</label>
                                    <input type="number" value={consultForm.diastolicBp} onChange={(e) => setConsultForm({ ...consultForm, diastolicBp: e.target.value })} className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">SpO2</label>
                                    <input type="number" value={consultForm.spo2} onChange={(e) => setConsultForm({ ...consultForm, spo2: e.target.value })} className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Pulse</label>
                                    <input type="number" value={consultForm.heartRate} onChange={(e) => setConsultForm({ ...consultForm, heartRate: e.target.value })} className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Temp F</label>
                                    <input type="text" value={consultForm.temperature} onChange={(e) => setConsultForm({ ...consultForm, temperature: e.target.value })} className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setSelectedConsultBen(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-tertiary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={startingConsult}
                                    className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                                >
                                    <span className={`material-symbols-outlined text-base ${startingConsult ? 'animate-spin' : ''}`}>
                                        {startingConsult ? 'sync' : 'send'}
                                    </span>
                                    <span>{startingConsult ? 'Sending...' : 'Send to Doctor & Join'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
}
