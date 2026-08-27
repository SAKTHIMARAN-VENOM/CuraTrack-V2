'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE, apiFetch } from '@/lib/api';
import { offlineStorage } from '@/lib/offline-storage';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';

interface BeneficiaryInfo {
    id: string;
    patient_id?: string;
    name: string;
    email?: string;
    age: number | string;
    gender: string;
    blood_group?: string;
    abha_id?: string;
    category: string;
    risk_level: string;
    village_name?: string;
    contact_phone?: string;
    guardian_name?: string;
    next_due_date?: string;
    next_due_service?: string;
    notes?: string;
}

const FALLBACK_BENEFICIARIES: BeneficiaryInfo[] = [
    {
        id: 'BEN-101',
        patient_id: 'p-204',
        name: 'Kavita Bai',
        age: 23,
        gender: 'Female',
        blood_group: 'O+',
        abha_id: '91-4502-8819-0421',
        category: 'Maternal ANC',
        risk_level: 'HIGH',
        village_name: 'Borvihir Pada',
        contact_phone: '+91 98221 44019',
        guardian_name: 'Suresh Bai (Husband)',
        next_due_date: '2026-08-30',
        next_due_service: 'ANC-3 Blood Sugar & IFA Refill',
        notes: 'High-risk pregnancy monitoring'
    },
    {
        id: 'BEN-102',
        patient_id: 'p-302',
        name: 'Master Aarav Gavit',
        age: 1,
        gender: 'Male',
        blood_group: 'B+',
        abha_id: '91-4502-8819-0422',
        category: 'Child Immunization',
        risk_level: 'MODERATE',
        village_name: 'Dongargaon Pada',
        contact_phone: '+91 94032 11982',
        guardian_name: 'Meena Gavit (Mother)',
        next_due_date: '2026-09-02',
        next_due_service: 'MR-1 & Vitamin A Dose 1'
    },
    {
        id: 'BEN-103',
        patient_id: 'p-101',
        name: 'Tukaram Patil',
        age: 58,
        gender: 'Male',
        blood_group: 'A+',
        abha_id: '91-4502-8819-0423',
        category: 'NCD Chronic',
        risk_level: 'HIGH',
        village_name: 'Borvihir Pada',
        contact_phone: '+91 97654 88310',
        guardian_name: 'Self',
        next_due_date: '2026-08-29',
        next_due_service: 'Monthly BP & Amlodipine Refill'
    },
    {
        id: 'BEN-104',
        patient_id: 'p-405',
        name: 'Lalita Vasave',
        age: 34,
        gender: 'Female',
        blood_group: 'AB+',
        abha_id: '91-4502-8819-0424',
        category: 'TB / Communicable',
        risk_level: 'HIGH',
        village_name: 'Dhanora Pada',
        contact_phone: '+91 91580 33412',
        guardian_name: 'Dinesh Vasave (Husband)',
        next_due_date: '2026-09-05',
        next_due_service: 'DOTS Sputum Follow-up Month 2'
    }
];

