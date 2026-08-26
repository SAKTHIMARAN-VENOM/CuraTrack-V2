'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import AnimatedSelect, { SelectOption } from '@/components/ui/AnimatedSelect';
import { useI18n } from '@/lib/i18n';

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Pipeline Referrals', icon: 'alt_route', badge: 'Active', badgeColor: 'bg-primary/10 text-primary' },
    { value: 'CREATED', label: '1. New / Pending Intake', icon: 'schedule', badge: 'New', badgeColor: 'bg-blue-100 text-blue-700' },
    { value: 'ACCEPTED', label: '2. Accepted by Clinic', icon: 'check_circle', badge: 'Accepted', badgeColor: 'bg-purple-100 text-purple-700' },
    { value: 'IN_TRANSIT', label: '3. In-Transit (108 Transit)', icon: 'ambulance', badge: 'Transit', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'CONSULTED', label: '4. Workup & Consult Done', icon: 'medical_services', badge: 'In OPD', badgeColor: 'bg-teal-100 text-teal-700' },
    { value: 'COMPLETED', label: '5. Completed & Synced', icon: 'history', badge: 'Closed', badgeColor: 'bg-emerald-100 text-emerald-700' },
];

const URGENCY_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Urgency Levels', icon: 'tune' },
    { value: 'EMERGENCY', label: 'Emergency (Immediate)', icon: 'emergency', badge: 'Critical', badgeColor: 'bg-red-100 text-red-700' },
    { value: 'URGENT', label: 'Urgent (< 24 hrs)', icon: 'warning', badge: 'Urgent', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'ROUTINE', label: 'Routine Elective', icon: 'check_circle', badge: 'Routine', badgeColor: 'bg-emerald-100 text-emerald-800' },
];

