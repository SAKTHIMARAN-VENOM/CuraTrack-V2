'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import AnimatedSelect, { SelectOption } from '@/components/ui/AnimatedSelect';
import { useI18n } from '@/lib/i18n';

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Active Referrals', icon: 'alt_route', badge: 'Active', badgeColor: 'bg-primary/10 text-primary' },
    { value: 'CREATED', label: '1. Created', icon: 'schedule', badge: 'New', badgeColor: 'bg-blue-100 text-blue-700' },
    { value: 'ACCEPTED', label: '2. Accepted', icon: 'check_circle', badge: 'Accepted', badgeColor: 'bg-purple-100 text-purple-700' },
    { value: 'IN_TRANSIT', label: '3. In Transit (108)', icon: 'ambulance', badge: 'Transit', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'CONSULTED', label: '4. Consulted', icon: 'medical_services', badge: 'In Clinic', badgeColor: 'bg-teal-100 text-teal-700' },
    { value: 'COMPLETED', label: '5. History & Completed', icon: 'history', badge: 'History', badgeColor: 'bg-emerald-100 text-emerald-700' },
];

const URGENCY_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Urgency Levels', icon: 'tune' },
    { value: 'EMERGENCY', label: 'Emergency (Immediate)', icon: 'emergency', badge: 'Critical', badgeColor: 'bg-red-100 text-red-700' },
    { value: 'URGENT', label: 'Urgent (< 24 hrs)', icon: 'warning', badge: 'Urgent', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'ROUTINE', label: 'Routine Elective', icon: 'check_circle', badge: 'Routine', badgeColor: 'bg-emerald-100 text-emerald-800' },
];