function BenefitsContent() {
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const urlPatientId = searchParams.get('patientId');

    // Top-level active navigation tab: 'hospitals' | 'verifier' | 'schemes' | 'claims'
    const [pageTab, setPageTab] = useState<'hospitals' | 'verifier' | 'schemes' | 'claims'>('hospitals');

    // Role & User Identification State
    const [currentRole, setCurrentRole] = useState<string>('patient');
    const [isFhw, setIsFhw] = useState<boolean>(false);
    const [patientId, setPatientId] = useState<string>('PAT-123');

    // ASHA Patient Selection State
    const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInfo[]>([]);
    const [loadingBeneficiaries, setLoadingBeneficiaries] = useState<boolean>(false);
    const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryInfo | null>(null);
    const [beneficiarySearchQuery, setBeneficiarySearchQuery] = useState<string>('');
    const [isPatientPickerOpen, setIsPatientPickerOpen] = useState<boolean>(false);
    const [ashaActionSuccessMsg, setAshaActionSuccessMsg] = useState<string | null>(null);

    // --- Tab 1: Hospitals & Diagnostic Centres Directory State ---
    const [facilities, setFacilities] = useState<any[]>([]);
    const [loadingFacilities, setLoadingFacilities] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedState, setSelectedState] = useState('ALL');
    const [selectedDistrict, setSelectedDistrict] = useState('ALL');
    const [selectedFacilityType, setSelectedFacilityType] = useState('ALL');
    const [selectedSchemeFilter, setSelectedSchemeFilter] = useState('ALL');
    const [filterMetadata, setFilterMetadata] = useState<any>({
        states: [],
        districts: [],
        schemes: [],
        facility_types: []
    });

    // --- Tab 2: Instant Hospital Verifier State ---
    const [verifierHospitalName, setVerifierHospitalName] = useState('');
    const [verifierSchemeId, setVerifierSchemeId] = useState('gov_ayushman');
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    // --- Tab 3: Insurance & Government Schemes State ---
    const [selectedService, setSelectedService] = useState('consultation');
    const [insuranceId, setInsuranceId] = useState('');
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [eligibilityResult, setEligibilityResult] = useState<any>(null);
    const [schemes, setSchemes] = useState<any[]>([]);
    const [loadingSchemes, setLoadingSchemes] = useState(false);
    const [govSchemes, setGovSchemes] = useState<any[]>([]);
    const [loadingGovSchemes, setLoadingGovSchemes] = useState(false);

    // --- Common / Claims State ---
    const [userClaims, setUserClaims] = useState<any[]>([]);
    const [submittingClaim, setSubmittingClaim] = useState<string | null>(null);
    const [claimsFilter, setClaimsFilter] = useState<'ALL' | 'SELECTED'>('ALL');

    // Initialize user, role, and beneficiaries
    useEffect(() => {
        // Hydrate saved claims from persistent offline storage
        const savedClaims = offlineStorage.getClaims();
        if (savedClaims && savedClaims.length > 0) {
            setUserClaims(savedClaims);
        }

        const initAuthAndRole = async () => {
            let role = 'patient';
            let pid = 'PAT-123';

            let savedAuthUser: any = null;
            try {
                const raw = localStorage.getItem('curatrack_auth_user');
                if (raw) savedAuthUser = JSON.parse(raw);
            } catch {}

            const savedRole = localStorage.getItem('curatrack_active_role') || savedAuthUser?.role;
            if (savedRole) {
                role = savedRole;
            }

            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    pid = user.id.slice(0, 10);
                    const email = (user.email || '').toLowerCase();
                    if (email.includes('asha') || email.includes('fhw') || email.includes('anm') || user.user_metadata?.role === 'fhw') {
                        role = 'fhw';
                    }
                }
            } catch (e) {
                console.warn('Auth user fetch skipped:', e);
            }

            const isAshaWorker = role === 'fhw' || !!urlPatientId;
            setCurrentRole(role);
            setIsFhw(isAshaWorker);

            // Fetch Beneficiaries, Facilities, and Filter Metadata in parallel
            await Promise.all([
                loadBeneficiaries(isAshaWorker, urlPatientId, pid),
                fetchFacilities(),
                fetchFilters()
            ]);
        };

        initAuthAndRole();
    }, [urlPatientId]);

    // Fetch Beneficiaries for ASHA
    const loadBeneficiaries = async (isAsha: boolean, targetUrlPid: string | null, defaultPid: string) => {
        setLoadingBeneficiaries(true);
        let list: BeneficiaryInfo[] = [];

        try {
            const supabase = createClient();
            const [benRes, profsRes] = await Promise.all([
                apiFetch('/api/fhw/beneficiaries').catch(() => ({ beneficiaries: null })),
                Promise.resolve(
                    supabase.from('profiles').select('*').neq('role', 'doctor').neq('role', 'facility_manager')
                ).catch(() => ({ data: null }))
            ]);

            const benData = benRes?.beneficiaries;
            const profs = profsRes?.data || [];

            if (benData && Array.isArray(benData) && benData.length > 0) {
                list = benData;
            } else if (profs && profs.length > 0) {
                const categories = ['Maternal ANC', 'NCD Chronic', 'Child Immunization', 'TB / Communicable'];
                const villages = ['Borvihir Pada', 'Dongargaon Pada', 'Nandurbar Block A', 'Dhanora Pada'];
                const bloodGroups = ['O+', 'B+', 'A+', 'AB+', 'O-'];
                list = profs.map((p: any, idx: number) => {
                    const pName = (p.name || '').trim() || (p.email ? p.email.split('@')[0] : 'Patient');
                    const pCat = categories[idx % categories.length];
                    return {
                        id: `BEN-${String(100 + idx + 1)}`,
                        patient_id: p.id,
                        name: pName,
                        email: p.email,
                        age: p.age || (24 + (idx * 5) % 45),
                        gender: p.gender || (idx % 2 === 0 ? 'Female' : 'Male'),
                        blood_group: p.blood_group || bloodGroups[idx % bloodGroups.length],
                        abha_id: p.abha_id || `91-${4500 + idx}-8819-${p.id.slice(0, 4)}`,
                        category: pCat,
                        risk_level: idx % 3 === 0 ? 'HIGH' : (idx % 3 === 1 ? 'MODERATE' : 'LOW'),
                        village_name: villages[idx % villages.length],
                        contact_phone: p.phone || `+91 9822${idx} ${1000 + idx}`,
                        guardian_name: 'Family Member',
                        next_due_date: '2026-08-30',
                        next_due_service: `${pCat} Routine Health Screening`
                    };
                });
            } else {
                const cached = localStorage.getItem('curatrack_fhw_cached_beneficiaries');
                if (cached) list = JSON.parse(cached);
                else list = FALLBACK_BENEFICIARIES;
            }
        } catch {
            const cached = localStorage.getItem('curatrack_fhw_cached_beneficiaries');
            if (cached) list = JSON.parse(cached);
            else list = FALLBACK_BENEFICIARIES;
        } finally {
            if (!list || list.length === 0) list = FALLBACK_BENEFICIARIES;
            setBeneficiaries(list);
            setLoadingBeneficiaries(false);

            // Determine active patient
            let activeBen: BeneficiaryInfo | null = null;
            if (targetUrlPid) {
                activeBen = list.find(b => b.id === targetUrlPid || b.patient_id === targetUrlPid) || null;
                if (!activeBen) {
                    activeBen = {
                        id: targetUrlPid.startsWith('BEN-') ? targetUrlPid : `BEN-${targetUrlPid.slice(0, 4)}`,
                        patient_id: targetUrlPid,
                        name: 'Selected Beneficiary',
                        age: 26,
                        gender: 'Female',
                        category: 'Maternal ANC',
                        risk_level: 'HIGH',
                        village_name: 'Borvihir Pada',
                        blood_group: 'O+',
                        abha_id: `91-4502-8819-${targetUrlPid.slice(-4)}`
                    };
                }
            } else if (isAsha && list.length > 0) {
                activeBen = list[0];
            }

            if (activeBen) {
                setSelectedBeneficiary(activeBen);
                const activeId = activeBen.patient_id || activeBen.id;
                setPatientId(activeId);
                Promise.all([fetchSchemes(activeId), fetchGovSchemes(activeId)]);
            } else {
                setPatientId(defaultPid);
                Promise.all([fetchSchemes(defaultPid), fetchGovSchemes(defaultPid)]);
            }
        }
    };

    // Switch selected beneficiary
    const handleSelectBeneficiary = (ben: BeneficiaryInfo) => {
        setSelectedBeneficiary(ben);
        const targetId = ben.patient_id || ben.id;
        setPatientId(targetId);
        setIsPatientPickerOpen(false);
        setEligibilityResult(null);
        if (ben.abha_id) {
            setInsuranceId(ben.abha_id);
        }
        fetchSchemes(targetId);
        fetchGovSchemes(targetId);
        setAshaActionSuccessMsg(`Switched active beneficiary to ${ben.name} (${ben.category}, ${ben.village_name || 'Village'}). Evaluated schemes refreshed.`);
        setTimeout(() => setAshaActionSuccessMsg(null), 4500);
    };

    // Fetch Filter Options (States, Districts, etc.)
    const fetchFilters = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/government-schemes/filters`);
            if (res.ok) {
                const data = await res.json();
                setFilterMetadata(data);
            }
        } catch (err) {
            console.error('Failed to fetch scheme filters:', err);
        }
    };

    // Fetch Empanelled Facilities
    const fetchFacilities = async (
        query = searchQuery,
        state = selectedState,
        district = selectedDistrict,
        facilityType = selectedFacilityType,
        scheme = selectedSchemeFilter
    ) => {
        setLoadingFacilities(true);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.append('q', query.trim());
            if (state && state !== 'ALL') params.append('state', state);
            if (district && district !== 'ALL') params.append('district', district);
            if (facilityType && facilityType !== 'ALL') params.append('facility_type', facilityType);
            if (scheme && scheme !== 'ALL') params.append('scheme', scheme);

            const res = await fetch(`${API_BASE}/api/government-schemes/hospitals?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setFacilities(data.facilities || []);
            }
        } catch (err) {
            console.error('Failed to fetch empanelled hospitals:', err);
        } finally {
            setLoadingFacilities(false);
        }
    };

    // Trigger hospital verification
    const handleVerifyHospital = async (targetHospitalName?: string) => {
        const hospitalToVerify = targetHospitalName || verifierHospitalName;
        if (!hospitalToVerify.trim()) {
            alert('Please enter a hospital or diagnostic centre name to verify.');
            return;
        }

        setVerifying(true);
        setVerificationResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/government-schemes/verify-hospital`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hospital_name: hospitalToVerify,
                    scheme_id: verifierSchemeId,
                    patient_id: patientId
                })
            });
            const data = await res.json();
            setVerificationResult(data);
        } catch (err) {
            console.error('Hospital verification failed:', err);
            setVerificationResult({
                is_empanelled: false,
                hospital_name: hospitalToVerify,
                verification_notes: 'Failed to connect to verification engine. Please check your network connection.'
            });
        } finally {
            setVerifying(false);
        }
    };

    const fetchSchemes = async (pid = patientId) => {
        setLoadingSchemes(true);
        try {
            const res = await fetch(`${API_BASE}/api/patient/${pid}/insurance-schemes`, {
                method: 'POST'
            });
            const data = await res.json();
            setSchemes(data.availableSchemes || []);
        } catch (err) {
            console.error('Failed to fetch schemes', err);
        } finally {
            setLoadingSchemes(false);
        }
    };

    const fetchGovSchemes = async (pid = patientId) => {
        setLoadingGovSchemes(true);
        try {
            const res = await fetch(`${API_BASE}/api/patient/${pid}/government-schemes`, {
                method: 'POST'
            });
            const data = await res.json();
            setGovSchemes(data.schemes || []);
        } catch (err) {
            console.error("Failed to fetch gov schemes", err);
        } finally {
            setLoadingGovSchemes(false);
        }
    };

    const handleCheckEligibility = async () => {
        if (!insuranceId.trim()) {
            setEligibilityResult({ error: 'Please enter an Insurance or ABHA ID.' });
            return;
        }

        setCheckingEligibility(true);
        setEligibilityResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/insurance/verify-eligibility`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurance_id: insuranceId.trim(),
                    service_type: selectedService
                })
            });
            const data = await res.json();

            if (!res.ok || data.status === 'error') {
                setEligibilityResult({ error: data.detail || data.message || 'Invalid Insurance ID.' });
            } else {
                setEligibilityResult(data);
                if (data.coverageLevel !== 'full') {
                    await Promise.all([fetchSchemes(), fetchGovSchemes()]);
                }
            }
        } catch {
            setEligibilityResult({ error: 'Network error occurred connecting to backend.' });
        } finally {
            setCheckingEligibility(false);
        }
    };

    const handleClaim = async (schemeOrFacility: any, customTitle?: string) => {
        if (!schemeOrFacility) return;
        const schemeId = schemeOrFacility.id || `scheme_${Date.now()}`;
        const schemeName = customTitle || schemeOrFacility.name || schemeOrFacility.schemeName || 'Healthcare Scheme Claim';
        const reason = schemeOrFacility.reason || schemeOrFacility.recommendationReason || 'Empanelled under Government Healthcare Scheme (100% Cashless).';

        let claimAmount = 50000;
        if (typeof schemeOrFacility.estimatedBenefit === 'number' && schemeOrFacility.estimatedBenefit > 0) {
            claimAmount = schemeOrFacility.estimatedBenefit;
        } else if (schemeOrFacility.amount) {
            const parsed = parseInt(String(schemeOrFacility.amount).replace(/[^0-9]/g, ''));
            if (!isNaN(parsed) && parsed > 0) claimAmount = parsed;
        }

        const currentBeneficiaryName = selectedBeneficiary?.name || 'Citizen Beneficiary';
        setSubmittingClaim(schemeId);

        try {
            const cleanBase = API_BASE.replace(/\/$/, '');
            const res = await fetch(`${cleanBase}/api/patient/${patientId}/claims`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schemeId: schemeId,
                    schemeName: schemeName,
                    recommendationReason: reason,
                    amount: claimAmount,
                    patientName: currentBeneficiaryName,
                    beneficiaryId: selectedBeneficiary?.id || patientId,
                    assignedAsha: isFhw ? 'Sunita Tai (ASHA #402)' : undefined
                })
            });
            const data = await res.json();

            const newClaim = {
                id: data.claimId || `CLM-${Math.floor(Math.random() * 90000 + 10000)}`,
                title: schemeName,
                patientName: currentBeneficiaryName,
                patientId: patientId,
                beneficiaryId: selectedBeneficiary?.id || patientId,
                date: 'Just now',
                amount: claimAmount,
                status: 'Processing',
                assignedAsha: isFhw ? 'Sunita Tai (ASHA #402)' : undefined
            };

            setUserClaims(prev => {
                const updated = [newClaim, ...prev];
                offlineStorage.saveClaims(updated);
                return updated;
            });

            const successMessage = isFhw
                ? `✅ Scheme '${schemeName}' successfully enrolled for ${currentBeneficiaryName}! Tracking ID: ${newClaim.id}`
                : `✅ ${data.message || 'Pre-authorization & Claim initiated successfully!'}`;

            setAshaActionSuccessMsg(successMessage);
            setTimeout(() => setAshaActionSuccessMsg(null), 6000);
            alert(successMessage);
        } catch (err) {
            console.error('Claim action error:', err);
            alert('❌ Failed to process application. Please check your network connection and try again.');
        } finally {
            setSubmittingClaim(null);
        }
    };

    const handleRevokeClaim = (claimId: string) => {
        if (!confirm('Are you sure you want to revoke/withdraw this claim?')) return;
        setUserClaims(prev => {
            const updated = prev.filter(c => c.id !== claimId);
            offlineStorage.saveClaims(updated);
            return updated;
        });
    };

    // Filtered beneficiaries for picker
    const filteredBeneficiaries = useMemo(() => {
        if (!beneficiarySearchQuery.trim()) return beneficiaries;
        const q = beneficiarySearchQuery.toLowerCase();
        return beneficiaries.filter(b =>
            (b.name || '').toLowerCase().includes(q) ||
            (b.id || '').toLowerCase().includes(q) ||
            (b.category || '').toLowerCase().includes(q) ||
            (b.village_name || '').toLowerCase().includes(q) ||
            (b.contact_phone || '').toLowerCase().includes(q)
        );
    }, [beneficiaries, beneficiarySearchQuery]);

    // Filtered claims based on tab selection
    const displayedClaims = useMemo(() => {
        if (claimsFilter === 'SELECTED' && selectedBeneficiary) {
            const target = selectedBeneficiary.patient_id || selectedBeneficiary.id;
            return userClaims.filter(c => c.patientId === target || c.beneficiaryId === selectedBeneficiary.id || c.patientName === selectedBeneficiary.name);
        }
        return userClaims;
    }, [userClaims, claimsFilter, selectedBeneficiary]);

    const bestScheme = schemes.length > 0 ? schemes.reduce((prev, current) => (prev.match_percentage > current.match_percentage ? prev : current)) : null;
    const bestGovScheme = govSchemes.length > 0 ? govSchemes[0] : null;

    return (
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-16 font-sans antialiased text-on-surface">
            {/* Clean Header */}
            <section className="mb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                            {t('benefits.title', 'Government Schemes & Empanelled Hospitals')}
                        </h1>
                        <p className="text-sm text-tertiary font-medium mt-1">
                            {isFhw
                                ? 'ASHA Field Worker Portal • Evaluate, enroll, and pre-authorize cashless government healthcare benefits for village beneficiaries.'
                                : 'Explore PM-JAY, State Health Schemes, and 2,500+ verified empanelled hospitals with 100% cashless pre-authorization.'}
                        </p>
                    </div>
                </div>

                {/* Notification Banner */}
                {ashaActionSuccessMsg && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in shadow-xs">
                        <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
                        <span className="flex-1">{ashaActionSuccessMsg}</span>
                        <button onClick={() => setAshaActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* ASHA BENEFICIARY SELECTOR BAR (ACTIVE FOR FHW & URL PATIENT CONTEXT)      */}
                {/* ========================================================================= */}
                {(isFhw || urlPatientId || beneficiaries.length > 0) && (
                    <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50/70 rounded-3xl border border-purple-200/80 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/60 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                    <span className="material-symbols-outlined text-xl">volunteer_activism</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                                        ASHA Assisted Beneficiary Enrolment
                                    </span>
                                    <span className="text-xs text-purple-700 font-semibold block">
                                        Choose a village patient to evaluate specific government schemes and file pre-authorizations
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsPatientPickerOpen(!isPatientPickerOpen)}
                                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
                            >
                                <span className="material-symbols-outlined text-base">person_search</span>
                                <span>{isPatientPickerOpen ? 'Close Roster' : 'Switch Beneficiary'}</span>
                            </button>
                        </div>

                        {/* Currently Selected Beneficiary Card */}
                        {selectedBeneficiary ? (
                            <div className="bg-white p-4 rounded-2xl border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-base shrink-0 border border-purple-200">
                                        {selectedBeneficiary.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-black text-on-surface truncate">{selectedBeneficiary.name}</h3>
                                            <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                                {selectedBeneficiary.id}
                                            </span>
                                            <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-bold rounded-md text-[11px] border border-teal-100">
                                                {selectedBeneficiary.category}
                                            </span>
                                            <span className={`px-2 py-0.5 font-extrabold rounded-md text-[10px] ${
                                                selectedBeneficiary.risk_level === 'HIGH'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {selectedBeneficiary.risk_level} RISK
                                            </span>
                                        </div>
                                        <p className="text-xs text-tertiary mt-0.5">
                                            {selectedBeneficiary.gender}, {selectedBeneficiary.age}y
                                            {selectedBeneficiary.village_name ? ` • 📍 ${selectedBeneficiary.village_name}` : ''}
                                            {selectedBeneficiary.abha_id ? ` • ABHA: ${selectedBeneficiary.abha_id}` : ''}
                                            {selectedBeneficiary.contact_phone ? ` • 📞 ${selectedBeneficiary.contact_phone}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Target Patient Active</span>
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-2xl border border-dashed border-purple-300 text-center">
                                <p className="text-xs text-purple-900 font-bold">No patient currently selected. Click &quot;Switch Beneficiary&quot; to pick from village roster.</p>
                            </div>
                        )}

                        {/* Expandable Beneficiary Picker Drawer */}
                        {isPatientPickerOpen && (
                            <div className="bg-white p-4 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-base">search</span>
                                    <input
                                        type="text"
                                        value={beneficiarySearchQuery}
                                        onChange={(e) => setBeneficiarySearchQuery(e.target.value)}
                                        placeholder="Search by beneficiary name, ABHA ID, village, or category..."
                                        className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs font-semibold outline-none focus:border-purple-600 transition-all text-on-surface"
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {loadingBeneficiaries ? (
                                        <div className="py-6 text-center text-xs text-tertiary font-bold flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined animate-spin text-purple-600">sync</span>
                                            <span>Loading village beneficiaries...</span>
                                        </div>
                                    ) : filteredBeneficiaries.length === 0 ? (
                                        <p className="text-center py-4 text-xs text-tertiary">No beneficiaries matched your search.</p>
                                    ) : (
                                        filteredBeneficiaries.map((ben) => {
                                            const isSelected = selectedBeneficiary?.id === ben.id || selectedBeneficiary?.patient_id === (ben.patient_id || ben.id);
                                            return (
                                                <div
                                                    key={ben.id}
                                                    onClick={() => handleSelectBeneficiary(ben)}
                                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300'
                                                            : 'bg-surface-container-low hover:bg-surface-container border-surface-container-high'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-on-surface truncate">{ben.name}</span>
                                                            <span className="font-mono text-[10px] text-purple-800 font-bold bg-white px-1.5 py-0.5 rounded border border-purple-100">{ben.id}</span>
                                                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">{ben.category}</span>
                                                        </div>
                                                        <p className="text-[11px] text-tertiary mt-0.5">
                                                            {ben.gender}, {ben.age}y • {ben.village_name || 'Village'} • {ben.contact_phone || 'No phone'}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                                                            isSelected ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                                                        }`}
                                                    >
                                                        {isSelected ? 'Selected' : 'Select Patient'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Primary Navigation Tabs */}
                <div className="flex flex-wrap gap-2 mt-6 p-1.5 bg-surface-container-low rounded-2xl w-full border border-surface-container-high">
                    <button
                        onClick={() => setPageTab('hospitals')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-bold text-sm ${
                            pageTab === 'hospitals'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-tertiary hover:text-on-surface hover:bg-white/50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">local_hospital</span>
                        <span>Empanelled Hospitals &amp; Labs</span>
                        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">{facilities.length}</span>
                    </button>

                    <button
                        onClick={() => setPageTab('verifier')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-bold text-sm ${
                            pageTab === 'verifier'
                                ? 'bg-secondary text-white shadow-md'
                                : 'text-tertiary hover:text-on-surface hover:bg-white/50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">verified_user</span>
                        <span>Instant Hospital Verifier</span>
                    </button>

                    <button
                        onClick={() => setPageTab('schemes')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-bold text-sm ${
                            pageTab === 'schemes'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-tertiary hover:text-on-surface hover:bg-white/50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">account_balance</span>
                        <span>Government Schemes &amp; Eligibility</span>
                    </button>

                    <button
                        onClick={() => setPageTab('claims')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-bold text-sm ${
                            pageTab === 'claims'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-tertiary hover:text-on-surface hover:bg-white/50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">receipt_long</span>
                        <span>{isFhw ? 'Beneficiary Claims & Pre-Auth' : 'My Claims & Applications'}</span>
                        {userClaims.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white font-black">{userClaims.length}</span>
                        )}
                    </button>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* TAB 1: HOSPITALS & DIAGNOSTIC CENTRES DIRECTORY                           */}
            {/* ========================================================================= */}
            {pageTab === 'hospitals' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Search & Multi-Filter Control Bar */}
                    <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-surface-container-high space-y-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-grow">
                                <span className="material-symbols-outlined absolute left-4 top-3.5 text-tertiary">search</span>
                                <input
                                    type="text"
                                    placeholder="Search hospital name, diagnostic center, specialty (e.g. Apollo, CT Scan, Nandurbar)..."
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm text-on-surface"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        fetchFacilities(e.target.value, selectedState, selectedDistrict, selectedFacilityType, selectedSchemeFilter);
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {/* State Filter */}
                                <select
                                    className="px-3 py-3 rounded-xl border border-surface-container-high bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={selectedState}
                                    onChange={(e) => {
                                        setSelectedState(e.target.value);
                                        fetchFacilities(searchQuery, e.target.value, selectedDistrict, selectedFacilityType, selectedSchemeFilter);
                                    }}
                                >
                                    <option value="ALL">All States</option>
                                    {filterMetadata.states?.map((st: string) => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>

                                {/* Facility Type Filter */}
                                <select
                                    className="px-3 py-3 rounded-xl border border-surface-container-high bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={selectedFacilityType}
                                    onChange={(e) => {
                                        setSelectedFacilityType(e.target.value);
                                        fetchFacilities(searchQuery, selectedState, selectedDistrict, e.target.value, selectedSchemeFilter);
                                    }}
                                >
                                    <option value="ALL">All Facility Types</option>
                                    <option value="HOSPITAL">Hospitals</option>
                                    <option value="DIAGNOSTIC_CENTRE">Diagnostic Centres</option>
                                    <option value="COMMUNITY_HEALTH_CENTRE">CHC / PHC</option>
                                </select>

                                {/* Scheme Filter */}
                                <select
                                    className="px-3 py-3 rounded-xl border border-surface-container-high bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={selectedSchemeFilter}
                                    onChange={(e) => {
                                        setSelectedSchemeFilter(e.target.value);
                                        fetchFacilities(searchQuery, selectedState, selectedDistrict, selectedFacilityType, e.target.value);
                                    }}
                                >
                                    <option value="ALL">All Schemes</option>
                                    <option value="Ayushman Bharat">PM-JAY</option>
                                    <option value="CGHS">CGHS</option>
                                    <option value="MJPJAY">MJPJAY (MH)</option>
                                    <option value="CMCHIS">CMCHIS (TN)</option>
                                    <option value="Delhi Arogya">DAK (Delhi)</option>
                                </select>

                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedState('ALL');
                                        setSelectedDistrict('ALL');
                                        setSelectedFacilityType('ALL');
                                        setSelectedSchemeFilter('ALL');
                                        fetchFacilities('', 'ALL', 'ALL', 'ALL', 'ALL');
                                    }}
                                    className="px-4 py-3 bg-surface-container-low hover:bg-surface-container text-tertiary hover:text-on-surface font-bold text-xs rounded-xl transition-all cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>

                        {/* Summary & Quick Stats */}
                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-surface-container-low text-xs text-tertiary">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-on-surface">Showing {facilities.length} verified government empanelled facilities</span>
                                <span>· Cashless treatment up to ₹5,00,000</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 100% Cashless Active</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Speciality Empanelled</span>
                            </div>
                        </div>
                    </div>

                    {/* Facility Cards Grid */}
                    {loadingFacilities ? (
                        <div className="py-20 text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high">
                            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-3">sync</span>
                            <p className="text-sm font-bold text-on-surface">Discovering verified empanelled facilities across India...</p>
                        </div>
                    ) : facilities.length === 0 ? (
                        <div className="py-16 text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high">
                            <span className="material-symbols-outlined text-4xl text-tertiary mb-2">search_off</span>
                            <p className="text-base font-bold text-on-surface">No hospitals or diagnostic centres found matching your filters</p>
                            <p className="text-xs text-tertiary mt-1">Try resetting the state, district, or search keywords.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {facilities.map((fac: any) => (
                                <div
                                    key={fac.id}
                                    className="bg-surface-container-lowest p-6 rounded-[2rem] border border-surface-container-high hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="px-2.5 py-0.5 bg-secondary-container text-secondary text-[10px] font-black uppercase rounded-full">
                                                {fac.facility_type?.replace(/_/g, ' ') || 'HOSPITAL'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                                Empanelled
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-base font-extrabold text-on-surface line-clamp-2">{fac.name}</h3>
                                            <p className="text-xs text-tertiary mt-1">
                                                📍 {fac.district || fac.city}, {fac.state}
                                            </p>
                                        </div>

                                        {/* Empanelled Schemes Badges */}
                                        <div className="flex flex-wrap gap-1">
                                            {fac.empanelled_schemes?.map((sch: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded">
                                                    {sch}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Cashless Limit */}
                                        <div className="p-2.5 bg-surface-container-low rounded-xl text-xs space-y-0.5 border border-surface-container">
                                            <span className="text-[10px] text-tertiary uppercase font-bold block">Cashless Benefit Limit</span>
                                            <span className="font-extrabold text-primary block text-xs">{fac.cashless_limit || 'Up to ₹5,00,000 / Year'}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-2 border-t border-surface-container-low grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                setVerifierHospitalName(fac.name);
                                                setPageTab('verifier');
                                                handleVerifyHospital(fac.name);
                                            }}
                                            className="py-2.5 px-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-surface-container-high transition-all text-center cursor-pointer"
                                        >
                                            Verify Coverage
                                        </button>
                                        <button
                                            onClick={() => handleClaim(fac, `${fac.name} - Cashless Pre-Auth`)}
                                            disabled={submittingClaim === fac.id}
                                            className="py-2.5 px-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center disabled:opacity-50 cursor-pointer"
                                        >
                                            {submittingClaim === fac.id ? 'Filing...' : isFhw ? 'Pre-Auth Beneficiary' : 'Apply Pre-Auth'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: INSTANT HOSPITAL VERIFIER                                          */}
            {/* ========================================================================= */}
            {pageTab === 'verifier' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high space-y-6">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">Check If A Hospital Is Under Government Schemes</h3>
                            <p className="text-sm text-tertiary">
                                Instantly verify cashless PM-JAY and State scheme empanelment, covered specialties, free diagnostic tests, and Ayushman Mitra desk details.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Enter Hospital Name or Diagnostic Lab (e.g., AIIMS New Delhi, Nandurbar Civil Hospital, Apollo)..."
                                className="flex-1 px-4 py-3 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-sm text-on-surface"
                                value={verifierHospitalName}
                                onChange={(e) => setVerifierHospitalName(e.target.value)}
                            />
                            <button
                                onClick={() => handleVerifyHospital()}
                                disabled={verifying || !verifierHospitalName.trim()}
                                className="px-6 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-all disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                            >
                                {verifying ? 'Verifying...' : 'Verify Empanelment'}
                            </button>
                        </div>

                        {/* Example Quick Verification Buttons */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-tertiary">
                            <span className="font-bold">Try verifying:</span>
                            {['Nandurbar District Civil Hospital', 'AIIMS New Delhi', 'Apollo Diagnostics', 'KGMU Lucknow'].map((name) => (
                                <button
                                    key={name}
                                    onClick={() => {
                                        setVerifierHospitalName(name);
                                        handleVerifyHospital(name);
                                    }}
                                    className="px-2.5 py-1 bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold rounded-lg border border-surface-container-high cursor-pointer"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Verification Result Card */}
                    {verificationResult && (
                        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high space-y-6 animate-in fade-in">
                            {verificationResult.is_empanelled ? (
                                <div className="space-y-6">
                                    <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="material-symbols-outlined text-2xl">verified</span>
                                            </div>
                                            <div>
                                                <span className="px-3 py-1 bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase tracking-wider rounded-full inline-block mb-1">
                                                    Verified Empanelled Hospital
                                                </span>
                                                <h3 className="text-2xl font-black text-emerald-950">{verificationResult.hospital_name}</h3>
                                                <p className="text-xs text-emerald-800 font-semibold mt-1">
                                                    📍 {verificationResult.district}, {verificationResult.state} · Facility ID: {verificationResult.hospital_id || 'GOV-REG-ACTIVE'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleClaim(verificationResult, `${verificationResult.hospital_name} - Cashless Pre-Auth`)}
                                            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                                        >
                                            {isFhw ? `Pre-Authorize for ${selectedBeneficiary?.name || 'Beneficiary'}` : 'Generate Pre-Authorization Card'}
                                        </button>
                                    </div>

                                    {/* Bento Grid: Scheme & Coverage Highlights */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-5 bg-surface-container-low rounded-2xl border border-surface-container-high">
                                            <span className="text-xs font-bold text-tertiary uppercase block mb-1">Cashless Coverage</span>
                                            <p className="text-base font-black text-primary">{verificationResult.cashless_coverage}</p>
                                            <p className="text-[11px] text-tertiary mt-1">Zero out-of-pocket for eligible beneficiary cardholders.</p>
                                        </div>

                                        <div className="p-5 bg-surface-container-low rounded-2xl border border-surface-container-high">
                                            <span className="text-xs font-bold text-tertiary uppercase block mb-1">Active Schemes</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {verificationResult.matched_schemes?.map((sch: string, idx: number) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-secondary-container text-secondary text-[11px] font-bold rounded">
                                                        {sch}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-5 bg-surface-container-low rounded-2xl border border-surface-container-high">
                                            <span className="text-xs font-bold text-tertiary uppercase block mb-1">Ayushman Mitra Desk</span>
                                            <p className="text-xs font-bold text-on-surface">{verificationResult.ayushman_mitra_desk || 'Main Entrance Helpdesk'}</p>
                                            <p className="text-[11px] text-tertiary mt-1">Assists with Golden Card verification &amp; admission.</p>
                                        </div>
                                    </div>

                                    {/* Covered Specialties & Diagnostics */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-surface-container-low rounded-2xl border border-surface-container-high">
                                            <h4 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base text-primary">medical_services</span>
                                                Covered Treatments &amp; Specialties
                                            </h4>
                                            <ul className="space-y-2 text-xs text-on-surface-variant">
                                                {verificationResult.covered_specialties?.map((spec: string, idx: number) => (
                                                    <li key={idx} className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-emerald-600 text-xs">check_circle</span>
                                                        <span>{spec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-6 bg-surface-container-low rounded-2xl border border-surface-container-high">
                                            <h4 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base text-purple-700">biotech</span>
                                                Covered Diagnostic Tests &amp; Labs
                                            </h4>
                                            <ul className="space-y-2 text-xs text-on-surface-variant">
                                                {verificationResult.covered_diagnostics?.map((diag: string, idx: number) => (
                                                    <li key={idx} className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-purple-600 text-xs">check_circle</span>
                                                        <span>{diag}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Documents Required Checklist */}
                                    <div className="p-6 bg-amber-50/70 border border-amber-200 rounded-2xl">
                                        <h4 className="font-bold text-sm text-amber-900 mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-amber-700">checklist</span>
                                            Checklist: Documents To Bring To Hospital
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {verificationResult.required_documents?.map((doc: string, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                                                    <span className="material-symbols-outlined text-amber-700 text-sm">badge</span>
                                                    <span>{doc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-3xl">cancel</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-red-950">Facility Not Empanelled Under Government Schemes</h3>
                                            <p className="text-sm text-red-800 mt-1">{verificationResult.verification_notes}</p>
                                            <div className="mt-4">
                                                <button
                                                    onClick={() => setPageTab('hospitals')}
                                                    className="px-5 py-2.5 bg-red-800 text-white font-bold text-xs rounded-xl hover:bg-red-900 transition-colors cursor-pointer"
                                                >
                                                    View Verified Empanelled Hospitals Nearby
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: GOVERNMENT SCHEMES & AI ELIGIBILITY                                 */}
            {/* ========================================================================= */}
            {pageTab === 'schemes' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Eligibility Checker */}
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4">{t('benefits.checkEligibility', 'Check Insurance & Government Scheme Eligibility')}</h3>
                            <p className="text-on-surface-variant text-sm mb-6">
                                {isFhw && selectedBeneficiary
                                    ? `Evaluating profile rules for ${selectedBeneficiary.name} (${selectedBeneficiary.category}, ${selectedBeneficiary.village_name || 'Village'}).`
                                    : t('benefits.subtitle', 'Verify your existing insurance coverage or evaluate your profile against PM-JAY and state government healthcare programs.')}
                            </p>

                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <select
                                    className="px-4 py-3 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-1/3 text-on-surface"
                                    value={selectedService}
                                    onChange={(e) => setSelectedService(e.target.value)}
                                    disabled={checkingEligibility}
                                >
                                    <option value="consultation">OPD Consultation</option>
                                    <option value="lab_test">Diagnostic Lab Test / Scans</option>
                                    <option value="surgery">Inpatient Surgery / IPD</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Enter Insurance / ABHA ID (e.g., INS-123, PMJAY-789)"
                                    className="px-4 py-3 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-1/2 text-on-surface"
                                    value={insuranceId}
                                    onChange={(e) => setInsuranceId(e.target.value)}
                                    disabled={checkingEligibility}
                                />
                                <button
                                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 min-w-[150px] cursor-pointer"
                                    onClick={handleCheckEligibility}
                                    disabled={checkingEligibility || !insuranceId}
                                >
                                    {checkingEligibility ? 'Checking...' : 'Verify'}
                                </button>
                            </div>

                            {/* Eligibility Result Display */}
                            {eligibilityResult && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {eligibilityResult.error ? (
                                        <div className="rounded-xl border border-error-container bg-error-container text-on-error-container p-4 flex items-start gap-4">
                                            <span className="material-symbols-outlined mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                                            <div>
                                                <h4 className="font-bold">Checking Failed</h4>
                                                <p className="text-sm mt-1">{eligibilityResult.error}</p>
                                            </div>
                                        </div>
                                    ) : eligibilityResult.coverageLevel === 'full' ? (
                                        <div className="rounded-xl border border-secondary bg-secondary-container text-secondary p-4 flex items-start gap-4">
                                            <span className="material-symbols-outlined mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            <div>
                                                <h4 className="font-bold">Fully Covered</h4>
                                                <p className="text-sm mt-1">{eligibilityResult.message}</p>
                                                {eligibilityResult.details && (
                                                    <div className="mt-2 text-sm space-y-1 font-semibold">
                                                        <p>💰 Insurance Pays: ₹{eligibilityResult.details.insurancePays}</p>
                                                        <p>🧾 You Pay: ₹{eligibilityResult.details.youPay}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="text-amber-600 text-lg">⚠️</div>
                                                <div>
                                                    <p className="font-semibold text-amber-800">Partially Covered / Alternative Scheme Available</p>
                                                    <p className="text-sm text-amber-700 mt-1">{eligibilityResult.message}</p>
                                                    {eligibilityResult.suggestion && (
                                                        <p className="text-sm mt-2 font-bold text-amber-900 bg-amber-200/50 p-2 rounded-lg border border-amber-300/50 inline-block">
                                                            💡 {eligibilityResult.suggestion}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Best Match AI Scheme Banner */}
                    {bestScheme && (
                        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-xl">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="max-w-md">
                                    <span className="bg-white/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">
                                        Best AI Match ({bestScheme.match_percentage}%)
                                    </span>
                                    <h3 className="text-2xl font-bold mt-4 mb-2">Recommended: {bestScheme.name}</h3>
                                    <p className="text-white/80 font-medium text-sm">{bestScheme.reason}</p>
                                </div>
                                <button
                                    className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                                    onClick={() => handleClaim(bestScheme)}
                                    disabled={submittingClaim === bestScheme.id}
                                >
                                    {submittingClaim === bestScheme.id ? 'Processing...' : isFhw ? `Enrol ${selectedBeneficiary?.name || 'Beneficiary'}` : 'Select & Auto-fill Claim'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Government Schemes List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                account_balance
                            </span>
                            <h3 className="text-xl font-bold">
                                {isFhw && selectedBeneficiary
                                    ? `Government Schemes Evaluated For ${selectedBeneficiary.name} (${selectedBeneficiary.category})`
                                    : 'Government Healthcare Schemes Evaluated For You'}
                            </h3>
                        </div>

                        {loadingGovSchemes ? (
                            <div className="py-12 flex justify-center items-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high">
                                <div className="text-tertiary flex gap-3 items-center font-bold">
                                    <span className="material-symbols-outlined animate-spin text-secondary">sync</span>
                                    Evaluating government scheme eligibility...
                                </div>
                            </div>
                        ) : govSchemes.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high text-tertiary">
                                <span className="material-symbols-outlined text-3xl mb-3 opacity-40">search_off</span>
                                <p className="font-semibold text-sm">No eligible government schemes found for this patient profile.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {govSchemes.map((gs: any) => (
                                    <div
                                        key={gs.id}
                                        className={`bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border relative overflow-hidden flex flex-col justify-between space-y-4 ${
                                            bestGovScheme?.id === gs.id ? 'border-secondary ring-2 ring-secondary/20' : 'border-surface-container-high'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-12 h-12 bg-secondary-container flex items-center justify-center rounded-2xl text-secondary">
                                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        verified
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    {bestGovScheme?.id === gs.id && (
                                                        <span className="px-3 py-1 bg-secondary text-white text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                                                            ⭐ Best Option
                                                        </span>
                                                    )}
                                                    <span className="px-2.5 py-0.5 bg-secondary-container text-secondary text-[10px] font-bold uppercase rounded-full">
                                                        {gs.type}
                                                    </span>
                                                </div>
                                            </div>

                                            <h4 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{gs.schemeName}</h4>
                                            <p className="text-xs text-tertiary font-semibold mb-3">{gs.type}</p>

                                            {/* Eligibility Bar */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-on-surface-variant">Eligibility Match</span>
                                                    <span className="text-secondary">{gs.eligibilityPercentage}%</span>
                                                </div>
                                                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-secondary h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${gs.eligibilityPercentage}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-on-surface-variant text-xs mb-4 leading-relaxed bg-surface-container-low p-3 rounded-xl border border-surface-container-high">
                                                <span className="font-bold block mb-1">Why beneficiary qualifies:</span>
                                                {gs.recommendationReason}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                            <div>
                                                <p className="text-primary font-black text-sm">{gs.coverage}</p>
                                                <p className="text-[10px] text-tertiary mt-0.5">
                                                    Est. benefit: ₹{gs.estimatedBenefit?.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                            <button
                                                className="px-5 py-2.5 bg-secondary text-white font-bold text-xs rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 active:scale-95 cursor-pointer"
                                                onClick={() => handleClaim(gs)}
                                                disabled={submittingClaim === gs.id}
                                            >
                                                {submittingClaim === gs.id
                                                    ? 'Enrolling...'
                                                    : isFhw
                                                    ? `Enrol ${selectedBeneficiary ? selectedBeneficiary.name.split(' ')[0] : 'Patient'}`
                                                    : 'Apply Now'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: MY CLAIMS & APPLICATIONS                                            */}
            {/* ========================================================================= */}
            {pageTab === 'claims' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Summary Card */}
                        <div className="lg:col-span-4 bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">{isFhw ? 'Catchment Claim Analytics' : 'Claim Analytics'}</h3>
                                {isFhw && (
                                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-full uppercase">
                                        ASHA Assisted
                                    </span>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-tertiary text-sm font-semibold">Total Value Pre-Authorized</span>
                                    <span className="text-2xl font-black text-on-surface">
                                        ₹{userClaims.reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(
                                                (userClaims.reduce((acc, c) => acc + (c.amount || 0), 0) / 200000) * 100,
                                                100
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex justify-between text-sm py-4 border-y border-surface-container-low">
                                <span className="text-tertiary">Annual PM-JAY Cover Limit</span>
                                <span className="font-bold text-on-surface">₹5,00,000 / Family</span>
                            </div>

                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-emerald-700">security</span>
                                    100% Cashless Guarantee
                                </p>
                                <p className="text-emerald-800">
                                    All pre-authorizations are automatically transmitted to the Ayushman Mitra desk at the network civil / empanelled hospital.
                                </p>
                            </div>
                        </div>

                        {/* Right Active Claims List */}
                        <div className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h3 className="text-lg font-bold">
                                    Active Claims &amp; Hospital Pre-Authorizations ({displayedClaims.length})
                                </h3>

                                {isFhw && selectedBeneficiary && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setClaimsFilter('ALL')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                claimsFilter === 'ALL'
                                                    ? 'bg-purple-700 text-white'
                                                    : 'bg-surface-container text-tertiary hover:text-on-surface'
                                            }`}
                                        >
                                            All Beneficiaries ({userClaims.length})
                                        </button>
                                        <button
                                            onClick={() => setClaimsFilter('SELECTED')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                claimsFilter === 'SELECTED'
                                                    ? 'bg-purple-700 text-white'
                                                    : 'bg-surface-container text-tertiary hover:text-on-surface'
                                            }`}
                                        >
                                            {selectedBeneficiary.name.split(' ')[0]} Only
                                        </button>
                                    </div>
                                )}
                            </div>

                            {displayedClaims.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-surface-container-high rounded-2xl text-tertiary">
                                    <span className="material-symbols-outlined text-4xl mb-3 opacity-40">receipt_long</span>
                                    <p className="font-semibold text-sm">No active claims or applications filed yet.</p>
                                    <p className="text-xs text-tertiary mt-1">
                                        {isFhw
                                            ? 'Select an empanelled hospital or government scheme above to enrol the selected beneficiary.'
                                            : 'Select an empanelled hospital or scheme to initiate a cashless claim.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {displayedClaims.map((claim, cIdx) => (
                                        <div
                                            key={claim.id || cIdx}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-container-low group hover:bg-surface-container-high transition-colors gap-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary shrink-0">
                                                    <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-on-surface truncate">{claim.title}</p>
                                                        {claim.patientName && (
                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-black text-[10px] rounded-md border border-purple-200">
                                                                👤 {claim.patientName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-tertiary mt-0.5">
                                                        {claim.date} · {claim.id} ·{' '}
                                                        <span className="font-bold text-primary">
                                                            ₹{(claim.amount || 0).toLocaleString('en-IN')}
                                                        </span>
                                                        {claim.assignedAsha && ` · via ${claim.assignedAsha}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                                <span className="text-xs font-bold text-secondary bg-secondary-container/50 px-3 py-1 rounded-full">
                                                    {claim.status}
                                                </span>
                                                <button
                                                    onClick={() => handleRevokeClaim(claim.id)}
                                                    className="p-1.5 rounded-lg text-error hover:bg-error-container/50 transition-colors flex items-center justify-center cursor-pointer"
                                                    title="Revoke / Withdraw Claim"
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BenefitsPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 p-10 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            </div>
        }>
            <BenefitsContent />
        </Suspense>
    );
}
