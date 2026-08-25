'use client';

import { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '@/lib/api';
import { offlineStorage } from '@/lib/offline-storage';
import { useI18n } from '@/lib/i18n';

export default function BenefitsPage() {
    const { t } = useI18n();

    // Top-level active navigation tab: 'hospitals' | 'verifier' | 'schemes' | 'claims'
    const [pageTab, setPageTab] = useState<'hospitals' | 'verifier' | 'schemes' | 'claims'>('hospitals');

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
    const [schemeSubTab, setSchemeSubTab] = useState<'all' | 'insurance' | 'government'>('all');

    // --- Common / Claims State ---
    const [patientId, setPatientId] = useState<string>('PAT-123');
    const [userClaims, setUserClaims] = useState<any[]>([]);
    const [submittingClaim, setSubmittingClaim] = useState<string | null>(null);

    useEffect(() => {
        // Hydrate saved claims from persistent offline storage
        const savedClaims = offlineStorage.getClaims();
        if (savedClaims && savedClaims.length > 0) {
            setUserClaims(savedClaims);
        }

        const initData = async () => {
            let pid = 'PAT-123';
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    pid = user.id.slice(0, 10);
                    setPatientId(pid);
                }
            } catch (e) {
                console.warn('Auth user fetch skipped:', e);
            }
            fetchFacilities();
            fetchFilters();
            fetchSchemes(pid);
            fetchGovSchemes(pid);
        };
        initData();
    }, []);

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
<<<<<<< HEAD
        if (!insuranceId.trim()) {
            setEligibilityResult({ error: 'Please enter an Insurance ID.' });
            return;
        }

=======
        if (!insuranceId) return;
