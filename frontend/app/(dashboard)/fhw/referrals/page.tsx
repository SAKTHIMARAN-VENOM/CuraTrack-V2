'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import AnimatedSelect, { SelectOption } from '@/components/ui/AnimatedSelect';
import { useI18n } from '@/lib/i18n';

const STATUS_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Village Referrals', icon: 'alt_route', badge: 'Active', badgeColor: 'bg-primary/10 text-primary' },
    { value: 'CREATED', label: '1. Sent from Sub-Centre', icon: 'schedule', badge: 'Sent', badgeColor: 'bg-blue-100 text-blue-700' },
    { value: 'ACCEPTED', label: '2. Accepted by PHC/CHC', icon: 'check_circle', badge: 'Accepted', badgeColor: 'bg-purple-100 text-purple-700' },
    { value: 'IN_TRANSIT', label: '3. In 108 Transit', icon: 'ambulance', badge: 'Transit', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'CONSULTED', label: '4. Doctor Consulted', icon: 'medical_services', badge: 'In OPD', badgeColor: 'bg-teal-100 text-teal-700' },
    { value: 'COMPLETED', label: '5. Completed & Treated', icon: 'history', badge: 'Done', badgeColor: 'bg-emerald-100 text-emerald-700' },
];

const URGENCY_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: 'All Urgency Levels', icon: 'tune' },
    { value: 'EMERGENCY', label: 'Emergency (108 Ambulance)', icon: 'emergency', badge: 'Critical', badgeColor: 'bg-red-100 text-red-700' },
    { value: 'URGENT', label: 'Urgent (< 24 hrs PHC)', icon: 'warning', badge: 'Urgent', badgeColor: 'bg-amber-100 text-amber-800' },
    { value: 'ROUTINE', label: 'Routine OPD Elective', icon: 'check_circle', badge: 'Routine', badgeColor: 'bg-emerald-100 text-emerald-800' },
];