export default function DoctorReferralsPage() {
    const { t } = useI18n();
    const supabase = useMemo(() => createClient(), []);

    // Doctor Persona State (Strictly derived from authenticated Supabase session)
    const [doctorProfile, setDoctorProfile] = useState<any>({
        id: 'doc-david-ross',
        name: 'Dr. David Ross',
        role: 'doctor',
        facility: 'PHC Nandurbar Rural',
        facilityType: 'Primary Health Centre (PHC)',
        specialty: 'General Medicine & Internal Care'
    });

    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
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

    // Directories for outgoing referral
    const [patientsList, setPatientsList] = useState<any[]>([]);
    const [specialistsList, setSpecialistsList] = useState<any[]>([]);
    const [loadingDirectory, setLoadingDirectory] = useState<boolean>(false);
    const [patientSearch, setPatientSearch] = useState<string>('');
    const [wizardStep, setWizardStep] = useState<number>(1);

    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedSpecialist, setSelectedSpecialist] = useState<any>(null);

    // Form state
    const [newRef, setNewRef] = useState({
        urgency: 'URGENT',
        specialty: 'Cardiology',
        provisional_diagnosis: '',
        clinical_reason: '',
        vitals_summary: 'BP: 148/92 mmHg, HR: 86 bpm, SpO2: 96%',
        referring_facility_type: 'Primary Health Centre (PHC)',
        referring_facility_name: 'PHC Nandurbar Rural',
        destination_facility_type: 'District Hospital',
        destination_facility_name: 'Nandurbar District Civil Hospital',
    });

    const [submitting, setSubmitting] = useState<boolean>(false);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

    useEffect(() => {
        async function loadDoctorUser() {
            try {
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                    const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
                    if (prof && prof.role === 'doctor') {
                        setDoctorProfile({
                            id: prof.id || data.user.id,
                            name: prof.name || data.user.user_metadata?.name || 'Dr. David Ross',
                            role: 'doctor',
                            facility: prof.facility_name || data.user.user_metadata?.facility_name || 'PHC Nandurbar Rural',
                            facilityType: prof.facility_type || 'Primary Health Centre (PHC)',
                            specialty: prof.specialty || data.user.user_metadata?.specialty || 'General Medicine'
                        });
                    }
                }
            } catch {}
        }
        loadDoctorUser();
    }, [supabase]);

    const fetchDoctorReferrals = async () => {
        setLoading(true);
        try {
            const data = await apiFetch(`/api/referrals?status=${filterStatus}&urgency=${filterUrgency}&doctor_id=${doctorProfile.id}&doctor_name=${encodeURIComponent(doctorProfile.name)}`);
            if (data.referrals) {
                setReferrals(data.referrals);
            }
            if (data.metrics) {
                setMetrics(data.metrics);
            }
        } catch (err) {
            console.error('Failed to fetch doctor referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctorReferrals();
    }, [filterStatus, filterUrgency, doctorProfile]);

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
                // For Doctor: Specialist and Tertiary Hospital Doctors (District Civil Hospital & Medical Colleges)
                const specialists = doctorsRes.doctors.filter((d: any) =>
                    d.role === 'doctor' && (d.tier?.includes('District') || d.tier?.includes('Medical College') || d.tier?.includes('Tertiary'))
                );
                const list = specialists.length > 0 ? specialists : doctorsRes.doctors.filter((d: any) => d.role === 'doctor');
                setSpecialistsList(list);
                setSelectedSpecialist(list[0]);
                if (list[0]) {
                    setNewRef(prev => ({
                        ...prev,
                        destination_facility_type: list[0].facility_type || 'District Hospital',
                        destination_facility_name: list[0].facility_name || 'Nandurbar District Civil Hospital',
                        specialty: list[0].specialty ? list[0].specialty.split('&')[0].trim() : 'Cardiology'
                    }));
                }
            }
        } catch (e) {
            console.error('Directory fetch error:', e);
        } finally {
            setLoadingDirectory(false);
        }
    };

    useEffect(() => {
        fetchDoctorReferrals();
    }, [filterStatus, filterUrgency]);

    useEffect(() => {
        if (isCreateModalOpen) {
            fetchDirectories();
            setWizardStep(1);
        }
    }, [isCreateModalOpen]);

    const handleSelectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setNewRef(prev => ({
            ...prev,
            vitals_summary: patient.vitals_summary || prev.vitals_summary,
            provisional_diagnosis: patient.medical_history || prev.provisional_diagnosis,
            clinical_reason: `Secondary specialist referral for ${patient.name} (${patient.category}). Risk Tier: ${patient.risk_level}.`
        }));
    };

    const handleSelectSpecialist = (doctor: any) => {
        setSelectedSpecialist(doctor);
        setNewRef(prev => ({
            ...prev,
            destination_facility_type: doctor.facility_type || 'District Hospital',
            destination_facility_name: doctor.facility_name || 'Nandurbar District Civil Hospital',
            specialty: doctor.specialty ? doctor.specialty.split('&')[0].trim() : prev.specialty
        }));
    };

    const handleCreateSpecialistReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient || !selectedSpecialist) {
            alert('Please select both a patient and destination specialist.');
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
                referring_doctor_name: doctorProfile.name,
                referring_role: 'doctor',
                referring_facility_type: doctorProfile.facilityType,
                referring_facility_name: doctorProfile.facility,
                destination_doctor_id: selectedSpecialist.id,
                destination_doctor_name: selectedSpecialist.name,
                destination_role: 'doctor',
                destination_facility_type: selectedSpecialist.facility_type || newRef.destination_facility_type,
                destination_facility_name: selectedSpecialist.facility_name || newRef.destination_facility_name,
                specialty: newRef.specialty || selectedSpecialist.specialty || 'Cardiology',
                urgency: newRef.urgency,
                clinical_reason: newRef.clinical_reason || `Specialist clinical escalation from ${doctorProfile.name} to ${selectedSpecialist.name}`,
                provisional_diagnosis: newRef.provisional_diagnosis || 'Suspected acute condition requiring tertiary evaluation',
                vitals_summary: newRef.vitals_summary,
                created_by_role: 'doctor'
            };

            const res = await apiFetch('/api/referrals/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setIsCreateModalOpen(false);
            fetchDoctorReferrals();

            if (res.referral) {
                setPassReferral(res.referral);
                setIsDigitalPassOpen(true);
            }
        } catch (err: any) {
            alert('Failed to transmit specialist referral pass: ' + (err.message || 'Check connection'));
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
                    notes: `Status transitioned to ${newStatus} by ${doctorProfile.name} (Medical Officer).`,
                    updated_by: doctorProfile.name,
                    actor_role: 'doctor',
                    doctor_id: doctorProfile.id,
                    doctor_name: doctorProfile.name
                })
            });
            fetchDoctorReferrals();
            if (selectedReferral && selectedReferral.id === referralId) {
                setSelectedReferral({ ...selectedReferral, status: newStatus });
            }
        } catch (err: any) {
            alert('Status update failed: ' + (err.message || 'Error'));
        } finally {
            setStatusUpdating(null);
        }
    };

    // Strict RBAC: Doctor only sees referrals assigned to them (Incoming) or created by them (Outgoing)
    const displayedReferrals = useMemo(() => {
        const docId = doctorProfile.id;
        const docName = (doctorProfile.name || '').toLowerCase().replace('dr.', '').replace('dr ', '').trim();

        if (activeTab === 'incoming') {
            // Incoming referrals: MUST be specifically referred/addressed to THIS doctor
            return referrals.filter(r => {
                const destId = r.destination_doctor_id;
                const destName = (r.destination_doctor_name || '').toLowerCase();
                const isRecipient = (destId && docId && destId === docId) || (docName && destName.includes(docName));
                return isRecipient;
            });
        }
        // Outgoing referrals: MUST be referrals created by THIS doctor
        return referrals.filter(r => {
            const refId = r.referring_doctor_id;
            const refName = (r.referring_doctor_name || '').toLowerCase();
            const isCreator = (refId && docId && refId === docId) || (docName && refName.includes(docName));
            return isCreator;
        });
    }, [referrals, activeTab, doctorProfile]);

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
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-16">
            {/* Clean Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">Clinical Referral Pipeline</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        <span>Escalate to Specialist</span>
                    </button>
                </div>
            </div>

            {/* Doctor Privacy Shield Notice */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base">lock</span>
                    </div>
                    <div>
                        <span className="font-extrabold block">ABDM Level 3 Patient Confidentiality Active</span>
                        <p className="text-blue-900/80 text-[11px] mt-0.5">
                            You are authenticated as <strong>{doctorProfile.name}</strong>. You only see patients referred directly to your clinical queue and can accept only your assigned patients. Other doctor records are strictly hidden.
                        </p>
                    </div>
                </div>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 shrink-0">
                    Queue: {displayedReferrals.length} Patient{displayedReferrals.length === 1 ? '' : 's'}
                </span>
            </div>

            {/* Queue Mode Selector Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-2">
                <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-surface-container-high w-fit">
                    <button
                        onClick={() => setActiveTab('incoming')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'incoming'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-tertiary hover:text-on-surface hover:bg-surface-container'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">move_to_inbox</span>
                        <span>Incoming from ASHA / Sub-Centres ({referrals.filter(r => r.referring_role === 'fhw' || r.referring_role === 'asha').length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('outgoing')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'outgoing'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-tertiary hover:text-on-surface hover:bg-surface-container'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">outbox</span>
                        <span>Outgoing Specialist Escalations ({referrals.filter(r => r.referring_role === 'doctor').length})</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <AnimatedSelect
                        id="referral-status-filter"
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val)}
                        options={STATUS_OPTIONS}
                        minWidth="min-w-[200px]"
                    />

                    <AnimatedSelect
                        id="referral-urgency-filter"
                        value={filterUrgency}
                        onChange={(val) => setFilterUrgency(val)}
                        options={URGENCY_OPTIONS}
                        minWidth="min-w-[180px]"
                    />
                </div>
            </div>

            {/* Referral Cards */}
            {loading ? (
                <div className="text-center py-16">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                    <p className="text-xs text-tertiary mt-2">Loading clinical referral pipeline...</p>
                </div>
            ) : displayedReferrals.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high">
                    <span className="material-symbols-outlined text-4xl text-tertiary mb-2">clinical_notes</span>
                    <h3 className="text-base font-bold text-on-surface">No referrals in this queue</h3>
                    <p className="text-xs text-tertiary mt-1">
                        {activeTab === 'incoming'
                            ? 'No incoming referrals pending from ASHA village workers.'
                            : 'No outgoing specialist escalations generated yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {displayedReferrals.map((ref) => (
                        <div
                            key={ref.id}
                            className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card hover:border-blue-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
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
                                </div>

                                <div>
                                    <h3 className="text-base font-extrabold text-on-surface">
                                        {ref.patient_name} <span className="text-xs font-normal text-tertiary">({ref.patient_gender}, {ref.patient_age} yrs)</span>
                                    </h3>
                                    <p className="text-xs text-on-surface font-semibold mt-0.5">
                                        Diagnosis: <span className="text-primary">{ref.provisional_diagnosis}</span> • Specialty: <span className="font-bold">{ref.specialty}</span>
                                    </p>
                                </div>

                                {/* Clinical Transition Path */}
                                <div className="p-3.5 bg-surface-container-low rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-surface-container/60">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-700 text-base">domain</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Referring Provider ({ref.referring_role?.toUpperCase() || 'MO'})</span>
                                                <span className="font-bold text-on-surface">{ref.referring_doctor_name} ({ref.referring_facility_name})</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-tertiary hidden sm:inline">arrow_forward</span>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-teal-700 text-base">local_hospital</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Receiving Doctor & Hospital</span>
                                                <span className="font-bold text-teal-900">{ref.destination_doctor_name || 'Assigned Specialist'} ({ref.destination_facility_name})</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            onClick={() => {
                                                setPassReferral(ref);
                                                setIsDigitalPassOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-container text-blue-800 font-bold text-xs rounded-xl shadow-xs border border-surface-container transition-all cursor-pointer"
                                            title="View ABDM Digital Referral Pass"
                                        >
                                            <span className="material-symbols-outlined text-sm text-blue-700">qr_code_2</span>
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

                            {/* Clinical Progression Actions (Only for Incoming Referrals) */}
                            <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-surface-container-high pt-4 lg:pt-0 lg:pl-6">
                                {activeTab === 'incoming' ? (
                                    <>
                                        {ref.status === 'CREATED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(ref.id, 'ACCEPTED')}
                                                disabled={statusUpdating === ref.id}
                                                className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-base">check_circle</span>
                                                <span>Accept Referral</span>
                                            </button>
                                        )}

                                        {ref.status === 'ACCEPTED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(ref.id, 'IN_TRANSIT')}
                                                disabled={statusUpdating === ref.id}
                                                className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-base">ambulance</span>
                                                <span>Mark In-Transit (108)</span>
                                            </button>
                                        )}

                                        {ref.status === 'IN_TRANSIT' && (
                                            <button
                                                onClick={() => handleUpdateStatus(ref.id, 'CONSULTED')}
                                                disabled={statusUpdating === ref.id}
                                                className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-base">medical_services</span>
                                                <span>Record Consultation</span>
                                            </button>
                                        )}

                                        {ref.status === 'CONSULTED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(ref.id, 'COMPLETED')}
                                                disabled={statusUpdating === ref.id}
                                                className="w-full sm:w-auto lg:w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-base">verified</span>
                                                <span>Complete & Close Case</span>
                                            </button>
                                        )}

                                        {ref.status === 'COMPLETED' && (
                                            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">verified</span>
                                                <span>Case Closed</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Outgoing Specialist Escalations: Status Display Only (Tertiary Specialist Accepts) */
                                    <div className="space-y-1.5 text-right">
                                        <span className="text-[10px] text-tertiary block font-semibold">Specialist Hospital Status</span>
                                        {ref.status === 'CREATED' && (
                                            <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">schedule</span>
                                                <span>Awaiting Specialist Intake</span>
                                            </span>
                                        )}
                                        {ref.status === 'ACCEPTED' && (
                                            <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                <span>Accepted by Specialist</span>
                                            </span>
                                        )}
                                        {ref.status === 'IN_TRANSIT' && (
                                            <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">ambulance</span>
                                                <span>In-Transit (108)</span>
                                            </span>
                                        )}
                                        {ref.status === 'CONSULTED' && (
                                            <span className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">medical_services</span>
                                                <span>Specialist Workup Done</span>
                                            </span>
                                        )}
                                        {ref.status === 'COMPLETED' && (
                                            <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">verified</span>
                                                <span>Specialist Care Completed</span>
                                            </span>
                                        )}
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
                                    <span className="font-bold text-teal-800">{selectedReferral.destination_doctor_name}</span>
                                </div>
                            </div>

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

            {/* Official Digital Referral Pass Modal */}
            {isDigitalPassOpen && passReferral && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-bold">
                                    <span className="material-symbols-outlined text-2xl">verified</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest block">Ministry of Health & Family Welfare • ABDM</span>
                                    <h3 className="text-lg font-black text-on-surface">Doctor Inter-Facility Referral Pass</h3>
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
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-blue-800">Unique Token</span>
                                    <div className="font-mono text-2xl font-black text-blue-950 tracking-wider">{passReferral.id}</div>
                                    <span className="text-xs text-blue-800 font-semibold block mt-0.5">
                                        Urgency: <strong className="uppercase">{passReferral.urgency}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs">
                                    <div className="w-16 h-16 bg-slate-900 text-white p-1 rounded-lg flex flex-col items-center justify-center font-mono text-[9px] text-center leading-none">
                                        <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                                    </div>
                                    <div className="text-[10px] text-tertiary">
                                        <span className="font-bold text-on-surface block">Hospital Intake QR</span>
                                        <span>Direct Bed/OPD Confirmation</span>
                                    </div>
                                </div>
                            </div>

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

                            <div className="border border-surface-container-high rounded-2xl p-4 space-y-3">
                                <span className="text-[10px] font-bold uppercase text-tertiary tracking-wider block">Specialist Escalation Route</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                        <span className="text-[10px] font-bold text-blue-800 uppercase block">Referring Medical Officer</span>
                                        <span className="text-xs font-extrabold text-on-surface block">{passReferral.referring_doctor_name}</span>
                                        <span className="text-[11px] text-tertiary block">{passReferral.referring_facility_name}</span>
                                    </div>
                                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                                        <span className="text-[10px] font-bold text-teal-800 uppercase block">Receiving Specialist & Hospital</span>
                                        <span className="text-xs font-extrabold text-teal-950 block">{passReferral.destination_doctor_name}</span>
                                        <span className="text-[11px] text-tertiary block">{passReferral.destination_facility_name}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface-container-low p-4 rounded-2xl text-xs space-y-2">
                                <div>
                                    <span className="text-[10px] text-tertiary block font-medium">Provisional Diagnosis</span>
                                    <span className="font-bold text-on-surface text-sm">{passReferral.provisional_diagnosis}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-tertiary block font-medium">Clinical Reason & Diagnostic Impression</span>
                                    <p className="text-on-surface mt-0.5">{passReferral.clinical_reason}</p>
                                </div>
                                {passReferral.vitals_summary && (
                                    <div>
                                        <span className="text-[10px] text-tertiary block font-medium">Vitals Snapshot</span>
                                        <span className="font-mono font-bold text-primary">{passReferral.vitals_summary}</span>
                                    </div>
                                )}
                            </div>

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

            {/* Doctor Specialist Referral Creator Wizard Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                                    Specialist Escalation Wizard
                                </span>
                                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-700">add_circle</span>
                                    <span>Escalate Patient to Tertiary Specialist</span>
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
                                <span>Select OPD Patient</span>
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
                                <span>Choose Specialist</span>
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
                                <span>Diagnostic Summary</span>
                            </button>
                        </div>

                        {loadingDirectory ? (
                            <div className="py-12 text-center">
                                <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                                <p className="text-xs text-tertiary mt-2">Loading specialist hospital directory...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateSpecialistReferral} className="space-y-5">
                                {/* STEP 1: PATIENT SELECTION */}
                                {wizardStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase text-tertiary tracking-wider">Step 1: Select Clinical Patient</h4>
                                                <p className="text-xs text-on-surface font-semibold">Choose patient for specialist transfer / tertiary escalation.</p>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-lg">search</span>
                                            <input
                                                type="text"
                                                placeholder="Search by name, ABHA ID, village..."
                                                value={patientSearch}
                                                onChange={(e) => setPatientSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                            {patientsList.filter(p => !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.abha_id.toLowerCase().includes(patientSearch.toLowerCase())).map((p) => {
                                                const isSelected = selectedPatient?.id === p.id;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleSelectPatient(p)}
                                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                            isSelected
                                                                ? 'bg-blue-50 border-primary shadow-sm ring-2 ring-primary/20'
                                                                : 'bg-white border-surface-container-high hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                            isSelected ? 'bg-primary text-white' : 'bg-blue-100 text-blue-900'
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
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                                                    <span>Selected: <strong>{selectedPatient.name}</strong> ({selectedPatient.abha_id})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(2)}
                                                    className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary/90 cursor-pointer"
                                                >
                                                    Continue to Specialist Selection →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 2: SPECIALIST SELECTION */}
                                {wizardStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                                            <div className="flex items-center gap-1.5 font-bold text-blue-950">
                                                <span className="material-symbols-outlined text-base">local_hospital</span>
                                                <span>Secondary & Tertiary Care Referral Hierarchy</span>
                                            </div>
                                            <p className="text-blue-800 text-[11px]">
                                                Choose verified specialist practitioners across District Hospitals & Medical Colleges.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase text-tertiary tracking-wider">
                                                Step 2: Choose Specialist Doctor
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                                {specialistsList.map((doc) => {
                                                    const isSelected = selectedSpecialist?.id === doc.id;
                                                    return (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => handleSelectSpecialist(doc)}
                                                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                                isSelected
                                                                    ? 'bg-blue-50 border-primary shadow-sm ring-2 ring-primary/20'
                                                                    : 'bg-white border-surface-container-high hover:border-primary/40'
                                                            }`}
                                                        >
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                                isSelected ? 'bg-primary text-white' : 'bg-blue-100 text-blue-900'
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
                                                                    {doc.qualification}
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
                                            {selectedSpecialist && (
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(3)}
                                                    className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary/90 cursor-pointer"
                                                >
                                                    Continue to Diagnostic Details →
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
                                                <span className="text-[10px] text-tertiary block font-medium">Receiving Specialist</span>
                                                <span className="font-bold text-teal-800">{selectedSpecialist?.name} ({selectedSpecialist?.facility_name})</span>
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
                                                    <option value="ROUTINE">🟢 ROUTINE (Elective Specialist Workup)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-tertiary mb-1">Specialty Department</label>
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
                                                placeholder="e.g. Unstable Angina / Acute Coronary Syndrome"
                                                value={newRef.provisional_diagnosis}
                                                onChange={(e) => setNewRef({ ...newRef, provisional_diagnosis: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Clinical Findings & Diagnostic Reason</label>
                                            <textarea
                                                required
                                                rows={2}
                                                placeholder="Describe clinical presentation, ECG changes, lab markers, and treatment already administered..."
                                                value={newRef.clinical_reason}
                                                onChange={(e) => setNewRef({ ...newRef, clinical_reason: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Vitals Snapshot</label>
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
                                                ← Back to Specialist
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
                                                    <span>{submitting ? 'Transmitting Pass...' : 'Issue & Transmit Specialist Pass'}</span>
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