>>>>>>> 7546c2b (feat(i18n): implement 4-language global localization (EN, HI, MR, TA))
        setCheckingEligibility(true);
        setEligibilityResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/insurance/verify-eligibility`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurance_id: insuranceId,
                    service_type: selectedService
                })
            });
            const data = await res.json();
<<<<<<< HEAD

            if (!res.ok || data.status === 'error') {
                setEligibilityResult({ error: data.detail || data.message || 'Invalid Insurance ID.' });
            } else {
                setEligibilityResult(data);
                if (data.coverageLevel !== 'full') {
                    await Promise.all([fetchSchemes(), fetchGovSchemes()]);
                }
            }
        } catch (err) {
            setEligibilityResult({ error: 'Network error occurred connecting to backend.' });
=======
            setEligibilityResult(data);
        } catch (err) {
            console.error("Eligibility check error", err);
            setEligibilityResult({ error: "Failed to check eligibility. Please try again." });
>>>>>>> 7546c2b (feat(i18n): implement 4-language global localization (EN, HI, MR, TA))
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
                    amount: claimAmount
                })
            });
            const data = await res.json();

            const newClaim = {
                id: data.claimId || `CLM-${Math.floor(Math.random() * 90000 + 10000)}`,
                title: schemeName,
                date: 'Just now',
                amount: claimAmount,
                status: 'Processing'
            };
            setUserClaims(prev => {
                const updated = [newClaim, ...prev];
                offlineStorage.saveClaims(updated);
                return updated;
            });

            alert(`✅ ${data.message || 'Pre-authorization & Claim initiated successfully!'}`);
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

    const bestScheme = schemes.length > 0 ? schemes.reduce((prev, current) => (prev.match_percentage > current.match_percentage ? prev : current)) : null;
    const bestGovScheme = govSchemes.length > 0 ? govSchemes[0] : null;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full font-sans antialiased text-on-surface">
            {/* Header with National Scheme Branding */}
            <section className="mb-8">
<<<<<<< HEAD
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live National Health Registry &amp; OGD API
                            </span>
                            <span className="hidden sm:inline-block px-3 py-1 bg-surface-container-high text-tertiary text-xs font-bold rounded-full">
                                PM-JAY · CGHS · State Schemes
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                            Government Schemes &amp; Empanelled Hospitals
                        </h1>
                        <p className="text-on-surface-variant text-sm md:text-base mt-1.5 max-w-3xl">
                            Check whether your hospital or diagnostic centre is empanelled under Government Healthcare Schemes for 100% cashless treatment, surgeries, and free laboratory tests.
                        </p>
                    </div>
                </div>

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
                        <span>My Claims &amp; Applications</span>
                        {userClaims.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white font-black">{userClaims.length}</span>
                        )}
                    </button>
                </div>
=======
                <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">{t('benefits.title', 'Government Health Schemes & PMJAY Benefits')}</h1>
                <p className="text-tertiary text-sm mt-1">{t('benefits.subtitle', 'Universal healthcare coverage, Mahatma Jyotirao Phule Jan Arogya Yojana & ABHA benefits')}</p>
>>>>>>> 7546c2b (feat(i18n): implement 4-language global localization (EN, HI, MR, TA))
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
                                    className="px-4 py-3 bg-surface-container-low hover:bg-surface-container text-tertiary hover:text-on-surface font-bold text-xs rounded-xl transition-all"
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
                        <div className="py-20 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high">
                            <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-3">sync</span>
                            <p className="font-bold text-base text-on-surface">Querying National Hospital &amp; Diagnostic Registry...</p>
                            <p className="text-xs text-tertiary mt-1">Fetching live empanelment data from data.gov.in and Ayushman Bharat network</p>
                        </div>
                    ) : facilities.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high text-tertiary">
                            <span className="material-symbols-outlined text-4xl mb-3 opacity-40">local_hospital</span>
                            <h4 className="font-bold text-lg text-on-surface">No Facilities Found</h4>
                            <p className="text-sm max-w-md mt-1">Try adjusting your state filter or search keywords to locate empanelled facilities.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {facilities.map((fac: any, idx: number) => (
                                <div
                                    key={fac.id || idx}
                                    className="bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-lg transition-all group shadow-sm border border-surface-container-high relative overflow-hidden flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Facility Header */}
                                        <div className="flex justify-between items-start mb-4 gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                                    fac.facility_type === 'DIAGNOSTIC_CENTRE'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {fac.facility_type === 'DIAGNOSTIC_CENTRE' ? 'biotech' : 'local_hospital'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors leading-tight">
                                                        {fac.name}
                                                    </h3>
                                                    <p className="text-xs text-tertiary font-semibold flex items-center gap-1 mt-0.5">
                                                        <span className="material-symbols-outlined text-xs">location_on</span>
                                                        {fac.city}, {fac.district}, {fac.state} - {fac.pincode}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${
                                                    fac.empanelment_status === 'EMPANELLED_ACTIVE'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {fac.empanelment_status === 'EMPANELLED_ACTIVE' ? '✅ Empanelled' : '⚠️ Partial'}
                                                </span>
                                                {fac.rating && (
                                                    <span className="text-xs font-bold text-amber-700 flex items-center gap-0.5">
                                                        ★ {fac.rating}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Address & Bed capacity */}
                                        <p className="text-xs text-on-surface-variant mb-4 bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high">
                                            <span className="font-bold">Address:</span> {fac.address}
                                            {fac.bed_capacity && <span className="ml-2 font-semibold text-primary">· Beds: {fac.bed_capacity}</span>}
                                        </p>

                                        {/* Empanelled Schemes Badges */}
                                        <div className="mb-4">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block mb-1.5">
                                                Active Government Schemes
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {fac.empanelled_schemes?.map((sch: string, sIdx: number) => (
                                                    <span
                                                        key={sIdx}
                                                        className="px-2.5 py-1 bg-secondary-container text-secondary text-xs font-bold rounded-lg border border-secondary/20 flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">verified</span>
                                                        {sch}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Cashless Ceiling */}
                                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-4 text-xs text-emerald-900 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base text-emerald-700">payments</span>
                                                <div>
                                                    <p className="font-black text-emerald-900">{fac.cashless_limit}</p>
                                                    <p className="text-[10px] text-emerald-700">Zero Out-of-Pocket for Listed Packages</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Covered Diagnostic Tests & Free Services */}
                                        {fac.covered_diagnostic_tests && fac.covered_diagnostic_tests.length > 0 && (
                                            <div className="mb-4">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block mb-1.5">
                                                    Free Diagnostic Tests &amp; Scans Covered
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {fac.covered_diagnostic_tests.map((test: string, tIdx: number) => (
                                                        <span
                                                            key={tIdx}
                                                            className="px-2 py-0.5 bg-surface-container-high text-on-surface text-[11px] font-medium rounded-md"
                                                        >
                                                            {test}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Ayushman Mitra Desk Info */}
                                        {fac.ayushman_mitra_contact && (
                                            <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant mb-4 border border-surface-container-high">
                                                <div className="flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary mt-0.5">support_agent</span>
                                                    <div>
                                                        <p className="font-bold text-on-surface">{fac.ayushman_mitra_contact}</p>
                                                        <p className="text-[10px] text-tertiary">{fac.ayushman_desk_location || 'Ground Floor Reception Desk'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between pt-4 border-t border-surface-container-low gap-3">
                                        <button
                                            onClick={() => {
                                                setVerifierHospitalName(fac.name);
                                                setPageTab('verifier');
                                                handleVerifyHospital(fac.name);
                                            }}
                                            className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">verified</span>
                                            Verify Status
                                        </button>

                                        <button
                                            onClick={() => handleClaim(fac, `${fac.name} - Scheme Pre-Auth`)}
                                            disabled={submittingClaim === fac.id}
                                            className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">send</span>
                                            {submittingClaim === fac.id ? 'Processing...' : 'Apply Pre-Auth'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: INSTANT HOSPITAL EMPANELMENT VERIFIER                              */}
            {/* ========================================================================= */}
            {pageTab === 'verifier' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high relative overflow-hidden">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-secondary text-xs font-extrabold uppercase rounded-full mb-4">
                                <span className="material-symbols-outlined text-sm">health_and_safety</span>
                                Government Scheme Verifier
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-2">
                                Check If A Hospital Is Under Government Schemes
                            </h2>
                            <p className="text-on-surface-variant text-sm mb-6">
                                Enter the name of any hospital, clinic, or diagnostic centre to verify its empanelment status, cashless coverage amount, list of covered treatments, and Ayushman Mitra helpdesk.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-tertiary mb-2">
                                        Hospital / Diagnostic Centre Name
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            placeholder="e.g., Apollo Hospitals, Nandurbar Civil Hospital, AIIMS, City Diagnostic..."
                                            className="w-full px-4 py-3.5 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-on-surface text-sm"
                                            value={verifierHospitalName}
                                            onChange={(e) => setVerifierHospitalName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyHospital()}
                                        />
                                        <button
                                            onClick={() => handleVerifyHospital()}
                                            disabled={verifying || !verifierHospitalName.trim()}
                                            className="px-8 py-3.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
                                        >
                                            {verifying ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                                    <span>Verifying...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">search_check</span>
                                                    <span>Verify Hospital</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Quick suggestion chips */}
                                <div>
                                    <span className="text-[11px] font-bold text-tertiary block mb-2">Quick Search Examples:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            'Nandurbar Sub-District Civil Hospital',
                                            'Apollo Hospitals, Greams Road',
                                            'AIIMS New Delhi',
                                            'City X-Ray & Scan Clinic',
                                            'KEM Hospital Mumbai',
                                            'Dr. Lal PathLabs Empanelled Hub'
                                        ].map((example, eIdx) => (
                                            <button
                                                key={eIdx}
                                                onClick={() => {
                                                    setVerifierHospitalName(example);
                                                    handleVerifyHospital(example);
                                                }}
                                                className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-xs font-semibold rounded-lg text-on-surface border border-surface-container-high transition-colors text-left"
                                            >
                                                🏥 {example}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Result Display */}
                    {verificationResult && (
                        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high animate-in slide-in-from-top-4 duration-300">
                            {verificationResult.is_empanelled ? (
                                <div className="space-y-6">
                                    {/* Verification Status Banner */}
                                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
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
                                            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                                        >
                                            Generate Pre-Authorization Card
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
                                                    className="px-5 py-2.5 bg-red-800 text-white font-bold text-xs rounded-xl hover:bg-red-900 transition-colors"
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
                            <p className="text-on-surface-variant text-sm mb-6">{t('benefits.subtitle', 'Verify your existing insurance coverage or evaluate your profile against PM-JAY and state government healthcare programs.')}</p>
                            
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
                                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 min-w-[150px]"
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
                                    className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                    onClick={() => handleClaim(bestScheme)}
                                    disabled={submittingClaim === bestScheme.id}
                                >
                                    {submittingClaim === bestScheme.id ? 'Processing...' : 'Select & Auto-fill Claim'}
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
                            <h3 className="text-xl font-bold">Government Healthcare Schemes Evaluated For You</h3>
                        </div>

                        {loadingGovSchemes ? (
                            <div className="py-12 flex justify-center items-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high">
                                <div className="text-tertiary flex gap-3 items-center font-bold">
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Evaluating government scheme eligibility...
                                </div>
                            </div>
                        ) : govSchemes.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high text-tertiary">
                                <span className="material-symbols-outlined text-3xl mb-3 opacity-40">search_off</span>
                                <p className="font-semibold text-sm">No eligible government schemes found for your profile.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {govSchemes.map((gs: any, idx: number) => (
                                    <div
                                        key={gs.id}
                                        className={`bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border relative overflow-hidden ${
                                            bestGovScheme?.id === gs.id ? 'border-secondary ring-2 ring-secondary/20' : 'border-surface-container-high'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-secondary-container flex items-center justify-center rounded-2xl text-secondary">
                                                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                    verified
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                {bestGovScheme?.id === gs.id && (
                                                    <span className="px-3 py-1 bg-secondary text-white text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                                                        ⭐ Best Government Option
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
                                            <span className="font-bold block mb-1">Why you qualify:</span>
                                            {gs.recommendationReason}
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                            <div>
                                                <p className="text-primary font-black text-sm">{gs.coverage}</p>
                                                <p className="text-[10px] text-tertiary mt-0.5">
                                                    Est. benefit: ₹{gs.estimatedBenefit?.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                            <button
                                                className="px-5 py-2.5 bg-secondary text-white font-bold text-xs rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 active:scale-95"
                                                onClick={() => handleClaim(gs)}
                                                disabled={submittingClaim === gs.id}
                                            >
                                                {submittingClaim === gs.id ? 'Filing...' : 'Apply Now'}
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
                            <h3 className="text-lg font-bold">Claim Analytics</h3>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-tertiary text-sm font-semibold">Total Claimed</span>
                                    <span className="text-2xl font-black text-on-surface">
                                        ₹{userClaims.reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(
                                                (userClaims.reduce((acc, c) => acc + (c.amount || 0), 0) / 100000) * 100,
                                                100
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex justify-between text-sm py-4 border-y border-surface-container-low">
                                <span className="text-tertiary">Annual PM-JAY Limit</span>
                                <span className="font-bold text-on-surface">₹5,00,000</span>
                            </div>

                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-emerald-700">security</span>
                                    100% Cashless Guarantee
                                </p>
                                <p className="text-emerald-800">
                                    All pre-authorizations are directly sent to the Ayushman Mitra desk at the network hospital.
                                </p>
                            </div>
                        </div>

                        {/* Right Active Claims List */}
                        <div className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high space-y-4">
                            <h3 className="text-lg font-bold">
                                Active Claims &amp; Hospital Pre-Authorizations ({userClaims.length})
                            </h3>

                            {userClaims.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-surface-container-high rounded-2xl text-tertiary">
                                    <span className="material-symbols-outlined text-4xl mb-3 opacity-40">receipt_long</span>
                                    <p className="font-semibold text-sm">No active claims or applications filed yet.</p>
                                    <p className="text-xs text-tertiary mt-1">Select an empanelled hospital or scheme to initiate a cashless claim.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {userClaims.map((claim, cIdx) => (
                                        <div
                                            key={claim.id || cIdx}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-container-low group hover:bg-surface-container-high transition-colors gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary shrink-0">
                                                    <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-on-surface">{claim.title}</p>
                                                    <p className="text-xs text-tertiary">
                                                        {claim.date} · {claim.id} ·{' '}
                                                        <span className="font-bold text-primary">
                                                            ₹{(claim.amount || 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                                <span className="text-xs font-bold text-secondary bg-secondary-container/50 px-3 py-1 rounded-full">
                                                    {claim.status}
                                                </span>
                                                <button
                                                    onClick={() => handleRevokeClaim(claim.id)}
                                                    className="p-1.5 rounded-lg text-error hover:bg-error-container/50 transition-colors flex items-center justify-center"
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
