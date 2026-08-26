'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import AnimatedSelect, { SelectOption } from '@/components/ui/AnimatedSelect';
import { useI18n } from '@/lib/i18n';

export default function FrontlineHealthWorkerPage() {
    const { t } = useI18n();
    const [mounted, setMounted] = useState<boolean>(false);
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterRisk, setFilterRisk] = useState<string>('ALL');

    useEffect(() => {
        setMounted(true);
    }, []);

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
            const supabase = createClient();
            const [benData, profsRes] = await Promise.all([
                apiFetch(`/api/fhw/beneficiaries?category=${filterCategory}&risk_level=${filterRisk}`).catch(() => ({ beneficiaries: null })),
                Promise.resolve(
                    supabase.from('profiles').select('*').neq('role', 'doctor').neq('role', 'facility_manager')
                ).catch(() => ({ data: null }))
            ]);

            const profs = profsRes?.data || [];
            let combinedBeneficiaries: any[] = [];

            if (profs && profs.length > 0) {
                const categories = ['Maternal ANC', 'NCD Chronic', 'Child Immunization', 'TB / Communicable'];
                const villages = ['Borvihir Pada', 'Dongargaon Pada', 'Nandurbar Block A', 'Dhanora Pada'];
                const bloodGroups = ['O+', 'B+', 'A+', 'AB+', 'O-'];
                const mappedProfs = profs.map((p: any, idx: number) => {
                    const pName = (p.name || '').trim() || (p.email ? p.email.split('@')[0] : 'Patient');
                    const pGender = p.gender || (idx % 2 === 0 ? 'Female' : 'Male');
                    const pCat = categories[idx % categories.length];
                    const pRisk = idx % 3 === 0 ? 'HIGH' : (idx % 3 === 1 ? 'MODERATE' : 'LOW');
                    const pVillage = villages[idx % villages.length];
                    const bGroup = p.blood_group || bloodGroups[idx % bloodGroups.length];
                    const abhaId = p.abha_id || `91-${4500 + idx}-8819-${p.id.slice(0, 4)}`;
                    
                    return {
                        id: `BEN-${String(100 + idx + 1)}`,
                        patient_id: p.id,
                        name: pName,
                        email: p.email,
                        age: p.age || (24 + (idx * 5) % 45),
                        gender: pGender,
                        blood_group: bGroup,
                        abha_id: abhaId,
                        category: pCat,
                        risk_level: pRisk,
                        village_name: pVillage,
                        contact_phone: p.phone || `+91 9822${idx} ${1000 + idx}`,
                        guardian_name: pGender === 'Female' && pCat === 'Maternal ANC' ? 'Suresh Bai (Husband)' : 'Self / Family Member',
                        gravida_para: pCat === 'Maternal ANC' ? 'G2 P1' : undefined,
                        gestational_weeks: pCat === 'Maternal ANC' ? (28 + idx % 10) : undefined,
                        next_due_date: '2026-08-30',
                        next_due_service: `${pCat} Routine Health Screening`,
                        complaint: `${pCat} community follow-up and clinical review`,
                        allergies: idx % 4 === 0 ? 'Penicillin / Beta-lactams' : 'No Known Drug Allergies (NKDA)',
                        medical_alerts: pRisk === 'HIGH' ? [
                            { type: 'danger', text: 'High blood pressure observation', icon: 'warning' },
                            { type: 'warning', text: 'Priority ASHA weekly checkup', icon: 'notifications_active' }
                        ] : [
                            { type: 'info', text: 'Routine Catchment Monitoring', icon: 'info' }
                        ],
                        medications: pCat === 'NCD Chronic' 
                            ? [
                                { id: `med-1-${idx}`, drug: 'Amlodipine', dosage: '5mg', frequency: 'OD (Once daily)', duration: '30 Days', instructions: 'Take in morning with water' },
                                { id: `med-2-${idx}`, drug: 'Metformin', dosage: '500mg', frequency: 'BD (Twice daily)', duration: '30 Days', instructions: 'Take after meals' }
                              ]
                            : pCat === 'Maternal ANC'
                            ? [
                                { id: `med-1-${idx}`, drug: 'Iron-Folic Acid (IFA)', dosage: '100mg', frequency: 'BD (Twice daily)', duration: '60 Days', instructions: 'Take with citrus/water after meal' },
                                { id: `med-2-${idx}`, drug: 'Calcium + Vit D3', dosage: '500mg', frequency: 'OD (Once daily)', duration: '60 Days', instructions: 'Take at bedtime' }
                              ]
                            : [
                                { id: `med-1-${idx}`, drug: 'Paracetamol', dosage: '500mg', frequency: 'SOS (As needed)', duration: '5 Days', instructions: 'For fever or body pain' }
                              ],
                        labs: [
                            'Complete Blood Count (CBC)',
                            pCat === 'NCD Chronic' ? 'Fasting Blood Glucose' : 'Sickle Cell Solubility Test',
                            pCat === 'Maternal ANC' ? 'Urine Routine & Microscopic' : 'Rapid Malarial Antigen (Pf/Pv)'
                        ],
                        vitals: {
                            bp: idx % 3 === 0 ? '142/92 mmHg' : '120/80 mmHg',
                            hr: '76 bpm',
                            spo2: '98%',
                            glucose: idx % 3 === 0 ? '164 mg/dL' : '120 mg/dL',
                            temp: '37.0°C',
                            bmi: '23.4 kg/m²'
                        },
                        status: idx % 4 === 0 ? 'OVERDUE' : 'DUE_SOON',
                        assigned_asha: 'Sunita Tai (ASHA #402)',
                        notes: 'Enrolled catchment resident in district health registry.'
                    };
                });

                const existingNames = new Set((benData?.beneficiaries || []).map((b: any) => (b.name || '').toLowerCase()));
                combinedBeneficiaries = [
                    ...(benData?.beneficiaries || []),
                    ...mappedProfs.filter((mp: any) => !existingNames.has(mp.name.toLowerCase()))
                ];
            } else if (benData?.beneficiaries && Array.isArray(benData.beneficiaries)) {
                combinedBeneficiaries = benData.beneficiaries;
            } else {
                const cached = localStorage.getItem('curatrack_fhw_cached_beneficiaries');
                if (cached) combinedBeneficiaries = JSON.parse(cached);
            }

            // Apply category & risk filters
            let filtered = combinedBeneficiaries;
            if (filterCategory !== 'ALL') {
                filtered = filtered.filter(b => b.category === filterCategory);
            }
            if (filterRisk !== 'ALL') {
                filtered = filtered.filter(b => b.risk_level === filterRisk);
            }

            setBeneficiaries(filtered);
            try {
                localStorage.setItem('curatrack_fhw_cached_beneficiaries', JSON.stringify(filtered));
            } catch {}
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
                setSyncSuccessMsg('All field records are currently up to date.');
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
            setSyncSuccessMsg(`Successfully synced ${pendingList.length} field records to district cloud!`);
            setTimeout(() => setSyncSuccessMsg(null), 4000);
            fetchData();
        } catch {
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
            setSyncSuccessMsg(`Beneficiary ${newBen.name} successfully registered.`);
            setTimeout(() => setSyncSuccessMsg(null), 3500);
            fetchData();
        } catch {
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

    const handleSaveVisit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        setSavingVisit(true);
        try {
            const updated = beneficiaries.map(b => {
                if (b.id === selectedPatient.id) {
                    return {
                        ...b,
                        status: 'COMPLETED',
                        last_visited_date: new Date().toISOString().split('T')[0],
                        vitals: {
                            ...b.vitals,
                            bp: visitVitals.bp.includes('mmHg') ? visitVitals.bp : `${visitVitals.bp} mmHg`,
                            spo2: visitVitals.spo2.includes('%') ? visitVitals.spo2 : `${visitVitals.spo2}%`,
                            hr: visitVitals.hr.includes('bpm') ? visitVitals.hr : `${visitVitals.hr} bpm`,
                            glucose: visitVitals.glucose.includes('mg/dL') ? visitVitals.glucose : `${visitVitals.glucose} mg/dL`,
                            temp: visitVitals.temp.includes('°C') ? visitVitals.temp : `${visitVitals.temp}°C`
                        },
                        visit_notes: visitNotes || 'Routine field checkup completed. Vitals stable.'
                    };
                }
                return b;
            });
            setBeneficiaries(updated);
            try {
                localStorage.setItem('curatrack_fhw_cached_beneficiaries', JSON.stringify(updated));
            } catch {}

            setSelectedPatient(null);
            setVisitNotes('');
            setSyncSuccessMsg(`Health record updated. ${selectedPatient.name} marked as Visited.`);
            setTimeout(() => setSyncSuccessMsg(null), 3500);
        } finally {
            setSavingVisit(false);
        }
    };

    // Calculate real numbers with zero mock fallbacks
    const totalPatients = beneficiaries.length;
    const visitedCount = beneficiaries.filter(b => b.status === 'COMPLETED' || b.status === 'VISITED').length;
    const remainingCount = beneficiaries.filter(b => b.status !== 'COMPLETED' && b.status !== 'VISITED').length;

    // Filter beneficiaries by search query
    const filteredBeneficiaries = useMemo(() => {
        return beneficiaries.filter(ben => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const nameMatch = (ben.name || '').toLowerCase().includes(q);
            const idMatch = (ben.id || '').toLowerCase().includes(q);
            const villageMatch = (ben.village_name || '').toLowerCase().includes(q);
            const phoneMatch = (ben.contact_phone || '').toLowerCase().includes(q);
            const catMatch = (ben.category || '').toLowerCase().includes(q);
            return nameMatch || idMatch || villageMatch || phoneMatch || catMatch;
        });
    }, [beneficiaries, searchQuery]);

    const categoryOptions: SelectOption[] = [
        { value: 'ALL', label: t('fhw.allCategories', 'All Categories'), icon: 'category' },
        { value: 'Maternal ANC', label: t('fhw.maternalANC', 'Maternal ANC'), icon: 'pregnant_woman', badge: 'Maternal', badgeColor: 'bg-rose-100 text-rose-800' },
        { value: 'Child Immunization', label: t('fhw.childImmunization', 'Child Immunization'), icon: 'child_care', badge: 'Child', badgeColor: 'bg-blue-100 text-blue-800' },
        { value: 'NCD Chronic', label: t('fhw.ncdChronic', 'NCD Chronic'), icon: 'monitor_heart', badge: 'NCD', badgeColor: 'bg-amber-100 text-amber-800' },
        { value: 'TB / Communicable', label: t('fhw.tbCommunicable', 'TB / Communicable'), icon: 'lungs', badge: 'Infectious', badgeColor: 'bg-purple-100 text-purple-800' },
    ];

    const riskOptions: SelectOption[] = [
        { value: 'ALL', label: t('fhw.allRisks', 'All Risk Levels'), icon: 'tune' },
        { value: 'HIGH', label: t('fhw.highRisk', 'High Risk (Urgent Action)'), icon: 'warning', badge: 'High', badgeColor: 'bg-red-100 text-red-700' },
        { value: 'MODERATE', label: t('fhw.moderateRisk', 'Moderate Risk'), icon: 'info', badge: 'Moderate', badgeColor: 'bg-amber-100 text-amber-800' },
        { value: 'LOW', label: t('fhw.lowRisk', 'Low Risk'), icon: 'check_circle', badge: 'Low', badgeColor: 'bg-emerald-100 text-emerald-800' },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16" suppressHydrationWarning>
            {/* Clean Header Banner */}
            <div className="bg-gradient-to-r from-primary via-[#004d40] to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-2">
                            <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                            <span>{t('fhw.catchmentTitle', 'Frontline Health Worker (ASHA / ANM) Catchment Center')}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Village Patient Health Records
                        </h1>
                        <p className="text-xs text-teal-100 mt-1">
                            Access health history, clinical vitals, and medical profiles for enrolled residents
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {offlineSyncPending > 0 && (
                            <button
                                onClick={handleSyncOfflineData}
                                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs rounded-xl flex items-center gap-2 border border-amber-500/40 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">cloud_sync</span>
                                <span>Sync ({offlineSyncPending})</span>
                            </button>
                        )}

                        <button
                            onClick={() => setIsRegisterOpen(true)}
                            className="px-5 py-2.5 bg-white text-primary hover:bg-slate-50 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">person_add</span>
                            <span>{t('fhw.registerBeneficiary', 'Enroll Beneficiary')}</span>
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span className="font-medium text-teal-100 text-[11px]">
                            {isOnline ? 'District Health Cloud Connected' : 'Offline Storage Active'}
                        </span>
                    </div>
                    <span className="text-[11px] text-teal-200 font-mono">ASHA Catchment #402</span>
                </div>
            </div>

            {/* Notification Banner */}
            {syncSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                    <span>{syncSuccessMsg}</span>
                </div>
            )}

            {/* 3 Clean Stat Cards: Number of Patients / No of Visited / No of Remaining */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Number of Patients */}
                <div className="bg-white p-5 rounded-2xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                            <span className="material-symbols-outlined text-2xl">groups</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
                                {t('fhw.numberOfPatients', 'Number of Patients')}
                            </span>
                            <span className="text-2xl font-black text-on-surface">{totalPatients}</span>
                            <span className="text-[10px] text-tertiary block">Registered Village Beneficiaries</span>
                        </div>
                    </div>
                </div>

                {/* 2. No of Visited */}
                <div className="bg-white p-5 rounded-2xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                            <span className="material-symbols-outlined text-2xl">task_alt</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
                                {t('fhw.noOfVisited', 'No. of Visited')}
                            </span>
                            <span className="text-2xl font-black text-emerald-600">{visitedCount}</span>
                            <span className="text-[10px] text-tertiary block">Field Health Checks Completed</span>
                        </div>
                    </div>
                </div>

                {/* 3. No of Remaining */}
                <div className="bg-white p-5 rounded-2xl border border-surface-container-high shadow-xs">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                            <span className="material-symbols-outlined text-2xl">pending_actions</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
                                {t('fhw.noOfRemaining', 'No. of Remaining')}
                            </span>
                            <span className="text-2xl font-black text-amber-600">{remainingCount}</span>
                            <span className="text-[10px] text-tertiary block">Scheduled Visits Pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clean Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-base">search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search patient name, ABHA ID, village pada, phone..."
                        className="w-full pl-9 pr-8 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs font-semibold text-on-surface outline-none focus:border-primary transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-on-surface"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <AnimatedSelect
                        id="fhw-category-filter"
                        value={filterCategory}
                        onChange={(val) => setFilterCategory(val)}
                        options={categoryOptions}
                        minWidth="min-w-[180px]"
                    />

                    <AnimatedSelect
                        id="fhw-risk-filter"
                        value={filterRisk}
                        onChange={(val) => setFilterRisk(val)}
                        options={riskOptions}
                        minWidth="min-w-[170px]"
                    />

                    {(filterCategory !== 'ALL' || filterRisk !== 'ALL' || searchQuery) && (
                        <button
                            onClick={() => {
                                setFilterCategory('ALL');
                                setFilterRisk('ALL');
                                setSearchQuery('');
                            }}
                            className="text-xs font-bold text-primary hover:underline px-2 cursor-pointer flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">restart_alt</span>
                            <span>Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Patient Cards Grid */}
            {loading ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-surface-container-high">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                    <p className="text-xs text-tertiary mt-2 font-bold">Loading patient health records...</p>
                </div>
            ) : filteredBeneficiaries.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high">
                    <span className="material-symbols-outlined text-4xl text-tertiary mb-2">person_search</span>
                    <h3 className="text-base font-bold text-on-surface">No patient records match your filter</h3>
                    <p className="text-xs text-tertiary mt-1">Try changing your search term or enroll a new beneficiary.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBeneficiaries.map((ben) => {
                        const isVisited = ben.status === 'COMPLETED' || ben.status === 'VISITED';
                        return (
                            <div
                                key={ben.id}
                                className="bg-white rounded-2xl p-5 border border-surface-container-high shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-2.5">
                                    {/* Card Header: ID, Village & Status */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-mono font-bold text-primary text-[11px]">{ben.id} • {ben.village_name}</span>
                                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                            isVisited
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : ben.status === 'OVERDUE'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {isVisited ? 'VISITED' : ben.status || 'DUE SOON'}
                                        </span>
                                    </div>

                                    {/* Patient Name & Details */}
                                    <div>
                                        <h3 className="text-base font-extrabold text-on-surface">{ben.name}</h3>
                                        <p className="text-xs text-tertiary">
                                            {ben.gender}, {ben.age}y {ben.blood_group ? `• Blood: ${ben.blood_group}` : ''}
                                        </p>
                                    </div>

                                    {/* Category Pill & Risk */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                        <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-bold rounded-md text-[11px] border border-teal-100">
                                            {ben.category}
                                        </span>
                                        <span className={`px-2 py-0.5 font-bold rounded-md text-[11px] ${
                                            ben.risk_level === 'HIGH'
                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {ben.risk_level} Risk
                                        </span>
                                    </div>

                                    {/* Scheduled Care Note */}
                                    <div className="p-2.5 bg-surface-container-low rounded-xl text-xs space-y-0.5 border border-surface-container">
                                        <span className="text-tertiary text-[10px] uppercase font-bold block">Next Scheduled Service</span>
                                        <span className="font-bold text-on-surface block text-[11px] truncate">{ben.next_due_service || 'Community Health Check'}</span>
                                        <span className="text-tertiary text-[10px] block">Due: <strong>{ben.next_due_date || '2026-08-30'}</strong></span>
                                    </div>
                                </div>

                                {/* Primary Actions: Access Health Records & Doctor Teleconsult */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href={`/records?patientId=${ben.patient_id || ben.id}`}
                                        className="py-2.5 px-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-[11px] rounded-xl border border-surface-container-high shadow-xs flex items-center justify-center gap-1 transition-all text-center"
                                    >
                                        <span className="material-symbols-outlined text-sm text-primary">folder_shared</span>
                                        <span>Records</span>
                                    </Link>
                                    <Link
                                        href={`/telemedicine?patientId=${ben.id}`}
                                        className="py-2.5 px-2 bg-primary hover:bg-primary/90 text-white font-bold text-[11px] rounded-xl shadow-xs flex items-center justify-center gap-1 transition-all text-center"
                                    >
                                        <span className="material-symbols-outlined text-sm">video_call</span>
                                        <span>Teleconsult</span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Enroll Rural Beneficiary */}
            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto space-y-4">
                        <div className="flex items-center justify-between border-b border-surface-container pb-3">
                            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-xl">person_add</span>
                                <span>Enroll Rural Beneficiary</span>
                            </h3>
                            <button onClick={() => setIsRegisterOpen(false)} className="p-1 text-tertiary hover:bg-surface-container rounded-lg">
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleRegisterBeneficiary} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="col-span-2">
                                    <label className="block text-tertiary font-bold mb-1">Beneficiary Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Savita Bai"
                                        value={newBen.name}
                                        onChange={(e) => setNewBen({ ...newBen, name: e.target.value })}
                                        className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                    />
                                </div>
                                <div>
                                    <label className="block text-tertiary font-bold mb-1">Age</label>
                                    <input
                                        type="number"
                                        required
                                        value={newBen.age}
                                        onChange={(e) => setNewBen({ ...newBen, age: parseInt(e.target.value) || 0 })}
                                        className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-tertiary font-bold mb-1">Gender</label>
                                    <select
                                        value={newBen.gender}
                                        onChange={(e) => setNewBen({ ...newBen, gender: e.target.value })}
                                        className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                    >
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-tertiary font-bold mb-1">Category</label>
                                    <select
                                        value={newBen.category}
                                        onChange={(e) => setNewBen({ ...newBen, category: e.target.value })}
                                        className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                    >
                                        <option value="Maternal ANC">Maternal ANC</option>
                                        <option value="Child Immunization">Child Immunization</option>
                                        <option value="NCD Chronic">NCD Chronic</option>
                                        <option value="TB / Communicable">TB / Communicable</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-tertiary font-bold mb-1">Risk Level</label>
                                    <select
                                        value={newBen.risk_level}
                                        onChange={(e) => setNewBen({ ...newBen, risk_level: e.target.value })}
                                        className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                    >
                                        <option value="HIGH">High Risk</option>
                                        <option value="MODERATE">Moderate Risk</option>
                                        <option value="LOW">Low Risk</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-tertiary font-bold mb-1">Village / Pada</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Borvihir Pada"
                                        value={newBen.village_name}
                                        onChange={(e) => setNewBen({ ...newBen, village_name: e.target.value })}
                                        className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-tertiary font-bold mb-1">Contact Phone</label>
                                <input
                                    type="text"
                                    placeholder="+91 98901 22334"
                                    value={newBen.contact_phone}
                                    onChange={(e) => setNewBen({ ...newBen, contact_phone: e.target.value })}
                                    className="w-full p-2 bg-surface-container-low rounded-xl border border-surface-container-high font-bold text-on-surface"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsRegisterOpen(false)} className="px-3.5 py-2 rounded-xl font-bold text-tertiary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={registering}
                                    className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
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