export default function FhwReferralsPage() {
    const { t } = useI18n();
    const supabase = useMemo(() => createClient(), []);

    // ASHA Persona State
    const [ashaProfile, setAshaProfile] = useState<any>({
        name: 'Sunita Tai (ASHA)',
        role: 'fhw',
        facility: 'Sub-Centre Borvihir',
        facilityType: 'Ayushman Arogya Mandir (Sub-Centre)',
        village: 'Borvihir Pada'
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

    // Patient & Doctor directories
    const [patientsList, setPatientsList] = useState<any[]>([]);
    const [primaryDoctorsList, setPrimaryDoctorsList] = useState<any[]>([]);
    const [loadingDirectory, setLoadingDirectory] = useState<boolean>(false);
    const [patientSearch, setPatientSearch] = useState<string>('');
    const [patientCategoryFilter, setPatientCategoryFilter] = useState<string>('ALL');
    const [wizardStep, setWizardStep] = useState<number>(1);

    // Selected Patient & Destination Doctor
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

    // Form state
    const [newRef, setNewRef] = useState({
        urgency: 'URGENT',
        specialty: 'Obstetrics & Maternal Care',
        provisional_diagnosis: '',
        clinical_reason: '',
        vitals_summary: 'BP: 120/80 mmHg, HR: 74 bpm, SpO2: 98%',
        referring_facility_type: 'Ayushman Arogya Mandir (Sub-Centre)',
        referring_facility_name: 'Sub-Centre Borvihir',
        destination_facility_type: 'Primary Health Centre (PHC)',
        destination_facility_name: 'PHC Nandurbar Rural',
    });

    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        async function loadAshaUser() {
            try {
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                    const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
                    if (prof) {
                        setAshaProfile({
                            name: prof.name || 'Sunita Tai (ASHA)',
                            role: 'fhw',
                            facility: prof.facility_name || 'Sub-Centre Borvihir',
                            facilityType: 'Ayushman Arogya Mandir (Sub-Centre)',
                            village: prof.assigned_village || 'Borvihir Pada'
                        });
                    }
                }
            } catch {}
        }
        loadAshaUser();
    }, [supabase]);

    const fetchVillageReferrals = async () => {
        setLoading(true);
        try {
            const data = await apiFetch(`/api/referrals?status=${filterStatus}&urgency=${filterUrgency}&referring_role=fhw`);
            if (data?.referrals) {
                // Filter to show village referrals initiated by ASHA / FHW or community patients
                setReferrals(data.referrals);
            }
            if (data?.metrics) {
                setMetrics(data.metrics);
            }
        } catch (err) {
            console.error('Failed to fetch ASHA village referrals:', err);
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
                // For ASHA: Strictly filter to Primary Care Medical Officers at PHC / CHC
                const phcDocs = doctorsRes.doctors.filter((d: any) =>
                    d.role === 'doctor' && (d.tier?.includes('PHC') || d.tier?.includes('CHC') || d.tier?.includes('Primary'))
                );
                const availableDocs = phcDocs.length > 0 ? phcDocs : doctorsRes.doctors.filter((d: any) => d.role === 'doctor');
                setPrimaryDoctorsList(availableDocs);
                setSelectedDoctor(availableDocs[0]);
                if (availableDocs[0]) {
                    setNewRef(prev => ({
                        ...prev,
                        destination_facility_type: availableDocs[0].facility_type || 'Primary Health Centre (PHC)',
                        destination_facility_name: availableDocs[0].facility_name || 'PHC Nandurbar Rural'
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
        fetchVillageReferrals();
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
            clinical_reason: `Village community referral initiated for ${patient.name} (${patient.category}). Risk Tier: ${patient.risk_level}.`
        }));
    };

    const handleSelectDoctor = (doctor: any) => {
        setSelectedDoctor(doctor);
        setNewRef(prev => ({
            ...prev,
            destination_facility_type: doctor.facility_type || 'Primary Health Centre (PHC)',
            destination_facility_name: doctor.facility_name || 'PHC Nandurbar Rural',
            specialty: doctor.specialty ? doctor.specialty.split('&')[0].trim() : prev.specialty
        }));
    };

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
            alert('Please select both a patient and destination medical officer.');
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
                referring_doctor_name: ashaProfile.name,
                referring_role: 'fhw',
                referring_facility_type: ashaProfile.facilityType,
                referring_facility_name: ashaProfile.facility,
                destination_doctor_id: selectedDoctor.id,
                destination_doctor_name: selectedDoctor.name,
                destination_role: 'doctor',
                destination_facility_type: selectedDoctor.facility_type || newRef.destination_facility_type,
                destination_facility_name: selectedDoctor.facility_name || newRef.destination_facility_name,
                specialty: newRef.specialty || selectedDoctor.specialty || 'General Medicine',
                urgency: newRef.urgency,
                clinical_reason: newRef.clinical_reason || `Community referral from ${ashaProfile.name} to ${selectedDoctor.name}`,
                provisional_diagnosis: newRef.provisional_diagnosis || 'Suspected acute condition needing doctor evaluation',
                vitals_summary: newRef.vitals_summary,
                created_by_role: 'fhw'
            };

            const res = await apiFetch('/api/referrals/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setIsCreateModalOpen(false);
            fetchVillageReferrals();

            if (res.referral) {
                setPassReferral(res.referral);
                setIsDigitalPassOpen(true);
            }
        } catch (err: any) {
            alert('Failed to transmit village referral pass: ' + (err.message || 'Check connection'));
        } finally {
            setSubmitting(false);
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
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-16">
            {/* Clean Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">Village Referral Network</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        <span>Refer Village Patient to Doctor</span>
                    </button>
                </div>
            </div>

            {/* ASHA Escalation Rule Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">verified</span>
                    </div>
                    <div>
                        <span className="font-bold text-emerald-950">ASHA Protocol: Upward Doctor Escalation</span>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                            Select community beneficiaries from your village register and route them directly to Medical Officers at your linked PHC or CHC.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono font-bold text-[11px] text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                    <span className="material-symbols-outlined text-sm text-emerald-600">ambulance</span>
                    <span>108 Transit Integration: Active</span>
                </div>
            </div>

            {/* Pipeline Stage Tracker Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: '1. Sent by ASHA', desc: 'At Sub-Centre', icon: 'edit_document', count: referrals.filter(r => r.status === 'CREATED').length },
                    { label: '2. PHC Accepted', desc: 'Medical Officer Queue', icon: 'task_alt', count: referrals.filter(r => r.status === 'ACCEPTED').length },
                    { label: '3. In Transit (108)', desc: 'Ambulance / Auto', icon: 'ambulance', count: referrals.filter(r => r.status === 'IN_TRANSIT').length },
                    { label: '4. Doctor Consulted', desc: 'OPD Exam Completed', icon: 'clinical_notes', count: referrals.filter(r => r.status === 'CONSULTED').length },
                    { label: '5. Rx Completed', desc: 'Meds & Home Followup', icon: 'verified', count: referrals.filter(r => r.status === 'COMPLETED').length },
                ].map((st, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-surface-container-high shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">{st.icon}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-on-surface block leading-tight">{st.label}</span>
                                <span className="text-[10px] font-black px-1.5 py-0.2 bg-surface-container-high rounded text-emerald-800">{st.count}</span>
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
                        <span className="material-symbols-outlined text-emerald-700 text-lg">filter_alt</span>
                        <span className="text-xs font-bold text-on-surface">Filters:</span>
                    </div>

                    <AnimatedSelect
                        id="referral-status-filter"
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val)}
                        options={STATUS_OPTIONS}
                        minWidth="min-w-[210px]"
                    />

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
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 self-start sm:self-auto transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        <span>Reset Filters</span>
                    </button>
                )}
            </div>

            {/* Referral Cards */}
            {loading ? (
                <div className="text-center py-16">
                    <span className="material-symbols-outlined animate-spin text-3xl text-emerald-700">progress_activity</span>
                    <p className="text-xs text-tertiary mt-2">Loading village referral queue...</p>
                </div>
            ) : referrals.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high">
                    <span className="material-symbols-outlined text-4xl text-tertiary mb-2">volunteer_activism</span>
                    <h3 className="text-base font-bold text-on-surface">No active village referrals</h3>
                    <p className="text-xs text-tertiary mt-1">Click "Refer Village Patient to Doctor" to initiate a new escalation pass.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {referrals.map((ref) => (
                        <div
                            key={ref.id}
                            className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card hover:border-emerald-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
                            <div className="space-y-3 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="font-mono font-black text-sm text-emerald-800">{ref.id}</span>
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
                                        Suspected: <span className="text-emerald-800">{ref.provisional_diagnosis}</span> • Reason: <span className="text-tertiary">{ref.clinical_reason}</span>
                                    </p>
                                </div>

                                {/* Upward Escalation Route */}
                                <div className="p-3.5 bg-surface-container-low rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-surface-container/60">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-700 text-base">domain</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">ASHA Origin</span>
                                                <span className="font-bold text-on-surface">{ref.referring_facility_name}</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-tertiary hidden sm:inline">arrow_forward</span>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-teal-700 text-base">local_hospital</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Receiving Medical Officer</span>
                                                <span className="font-bold text-teal-900">{ref.destination_doctor_name} ({ref.destination_facility_name})</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            onClick={() => {
                                                setPassReferral(ref);
                                                setIsDigitalPassOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-container text-emerald-800 font-bold text-xs rounded-xl shadow-xs border border-surface-container transition-all cursor-pointer"
                                            title="View ABDM Digital Referral Pass"
                                        >
                                            <span className="material-symbols-outlined text-sm text-emerald-700">qr_code_2</span>
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
                                <span className="text-xs font-mono font-bold text-emerald-800">{selectedReferral.id}</span>
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
                                    <span className="text-tertiary">Destination Doctor:</span>
                                    <span className="font-bold text-teal-900">{selectedReferral.destination_doctor_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-tertiary">Hospital / Clinic:</span>
                                    <span className="font-bold text-on-surface">{selectedReferral.destination_facility_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-tertiary">Vitals:</span>
                                    <span className="font-bold text-on-surface">{selectedReferral.vitals_summary}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-3">Lifecycle Event Log</h4>
                                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                                    {(selectedReferral.timeline || []).map((step: any, i: number) => (
                                        <div key={i} className="flex items-start gap-3 relative z-10">
                                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="bg-surface-container-low p-3 rounded-2xl flex-1 text-xs">
                                                <div className="flex items-center justify-between font-bold text-on-surface">
                                                    <span>{step.status}</span>
                                                    <span className="text-[10px] text-tertiary font-normal">{step.timestamp ? new Date(step.timestamp).toLocaleString() : ''}</span>
                                                </div>
                                                <p className="text-tertiary text-[11px] mt-0.5">{step.notes}</p>
                                                <span className="text-[10px] text-emerald-800 font-semibold block mt-1">Actor: {step.actor}</span>
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
                                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                    <span className="material-symbols-outlined text-2xl">verified</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Ministry of Health & Family Welfare • ABDM</span>
                                    <h3 className="text-lg font-black text-on-surface">ASHA Village Referral Pass</h3>
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
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-emerald-800">Referral ID Token</span>
                                    <div className="font-mono text-2xl font-black text-emerald-950 tracking-wider">{passReferral.id}</div>
                                    <span className="text-xs text-emerald-800 font-semibold block mt-0.5">
                                        Urgency Tier: <strong className="uppercase">{passReferral.urgency}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                                    <div className="w-16 h-16 bg-slate-900 text-white p-1 rounded-lg flex flex-col items-center justify-center font-mono text-[9px] text-center leading-none">
                                        <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                                    </div>
                                    <div className="text-[10px] text-tertiary">
                                        <span className="font-bold text-on-surface block">Show to PHC Counter</span>
                                        <span>Instant Fast-Track OPD Slot</span>
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
                                <span className="text-[10px] font-bold uppercase text-tertiary tracking-wider block">Escalation Route</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Referring ASHA Worker</span>
                                        <span className="text-xs font-extrabold text-on-surface block">{passReferral.referring_doctor_name}</span>
                                        <span className="text-[11px] text-tertiary block">{passReferral.referring_facility_name}</span>
                                    </div>
                                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                                        <span className="text-[10px] font-bold text-teal-800 uppercase block">Receiving Medical Officer</span>
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
                                    <span className="text-[10px] text-tertiary block font-medium">Clinical Reason</span>
                                    <p className="text-on-surface mt-0.5">{passReferral.clinical_reason}</p>
                                </div>
                                {passReferral.vitals_summary && (
                                    <div>
                                        <span className="text-[10px] text-tertiary block font-medium">Vital Signs</span>
                                        <span className="font-mono font-bold text-emerald-800">{passReferral.vitals_summary}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-surface-container-high">
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">print</span>
                                    <span>Print Village Pass</span>
                                </button>
                                <button
                                    onClick={() => setIsDigitalPassOpen(false)}
                                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ASHA 3-Step Wizard Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-3xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                    ASHA Village Escalation Wizard
                                </span>
                                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-700">add_circle</span>
                                    <span>Refer Village Patient to Doctor</span>
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
                                    wizardStep === 1 ? 'text-emerald-800' : 'text-tertiary'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    wizardStep === 1 ? 'bg-emerald-700 text-white' : 'bg-surface-container text-tertiary'
                                }`}>1</span>
                                <span>Select Village Beneficiary</span>
                            </button>
                            <span className="text-tertiary">→</span>
                            <button
                                type="button"
                                onClick={() => setWizardStep(2)}
                                className={`flex items-center gap-1.5 font-bold cursor-pointer ${
                                    wizardStep === 2 ? 'text-emerald-800' : 'text-tertiary'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    wizardStep === 2 ? 'bg-emerald-700 text-white' : 'bg-surface-container text-tertiary'
                                }`}>2</span>
                                <span>Choose Medical Officer</span>
                            </button>
                            <span className="text-tertiary">→</span>
                            <button
                                type="button"
                                onClick={() => setWizardStep(3)}
                                className={`flex items-center gap-1.5 font-bold cursor-pointer ${
                                    wizardStep === 3 ? 'text-emerald-800' : 'text-tertiary'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    wizardStep === 3 ? 'bg-emerald-700 text-white' : 'bg-surface-container text-tertiary'
                                }`}>3</span>
                                <span>Urgency & Vitals</span>
                            </button>
                        </div>

                        {loadingDirectory ? (
                            <div className="py-12 text-center">
                                <span className="material-symbols-outlined animate-spin text-3xl text-emerald-700">progress_activity</span>
                                <p className="text-xs text-tertiary mt-2">Loading village health registry...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateReferral} className="space-y-5">
                                {/* STEP 1: PATIENT SELECTION */}
                                {wizardStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase text-tertiary tracking-wider">Step 1: Choose Village Patient</h4>
                                                <p className="text-xs text-on-surface font-semibold">Select registered beneficiary from your village catchment.</p>
                                            </div>

                                            <div className="flex flex-wrap gap-1">
                                                {['ALL', 'Maternal ANC', 'NCD Chronic', 'HIGH_RISK'].map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setPatientCategoryFilter(cat)}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                                            patientCategoryFilter === cat
                                                                ? 'bg-emerald-700 text-white'
                                                                : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                                                        }`}
                                                    >
                                                        {cat === 'HIGH_RISK' ? '🔴 High Risk' : cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-lg">search</span>
                                            <input
                                                type="text"
                                                placeholder="Search by name, ABHA ID, village..."
                                                value={patientSearch}
                                                onChange={(e) => setPatientSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-emerald-600"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                            {filteredPatients.map((p) => {
                                                const isSelected = selectedPatient?.id === p.id;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleSelectPatient(p)}
                                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                            isSelected
                                                                ? 'bg-emerald-50 border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                                                                : 'bg-white border-surface-container-high hover:border-emerald-500/40'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                            isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'
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
                                                            <span className="text-[10px] font-mono font-semibold text-emerald-800 block mt-0.5 truncate">
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
                                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-emerald-700 text-base">check_circle</span>
                                                    <span>Selected: <strong>{selectedPatient.name}</strong> ({selectedPatient.abha_id})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(2)}
                                                    className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-xs hover:bg-emerald-800 cursor-pointer"
                                                >
                                                    Continue to Doctor Selection →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 2: PRIMARY CARE DOCTOR SELECTION */}
                                {wizardStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
                                            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                                                <span className="material-symbols-outlined text-base">local_hospital</span>
                                                <span>ASHA Rule: Select Verified Primary Care Medical Officer</span>
                                            </div>
                                            <p className="text-emerald-800 text-[11px]">
                                                Your referral is sent to the Medical Officer's OPD queue at the linked PHC / CHC.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase text-tertiary tracking-wider">
                                                Step 2: Choose Receiving Medical Officer
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                                {primaryDoctorsList.map((doc) => {
                                                    const isSelected = selectedDoctor?.id === doc.id;
                                                    return (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => handleSelectDoctor(doc)}
                                                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                                isSelected
                                                                    ? 'bg-emerald-50 border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                                                                    : 'bg-white border-surface-container-high hover:border-emerald-500/40'
                                                            }`}
                                                        >
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                                isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'
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
                                                                <span className="text-[10px] text-emerald-800 font-semibold block truncate">
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
                                            {selectedDoctor && (
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(3)}
                                                    className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-xs hover:bg-emerald-800 cursor-pointer"
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
                                                <span className="text-[10px] text-tertiary block font-medium">Village Patient</span>
                                                <span className="font-bold text-on-surface">{selectedPatient?.name} ({selectedPatient?.age} yrs, {selectedPatient?.gender})</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Receiving Medical Officer</span>
                                                <span className="font-bold text-emerald-900">{selectedDoctor?.name} ({selectedDoctor?.facility_name})</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-tertiary mb-1">Urgency Level</label>
                                                <select
                                                    value={newRef.urgency}
                                                    onChange={(e) => setNewRef({ ...newRef, urgency: e.target.value })}
                                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-emerald-600"
                                                >
                                                    <option value="EMERGENCY">🔴 EMERGENCY (Immediate 108 Ambulance Transit)</option>
                                                    <option value="URGENT">🟡 URGENT (Within 24 Hours to PHC)</option>
                                                    <option value="ROUTINE">🟢 ROUTINE (Within 7 Days)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-tertiary mb-1">Clinical Department</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newRef.specialty}
                                                    onChange={(e) => setNewRef({ ...newRef, specialty: e.target.value })}
                                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-emerald-600"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Suspected Condition / Provisional Diagnosis</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Severe Preeclampsia / High Fever with Vomiting"
                                                value={newRef.provisional_diagnosis}
                                                onChange={(e) => setNewRef({ ...newRef, provisional_diagnosis: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-emerald-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Observed Symptoms & Reason for Referral</label>
                                            <textarea
                                                required
                                                rows={2}
                                                placeholder="Describe patient condition, danger signs, ongoing treatments..."
                                                value={newRef.clinical_reason}
                                                onChange={(e) => setNewRef({ ...newRef, clinical_reason: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-emerald-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-tertiary mb-1">Recorded Vital Signs</label>
                                            <input
                                                type="text"
                                                value={newRef.vitals_summary}
                                                onChange={(e) => setNewRef({ ...newRef, vitals_summary: e.target.value })}
                                                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-mono font-bold text-emerald-800 border border-surface-container-high outline-none focus:border-emerald-600"
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
                                                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-sm">send</span>
                                                    <span>{submitting ? 'Transmitting Pass...' : 'Issue & Transmit Village Referral Pass'}</span>
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