export default function ReferralPipelinePage() {
    const { t } = useI18n();
    const supabase = useMemo(() => createClient(), []);

    // Active role context (Supports ASHA, Doctor, Facility Manager, Patient, Admin)
    const [activeRole, setActiveRole] = useState<string>('doctor');
    const [activeUser, setActiveUser] = useState<any>({
        name: 'Dr. David Ross',
        role: 'doctor',
        facility: 'PHC Nandurbar Rural'
    });

    const [referrals, setReferrals] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>({
        total_referrals: 0,
        emergency_referrals: 0,
        in_transit: 0,
        overdue_escalated: 0,
        completed: 0,
        sla_compliance_rate: '100%'
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

    // Modals
    const [selectedReferral, setSelectedReferral] = useState<any>(null);
    const [isDigitalPassOpen, setIsDigitalPassOpen] = useState<boolean>(false);
    const [passReferral, setPassReferral] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

    // Patient & Doctor directories for creation
    const [patientsList, setPatientsList] = useState<any[]>([]);
    const [doctorsList, setDoctorsList] = useState<any[]>([]);
    const [loadingDirectory, setLoadingDirectory] = useState<boolean>(false);
    const [patientSearch, setPatientSearch] = useState<string>('');
    const [patientCategoryFilter, setPatientCategoryFilter] = useState<string>('ALL');
    const [wizardStep, setWizardStep] = useState<number>(1);

    // Selected Patient & Destination Doctor
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

    // New referral form state
    const [newRef, setNewRef] = useState({
        urgency: 'URGENT',
        specialty: 'Cardiology',
        provisional_diagnosis: '',
        clinical_reason: '',
        vitals_summary: 'BP: 130/84, HR: 76 bpm, SpO2: 98%',
        referring_facility_type: 'Primary Health Centre (PHC)',
        referring_facility_name: 'PHC Nandurbar Rural',
        destination_facility_type: 'District Hospital',
        destination_facility_name: 'Nandurbar District Civil Hospital',
    });

    const [submitting, setSubmitting] = useState<boolean>(false);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

    // Detect user persona and active role on mount
    useEffect(() => {
        async function loadUserRole() {
            let role = 'doctor';
            try {
                const saved = localStorage.getItem('curatrack_active_role');
                if (saved) role = saved;
            } catch {}

            setActiveRole(role);
            updateUserPersona(role);

            try {
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                    const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
                    if (prof?.role) {
                        const verifiedRole = prof.role;
                        setActiveRole(verifiedRole);
                        updateUserPersona(verifiedRole, prof);
                    }
                }
            } catch {}
        }
        loadUserRole();
    }, [supabase]);

    const updateUserPersona = (role: string, prof?: any) => {
        if (role === 'fhw' || role === 'asha') {
            setActiveUser({
                name: prof?.name || 'Sunita Tai (ASHA)',
                role: 'fhw',
                facility: 'Sub-Centre Borvihir',
                facilityType: 'Ayushman Arogya Mandir (Sub-Centre)'
            });
            setNewRef(prev => ({
                ...prev,
                referring_facility_type: 'Ayushman Arogya Mandir (Sub-Centre)',
                referring_facility_name: 'Sub-Centre Borvihir',
                destination_facility_type: 'Community Health Centre (CHC)',
                destination_facility_name: 'CHC Shahada Block',
                specialty: 'Obstetrics & Maternal Care'
            }));
        } else if (role === 'doctor') {
            setActiveUser({
                name: prof?.name || 'Dr. David Ross (MO)',
                role: 'doctor',
                facility: 'PHC Nandurbar Rural',
                facilityType: 'Primary Health Centre (PHC)'
            });
            setNewRef(prev => ({
                ...prev,
                referring_facility_type: 'Primary Health Centre (PHC)',
                referring_facility_name: 'PHC Nandurbar Rural',
                destination_facility_type: 'District Hospital',
                destination_facility_name: 'Nandurbar District Civil Hospital',
                specialty: 'Cardiology'
            }));
        } else if (role === 'facility_manager' || role === 'admin') {
            setActiveUser({
                name: prof?.name || 'Anil Deshmukh (District Ops)',
                role: role,
                facility: 'Nandurbar District Health Command',
                facilityType: 'District Health Office'
            });
            setNewRef(prev => ({
                ...prev,
                referring_facility_type: 'Primary Health Centre (PHC)',
                referring_facility_name: 'PHC Nandurbar Rural',
                destination_facility_type: 'District Hospital',
                destination_facility_name: 'Nandurbar District Civil Hospital',
                specialty: 'Cardiology'
            }));
        } else {
            setActiveUser({
                name: prof?.name || 'Kavita Bai',
                role: 'patient',
                facility: 'Borvihir Pada',
                facilityType: 'Home'
            });
        }
    };

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const data = await apiFetch(`/api/referrals?status=${filterStatus}&urgency=${filterUrgency}`);
            if (data.referrals) {
                setReferrals(data.referrals);
            }
            if (data.metrics) {
                setMetrics(data.metrics);
            }
        } catch (err) {
            console.error('Failed to fetch referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDirectories = async () => {
        setLoadingDirectory(true);
        try {
            const [patientsRes, doctorsRes] = await Promise.all([
                apiFetch('/api/referrals/patients').catch(() => ({ patients: [] })),
                apiFetch('/api/referrals/doctors').catch(() => ({ doctors: [] }))
            ]);

            if (patientsRes.patients && patientsRes.patients.length > 0) {
                setPatientsList(patientsRes.patients);
                if (!selectedPatient) {
                    setSelectedPatient(patientsRes.patients[0]);
                    setNewRef(prev => ({
                        ...prev,
                        vitals_summary: patientsRes.patients[0].vitals_summary || prev.vitals_summary,
                        provisional_diagnosis: patientsRes.patients[0].medical_history || ''
                    }));
                }
            }

            if (doctorsRes.doctors && doctorsRes.doctors.length > 0) {
                setDoctorsList(doctorsRes.doctors);
                // Preselect destination doctor according to role
                if (activeRole === 'fhw' || activeRole === 'asha') {
                    // ASHA refers to PHC / CHC Medical Officer
                    const primaryDoc = doctorsRes.doctors.find((d: any) => d.tier.includes('PHC') || d.tier.includes('CHC')) || doctorsRes.doctors[0];
                    setSelectedDoctor(primaryDoc);
                } else {
                    // Doctor refers to District Specialist / Tertiary Doctor
                    const specialistDoc = doctorsRes.doctors.find((d: any) => d.tier.includes('District') || d.tier.includes('Medical College')) || doctorsRes.doctors[0];
                    setSelectedDoctor(specialistDoc);
                }
            }
        } catch (e) {
            console.error('Directory fetch error:', e);
        } finally {
            setLoadingDirectory(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, [filterStatus, filterUrgency]);

    useEffect(() => {
        if (isCreateModalOpen) {
            fetchDirectories();
            setWizardStep(1);
        }
    }, [isCreateModalOpen, activeRole]);

    // Update form when patient is selected
    const handleSelectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setNewRef(prev => ({
            ...prev,
            vitals_summary: patient.vitals_summary || prev.vitals_summary,
            provisional_diagnosis: patient.medical_history || prev.provisional_diagnosis,
            clinical_reason: `Referral required for ${patient.name} (${patient.category}). Risk tier: ${patient.risk_level}.`
        }));
    };

    // Update form when destination doctor is selected
    const handleSelectDoctor = (doctor: any) => {
        setSelectedDoctor(doctor);
        setNewRef(prev => ({
            ...prev,
            destination_facility_type: doctor.facility_type || 'District Hospital',
            destination_facility_name: doctor.facility_name || 'Nandurbar District Civil Hospital',
            specialty: doctor.specialty ? doctor.specialty.split('&')[0].trim() : prev.specialty
        }));
    };

    // Filter available destination doctors based on RBAC rules
    const filteredDoctors = useMemo(() => {
        if (activeRole === 'fhw' || activeRole === 'asha') {
            // ASHA can only refer to Medical Officers / Doctors at PHC / CHC
            return doctorsList.filter(d => d.role === 'doctor');
        }
        // Doctor can refer to peer doctors and higher specialists
        return doctorsList.filter(d => d.role === 'doctor');
    }, [doctorsList, activeRole]);

    // Filter patient list based on search and category
    const filteredPatients = useMemo(() => {
        return patientsList.filter(p => {
            const matchesSearch = !patientSearch ||
                p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                p.abha_id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                p.village_name.toLowerCase().includes(patientSearch.toLowerCase());
            
            const matchesCategory = patientCategoryFilter === 'ALL' ||
                p.category.toLowerCase().includes(patientCategoryFilter.toLowerCase()) ||
                (patientCategoryFilter === 'HIGH_RISK' && p.risk_level === 'HIGH');

            return matchesSearch && matchesCategory;
        });
    }, [patientsList, patientSearch, patientCategoryFilter]);

    const handleCreateReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient || !selectedDoctor) {
            alert('Please select both a patient and destination doctor.');
            return;
        }

        if (!newRef.clinical_reason && !newRef.provisional_diagnosis) {
            alert('Please provide clinical reason and diagnosis.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                patient_id: selectedPatient.id,
                patient_name: selectedPatient.name,
                patient_age: selectedPatient.age,
                patient_gender: selectedPatient.gender,
                abha_id: selectedPatient.abha_id,
                referring_doctor_name: activeUser.name,
                referring_role: activeRole,
                referring_facility_type: activeUser.facilityType || newRef.referring_facility_type,
                referring_facility_name: activeUser.facility || newRef.referring_facility_name,
                destination_doctor_id: selectedDoctor.id,
                destination_doctor_name: selectedDoctor.name,
                destination_role: selectedDoctor.role || 'doctor',
                destination_facility_type: selectedDoctor.facility_type || newRef.destination_facility_type,
                destination_facility_name: selectedDoctor.facility_name || newRef.destination_facility_name,
                specialty: newRef.specialty || selectedDoctor.specialty || 'General Medicine',
                urgency: newRef.urgency,
                clinical_reason: newRef.clinical_reason || `Clinical referral from ${activeUser.name} to ${selectedDoctor.name}`,
                provisional_diagnosis: newRef.provisional_diagnosis || 'Suspected acute condition',
                vitals_summary: newRef.vitals_summary,
                created_by_role: activeRole
            };

            const res = await apiFetch('/api/referrals/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setIsCreateModalOpen(false);
            fetchReferrals();

            // Open digital pass for the newly created referral
            if (res.referral) {
                setPassReferral(res.referral);
                setIsDigitalPassOpen(true);
            }
        } catch (err: any) {
            alert('Failed to generate referral pass: ' + (err.message || 'Check network / permissions'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (referralId: string, newStatus: string) => {
        setStatusUpdating(referralId);
        try {
            await apiFetch(`/api/referrals/${referralId}/status`, {
                method: 'POST',
                body: JSON.stringify({
                    status: newStatus,
                    notes: `Status transitioned to ${newStatus} by ${activeUser.name} (${activeRole.toUpperCase()}).`,
                    updated_by: activeUser.name,
                    actor_role: activeRole
                })
            });
            fetchReferrals();
            if (selectedReferral && selectedReferral.id === referralId) {
                setSelectedReferral({ ...selectedReferral, status: newStatus });
            }
        } catch (err: any) {
            alert('Status update failed: ' + (err.message || 'Error'));
        } finally {
            setStatusUpdating(null);
        }
    };

    const getUrgencyBadge = (urgency: string) => {
        switch (urgency) {
            case 'EMERGENCY':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'URGENT':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            default:
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CREATED':
                return 'bg-blue-100 text-blue-700';
            case 'ACCEPTED':
                return 'bg-purple-100 text-purple-700';
            case 'IN_TRANSIT':
                return 'bg-amber-100 text-amber-800';
            case 'CONSULTED':
                return 'bg-teal-100 text-teal-700';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-700';
            case 'OVERDUE_ESCALATED':
                return 'bg-red-500 text-white animate-pulse';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Clean Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">{t('referrals.title', 'Clinical Referral Pipeline')}</h1>
                </div>

                {/* Verified User Persona & Action CTA */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-2 rounded-xl border border-surface-container-high">
                        <span className="material-symbols-outlined text-primary text-base">account_circle</span>
                        <div className="text-left">
                            <span className="text-[10px] text-tertiary block font-medium">Logged in as</span>
                            <span className="text-xs font-extrabold text-on-surface">{activeUser.name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary ml-1">
                            {activeRole === 'fhw' || activeRole === 'asha' ? 'ASHA Worker' : activeRole === 'doctor' ? 'Doctor (MO)' : activeRole.replace('_', ' ')}
                        </span>
                    </div>

                    {activeRole === 'fhw' || activeRole === 'asha' ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/fhw/referrals"
                                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-base">volunteer_activism</span>
                                <span>ASHA Village Referral Portal</span>
                            </Link>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-base">add_circle</span>
                                <span>New Pass</span>
                            </button>
                        </div>
                    ) : activeRole === 'doctor' ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/doctor/referrals"
                                className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-base">stethoscope</span>
                                <span>Doctor Referral Command</span>
                            </Link>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 border border-surface-container-high transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-base">add_circle</span>
                                <span>Escalate</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/fhw/referrals"
                                className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl border border-surface-container-high flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                                <span>ASHA Portal</span>
                            </Link>
                            <Link
                                href="/doctor/referrals"
                                className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl border border-surface-container-high flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">stethoscope</span>
                                <span>Doctor Portal</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Role Hierarchy Access Notification */}
            <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">shield_person</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">Verified System Role: {activeUser.name}</span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary text-white">
                                {activeRole.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-tertiary text-[11px] mt-0.5">
                            {activeRole === 'fhw' || activeRole === 'asha'
                                ? '• ASHA Protocol: Village referrals are created by ASHA and routed to Medical Officers. Doctors accept incoming referrals.'
                                : activeRole === 'doctor'
                                ? '• Doctor Protocol: Medical Officers accept incoming village referrals and escalate secondary cases to District Specialists.'
                                : '• Administrative View: Full cross-tier referral pipeline tracking and audit oversight.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono font-bold text-[11px] text-primary">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span>SLA Compliance: {metrics.sla_compliance_rate}</span>
                </div>
            </div>

            {/* Pipeline Stage Tracker Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: '1. Created', desc: 'At SC / PHC', icon: 'edit_document', count: referrals.filter(r => r.status === 'CREATED').length },
                    { label: '2. Accepted', desc: 'By Receiving Facility', icon: 'task_alt', count: referrals.filter(r => r.status === 'ACCEPTED').length },
                    { label: '3. In-Transit', desc: '108 Ambulance / Transport', icon: 'ambulance', count: referrals.filter(r => r.status === 'IN_TRANSIT').length },
                    { label: '4. Consulted', desc: 'Specialist Workup Done', icon: 'clinical_notes', count: referrals.filter(r => r.status === 'CONSULTED').length },
                    { label: '5. Completed', desc: 'Closed & Synced to ABHA', icon: 'verified', count: referrals.filter(r => r.status === 'COMPLETED').length },
                ].map((st, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-surface-container-high shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">{st.icon}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-on-surface block leading-tight">{st.label}</span>
                                <span className="text-[10px] font-black px-1.5 py-0.2 bg-surface-container-high rounded text-primary">{st.count}</span>
                            </div>
                            <span className="text-[10px] text-tertiary">{st.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4 bg-white p-4 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-tertiary">
                        <span className="material-symbols-outlined text-primary text-lg">filter_alt</span>
                        <span className="text-xs font-bold text-on-surface">Filters:</span>
                    </div>

                    {/* Status Dropdown */}
                    <AnimatedSelect
                        id="referral-status-filter"
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val)}
                        options={STATUS_OPTIONS}
                        minWidth="min-w-[210px]"
                    />

                    {/* Urgency Dropdown */}
                    <AnimatedSelect
                        id="referral-urgency-filter"
                        value={filterUrgency}
                        onChange={(val) => setFilterUrgency(val)}
                        options={URGENCY_OPTIONS}
                        minWidth="min-w-[190px]"
                    />
                </div>

                {(filterStatus !== 'ALL' || filterUrgency !== 'ALL') && (
                    <button
                        onClick={() => {
                            setFilterStatus('ALL');
                            setFilterUrgency('ALL');
                        }}
                        className="text-xs font-bold text-primary hover:text-primary/70 flex items-center gap-1 self-start sm:self-auto transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        <span>Reset Filters</span>
                    </button>
                )}
            </div>

            {/* Referral Cards List */}
            {loading ? (
                <div className="text-center py-16">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                    <p className="text-xs text-tertiary mt-2">Loading active referral pipeline...</p>
                </div>
            ) : referrals.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high">
                    <span className="material-symbols-outlined text-4xl text-tertiary mb-2">find_in_page</span>
                    <h3 className="text-base font-bold text-on-surface">No referrals found</h3>
                    <p className="text-xs text-tertiary mt-1">No referrals match the current status filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {referrals.map((ref) => (
                        <div
                            key={ref.id}
                            className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card hover:border-primary/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
                            {/* Left: Patient and Hierarchy Details */}
                            <div className="space-y-3 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="font-mono font-black text-sm text-primary">{ref.id}</span>
                                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getUrgencyBadge(ref.urgency)}`}>
                                        {ref.urgency}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusBadge(ref.status)}`}>
                                        Status: {ref.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-semibold text-tertiary">
                                        ABHA: <strong>{ref.abha_id}</strong>
                                    </span>
                                    {ref.referring_role && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-container text-tertiary rounded-md">
                                            Initiated By: {ref.referring_role.toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-base font-extrabold text-on-surface">
                                        {ref.patient_name} <span className="text-xs font-normal text-tertiary">({ref.patient_gender}, {ref.patient_age} yrs)</span>
                                    </h3>
                                    <p className="text-xs text-on-surface font-semibold mt-0.5">
                                        Diagnosis: <span className="text-primary">{ref.provisional_diagnosis}</span> • Specialty: <span className="font-bold">{ref.specialty}</span>
                                    </p>
                                </div>

                                {/* Facility & Doctor Transition Path */}
                                <div className="p-3.5 bg-surface-container-low rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-surface-container/60">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-base">domain</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">From: {ref.referring_doctor_name}</span>
                                                <span className="font-bold text-on-surface">{ref.referring_facility_name}</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-tertiary hidden sm:inline">arrow_forward</span>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-teal-600 text-base">local_hospital</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">
                                                    To: {ref.destination_doctor_name || 'Assigned Specialist'}
                                                </span>
                                                <span className="font-bold text-teal-800">{ref.destination_facility_name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            onClick={() => {
                                                setPassReferral(ref);
                                                setIsDigitalPassOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-container text-teal-800 font-bold text-xs rounded-xl shadow-xs border border-surface-container transition-all cursor-pointer"
                                            title="View ABDM Digital Referral Pass"
                                        >
                                            <span className="material-symbols-outlined text-sm text-teal-700">qr_code_2</span>
                                            <span>Digital Pass</span>
                                        </button>

                                        <button
                                            onClick={() => setSelectedReferral(ref)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-container text-primary font-bold text-xs rounded-xl shadow-xs border border-surface-container transition-all group cursor-pointer"
                                            title="View Referral Audit Timeline"
                                        >
                                            <span className="material-symbols-outlined text-sm text-primary group-hover:scale-110 transition-transform">timeline</span>
                                            <span>Audit Timeline ({ref.timeline?.length || 1})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions & Status Advancement */}
                            <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-surface-container-high pt-4 lg:pt-0 lg:pl-6">
                                {/* Status & Action: Only Receiving Doctors / Facility Managers can accept incoming referrals */}
                                {ref.status === 'CREATED' && (
                                    (activeRole === 'doctor' || activeRole === 'facility_manager') && ref.referring_role !== 'doctor' ? (
                                        <button
                                            onClick={() => handleUpdateStatus(ref.id, 'ACCEPTED')}
                                            disabled={statusUpdating === ref.id}
                                            className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-base">check_circle</span>
                                            <span>Accept Referral</span>
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            <span>Awaiting Doctor Intake</span>
                                        </span>
                                    )
                                )}

                                {ref.status === 'ACCEPTED' && (
                                    (activeRole === 'doctor' || activeRole === 'facility_manager') ? (
                                        <button
                                            onClick={() => handleUpdateStatus(ref.id, 'IN_TRANSIT')}
                                            disabled={statusUpdating === ref.id}
                                            className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-base">ambulance</span>
                                            <span>Mark In-Transit (108)</span>
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            <span>Accepted by Medical Officer</span>
                                        </span>
                                    )
                                )}

                                {ref.status === 'IN_TRANSIT' && (
                                    (activeRole === 'doctor' || activeRole === 'facility_manager') ? (
                                        <button
                                            onClick={() => handleUpdateStatus(ref.id, 'CONSULTED')}
                                            disabled={statusUpdating === ref.id}
                                            className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-base">medical_services</span>
                                            <span>Record Consultation</span>
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">ambulance</span>
                                            <span>In-Transit (108)</span>
                                        </span>
                                    )
                                )}

                                {ref.status === 'CONSULTED' && (
                                    (activeRole === 'doctor' || activeRole === 'facility_manager') ? (
                                        <button
                                            onClick={() => handleUpdateStatus(ref.id, 'COMPLETED')}
                                            disabled={statusUpdating === ref.id}
                                            className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-base">verified</span>
                                            <span>Complete & Close Case</span>
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">medical_services</span>
                                            <span>Consultation Done</span>
                                        </span>
                                    )
                                )}

                                {ref.status === 'COMPLETED' && (
                                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">verified</span>
                                        <span>Case Closed</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Timeline Detail Modal */}
            {selectedReferral && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-xl w-full rounded-3xl p-6 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-4">
                            <div>
                                <span className="text-xs font-mono font-bold text-primary">{selectedReferral.id}</span>
                                <h3 className="text-lg font-bold text-on-surface">{selectedReferral.patient_name}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedReferral(null)}
                                className="p-2 rounded-full text-tertiary hover:bg-surface-container cursor-pointer"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-surface-container-low p-4 rounded-2xl text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-tertiary">Specialty:</span>
                                    <span className="font-bold text-on-surface">{selectedReferral.specialty}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-tertiary">Vitals:</span>
                                    <span className="font-bold text-on-surface">{selectedReferral.vitals_summary}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-tertiary">Referring Provider:</span>
                                    <span className="font-bold text-on-surface">{selectedReferral.referring_doctor_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-tertiary">Destination Doctor:</span>
                                    <span className="font-bold text-teal-800">{selectedReferral.destination_doctor_name || 'Receiving Medical Specialist'}</span>
                                </div>
                            </div>

                            {/* Timeline audit steps */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-3">Lifecycle Event Log</h4>
                                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                                    {(selectedReferral.timeline || []).map((step: any, i: number) => (
                                        <div key={i} className="flex items-start gap-3 relative z-10">
                                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="bg-surface-container-low p-3 rounded-2xl flex-1 text-xs">
                                                <div className="flex items-center justify-between font-bold text-on-surface">
                                                    <span>{step.status}</span>
                                                    <span className="text-[10px] text-tertiary font-normal">{step.timestamp ? new Date(step.timestamp).toLocaleString() : ''}</span>
                                                </div>
                                                <p className="text-tertiary text-[11px] mt-0.5">{step.notes}</p>
                                                <span className="text-[10px] text-primary font-semibold block mt-1">Actor: {step.actor}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Official Digital Inter-Facility Referral Pass Modal */}
            {isDigitalPassOpen && passReferral && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                                    <span className="material-symbols-outlined text-2xl">verified</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-widest block">Ministry of Health & Family Welfare • ABDM</span>
                                    <h3 className="text-lg font-black text-on-surface">Official Inter-Facility Referral Pass</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDigitalPassOpen(false)}
                                className="p-2 rounded-full text-tertiary hover:bg-surface-container cursor-pointer"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Pass Header & Token Strip */}
                            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-teal-800">Unique Referral Token</span>
                                    <div className="font-mono text-2xl font-black text-teal-950 tracking-wider">{passReferral.id}</div>
                                    <span className="text-xs text-teal-800 font-semibold block mt-0.5">
                                        Urgency Tier: <strong className="uppercase">{passReferral.urgency}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-teal-100 shadow-xs">
                                    <div className="w-16 h-16 bg-slate-900 text-white p-1 rounded-lg flex flex-col items-center justify-center font-mono text-[9px] text-center leading-none">
                                        <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                                    </div>
                                    <div className="text-[10px] text-tertiary">
                                        <span className="font-bold text-on-surface block">Scan at OPD Counter</span>
                                        <span>Instant Electronic Intake & Slot Confirmation</span>
                                    </div>
                                </div>
                            </div>

                            {/* Patient Demographics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-2xl text-xs">
                                <div>
                                    <span className="text-[10px] text-tertiary block font-medium">Patient Name</span>
                                    <span className="font-bold text-on-surface">{passReferral.patient_name}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-tertiary block font-medium">Age & Gender</span>
                                    <span className="font-bold text-on-surface">{passReferral.patient_age} yrs • {passReferral.patient_gender}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-[10px] text-tertiary block font-medium">ABHA Health ID</span>
                                    <span className="font-bold font-mono text-primary">{passReferral.abha_id}</span>
                                </div>
                            </div>

                            {/* Healthcare Facility Hierarchy Route */}
                            <div className="border border-surface-container-high rounded-2xl p-4 space-y-3">
                                <span className="text-[10px] font-bold uppercase text-tertiary tracking-wider block">Inter-Facility Escalation Route</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                        <span className="text-[10px] font-bold text-blue-800 uppercase block">Referring Authority</span>
                                        <span className="text-xs font-extrabold text-on-surface block">{passReferral.referring_doctor_name}</span>
                                        <span className="text-[11px] text-tertiary block">{passReferral.referring_facility_name}</span>
                                        <span className="text-[10px] text-blue-700 font-semibold mt-1 block">Role: {passReferral.referring_role?.toUpperCase() || 'HEALTH WORKER'}</span>
                                    </div>
                                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                                        <span className="text-[10px] font-bold text-teal-800 uppercase block">Receiving Specialist & Hospital</span>
                                        <span className="text-xs font-extrabold text-teal-950 block">{passReferral.destination_doctor_name || 'Receiving Medical Specialist'}</span>
                                        <span className="text-[11px] text-tertiary block">{passReferral.destination_facility_name}</span>
                                        <span className="text-[10px] text-teal-700 font-semibold mt-1 block">Specialty: {passReferral.specialty}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Assessment */}
                            <div className="bg-surface-container-low p-4 rounded-2xl text-xs space-y-2">
                                <div>
                                    <span className="text-[10px] text-tertiary block font-medium">Provisional Diagnosis</span>
                                    <span className="font-bold text-on-surface text-sm">{passReferral.provisional_diagnosis}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-tertiary block font-medium">Clinical Reason & Observations</span>
                                    <p className="text-on-surface mt-0.5">{passReferral.clinical_reason}</p>
                                </div>
                                {passReferral.vitals_summary && (
                                    <div>
                                        <span className="text-[10px] text-tertiary block font-medium">Vital Signs Snapshot</span>
                                        <span className="font-mono font-bold text-primary">{passReferral.vitals_summary}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-2 flex justify-end gap-2 border-t border-surface-container-high">
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">print</span>
                                    <span>Print Referral Pass</span>
                                </button>
                                <button
                                    onClick={() => setIsDigitalPassOpen(false)}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Role-Based Patient Referral Creator Wizard Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                                    {activeRole === 'fhw' || activeRole === 'asha'
                                        ? 'ASHA Community Referral Wizard'
                                        : 'Medical Officer Specialist Referral Wizard'}
                                </span>
                                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">add_circle</span>
                                    <span>Generate Patient Referral Pass</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 rounded-full text-tertiary hover:bg-surface-container cursor-pointer"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center justify-between mb-6 border-b border-surface-container-high/60 pb-3 text-xs">
                            <button
                                type="button"
                                onClick={() => setWizardStep(1)}
                                className={`flex items-center gap-1.5 font-bold cursor-pointer ${
                                    wizardStep === 1 ? 'text-primary' : 'text-tertiary'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    wizardStep === 1 ? 'bg-primary text-white' : 'bg-surface-container text-tertiary'
                                }`}>1</span>
                                <span>Select Patient</span>
                            </button>
                            <span className="text-tertiary">→</span>
                            <button
                                type="button"
                                onClick={() => setWizardStep(2)}
                                className={`flex items-center gap-1.5 font-bold cursor-pointer ${
                                    wizardStep === 2 ? 'text-primary' : 'text-tertiary'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    wizardStep === 2 ? 'bg-primary text-white' : 'bg-surface-container text-tertiary'
                                }`}>2</span>
                                <span>Destination Doctor</span>
                            </button>
                            <span className="text-tertiary">→</span>
                            <button
                                type="button"
                                onClick={() => setWizardStep(3)}
                                className={`flex items-center gap-1.5 font-bold cursor-pointer ${
                                    wizardStep === 3 ? 'text-primary' : 'text-tertiary'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    wizardStep === 3 ? 'bg-primary text-white' : 'bg-surface-container text-tertiary'
                                }`}>3</span>
                                <span>Clinical Findings</span>
                            </button>
                        </div>

                        {loadingDirectory ? (
                            <div className="py-12 text-center">
                                <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                                <p className="text-xs text-tertiary mt-2">Loading verified clinical registry...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateReferral} className="space-y-5">
                                {/* STEP 1: PATIENT SELECTION */}
                                {wizardStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase text-tertiary tracking-wider">Step 1: Select Registered Patient / Beneficiary</h4>
                                                <p className="text-xs text-on-surface font-semibold">Choose patient to review health profile and initiate referral.</p>
                                            </div>

                                            {/* Category filter pills */}
                                            <div className="flex flex-wrap gap-1">
                                                {['ALL', 'Maternal ANC', 'NCD Chronic', 'HIGH_RISK'].map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setPatientCategoryFilter(cat)}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                                            patientCategoryFilter === cat
                                                                ? 'bg-primary text-white'
                                                                : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                                                        }`}
                                                    >
                                                        {cat === 'HIGH_RISK' ? '🔴 High Risk' : cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Search Input */}
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-lg">search</span>
                                            <input
                                                type="text"
                                                placeholder="Search by patient name, ABHA ID, village..."
                                                value={patientSearch}
                                                onChange={(e) => setPatientSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        {/* Patient Selection Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                            {filteredPatients.map((p) => {
                                                const isSelected = selectedPatient?.id === p.id;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleSelectPatient(p)}
                                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                            isSelected
                                                                ? 'bg-teal-50/80 border-primary shadow-sm ring-2 ring-primary/20'
                                                                : 'bg-white border-surface-container-high hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                            isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                                                        }`}>
                                                            {p.gender === 'Female' ? '👩' : '👨'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-xs font-bold text-on-surface truncate">{p.name}</span>
                                                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                                                    p.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                                                }`}>
                                                                    {p.risk_level}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-tertiary block">
                                                                {p.gender}, {p.age} yrs • {p.village_name}
                                                            </span>
                                                            <span className="text-[10px] font-mono font-semibold text-primary block mt-0.5 truncate">
                                                                ABHA: {p.abha_id}
                                                            </span>
                                                            {p.vitals_summary && (
                                                                <span className="text-[9px] text-tertiary block mt-0.5 truncate">
                                                                    {p.vitals_summary}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {selectedPatient && (
                                            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                                                    <span>Selected: <strong>{selectedPatient.name}</strong> ({selectedPatient.abha_id})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(2)}
                                                    className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary/90 cursor-pointer"
                                                >
                                                    Continue to Doctor Selection →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 2: DESTINATION DOCTOR SELECTION (RBAC) */}
                                {wizardStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                                            <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                                <span className="material-symbols-outlined text-base">alt_route</span>
                                                <span>
                                                    {activeRole === 'fhw' || activeRole === 'asha'
                                                        ? 'ASHA Escalation Rule: Select Verified Medical Officer / Doctor'
                                                        : 'Doctor Escalation Rule: Select Specialist / Tertiary Care Doctor'}
                                                </span>
                                            </div>
                                            <p className="text-blue-800 text-[11px]">
                                                {activeRole === 'fhw' || activeRole === 'asha'
                                                    ? 'As an ASHA worker, your referral is automatically routed to Primary Care Medical Officers for clinical consultation.'
                                                    : 'As a Medical Officer, you can refer patients for specialist review across Community Health Centres, District Hospitals, and Medical Colleges.'}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase text-tertiary tracking-wider">
                                                Step 2: Choose Destination Doctor
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                                {filteredDoctors.map((doc) => {
                                                    const isSelected = selectedDoctor?.id === doc.id;
                                                    return (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => handleSelectDoctor(doc)}
                                                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                                isSelected
                                                                    ? 'bg-teal-50/80 border-primary shadow-sm ring-2 ring-primary/20'
                                                                    : 'bg-white border-surface-container-high hover:border-primary/40'
                                                            }`}
                                                        >
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                                isSelected ? 'bg-primary text-white' : 'bg-teal-100 text-teal-800'
                                                            }`}>
                                                                🩺
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="text-xs font-bold text-on-surface truncate">{doc.name}</span>
                                                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                                                        {doc.opd_status || 'AVAILABLE'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-primary font-semibold block truncate">
                                                                    {doc.specialty}
                                                                </span>
                                                                <span className="text-[10px] text-tertiary block truncate">
                                                                    {doc.facility_name} ({doc.tier})
                                                                </span>
                                                                <span className="text-[9px] text-tertiary block mt-0.5">
                                                                    {doc.qualification} • {doc.experience}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(1)}
                                                className="px-3 py-1.5 text-xs font-bold text-tertiary hover:bg-surface-container rounded-lg cursor-pointer"
                                            >
                                                ← Back to Patient
                                            </button>
                                            {selectedDoctor && (
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(3)}
                                                    className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary/90 cursor-pointer"
                                                >
                                                    Continue to Clinical Details →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: CLINICAL FINDINGS & SUBMIT */}
                                {wizardStep === 3 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low p-3.5 rounded-2xl text-xs">
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Patient</span>
                                                <span className="font-bold text-on-surface">{selectedPatient?.name} ({selectedPatient?.age} yrs, {selectedPatient?.gender})</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Destination Doctor</span>
                                                <span className="font-bold text-teal-800">{selectedDoctor?.name} ({selectedDoctor?.facility_name})</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-tertiary mb-1">Urgency Level</label>
                                                <select
                                                    value={newRef.urgency}
                                                    onChange={(e) => setNewRef({ ...newRef, urgency: e.target.value })}
                                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                                >
                                                    <option value="EMERGENCY">🔴 EMERGENCY (Immediate 108 Transit)</option>
                                                    <option value="URGENT">🟡 URGENT (Within 24 Hours)</option>
                                                    <option value="ROUTINE">🟢 ROUTINE (Within 7 Days)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-tertiary mb-1">Target Specialty</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newRef.specialty}
                                                    onChange={(e) => setNewRef({ ...newRef, specialty: e.target.value })}
                                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Provisional Diagnosis</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Severe Preeclampsia / Suspected Unstable Angina"
                                                value={newRef.provisional_diagnosis}
                                                onChange={(e) => setNewRef({ ...newRef, provisional_diagnosis: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Clinical Reason & Reason for Referral</label>
                                            <textarea
                                                required
                                                rows={2}
                                                placeholder="Describe symptoms, vital red flags, lab markers..."
                                                value={newRef.clinical_reason}
                                                onChange={(e) => setNewRef({ ...newRef, clinical_reason: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Vitals Summary Snapshot</label>
                                            <input
                                                type="text"
                                                value={newRef.vitals_summary}
                                                onChange={(e) => setNewRef({ ...newRef, vitals_summary: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-mono font-bold text-primary border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div className="pt-3 flex justify-between items-center border-t border-surface-container-high">
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(2)}
                                                className="px-3 py-2 text-xs font-bold text-tertiary hover:bg-surface-container rounded-lg cursor-pointer"
                                            >
                                                ← Back to Doctor
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCreateModalOpen(false)}
                                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-sm">send</span>
                                                    <span>{submitting ? 'Issuing Pass...' : 'Issue & Transmit Referral Pass'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
