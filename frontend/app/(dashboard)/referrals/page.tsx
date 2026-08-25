'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
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
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
    const [selectedReferral, setSelectedReferral] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

    // New referral form state
    const [newRef, setNewRef] = useState({
        patient_name: '',
        patient_age: 45,
        patient_gender: 'Male',
        referring_doctor_name: 'Dr. Ananya Sharma (MO)',
        referring_facility_type: 'Primary Health Centre (PHC)',
        referring_facility_name: 'PHC Nandurbar Rural',
        destination_facility_type: 'District Hospital',
        destination_facility_name: 'Nandurbar District Civil Hospital',
        specialty: 'Cardiology',
        urgency: 'URGENT',
        clinical_reason: '',
        provisional_diagnosis: '',
        vitals_summary: 'BP: 130/84, HR: 76 bpm, SpO2: 98%',
        abha_id: ''
    });

    const [submitting, setSubmitting] = useState<boolean>(false);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const data = await apiFetch(`/api/referrals?status=${filterStatus}&urgency=${filterUrgency}`);
            if (data.referrals) {
                setReferrals(data.referrals);
            }
        } catch (err) {
            console.error('Failed to fetch referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, [filterStatus, filterUrgency]);

    const handleCreateReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRef.patient_name || !newRef.clinical_reason) return;
        setSubmitting(true);
        try {
            await apiFetch('/api/referrals/create', {
                method: 'POST',
                body: JSON.stringify(newRef)
            });
            setIsCreateModalOpen(false);
            setNewRef({
                patient_name: '',
                patient_age: 45,
                patient_gender: 'Male',
                referring_doctor_name: 'Dr. Ananya Sharma (MO)',
                referring_facility_type: 'Primary Health Centre (PHC)',
                referring_facility_name: 'PHC Nandurbar Rural',
                destination_facility_type: 'District Hospital',
                destination_facility_name: 'Nandurbar District Civil Hospital',
                specialty: 'Cardiology',
                urgency: 'URGENT',
                clinical_reason: '',
                provisional_diagnosis: '',
                vitals_summary: 'BP: 130/84, HR: 76 bpm, SpO2: 98%',
                abha_id: ''
            });
            fetchReferrals();
        } catch (err: any) {
            alert('Failed to generate referral: ' + (err.message || 'Check network'));
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
                    notes: `Status advanced to ${newStatus} by Medical Officer.`,
                    updated_by: 'Dr. Medical Officer'
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
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-primary via-[#004d40] to-teal-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
                            <span className="material-symbols-outlined text-sm">alt_route</span>
                            <span>{t('referrals.subtitle', 'Public Health Referral Network • End-to-End Tracking')}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">{t('referrals.title', 'Clinical Referral Pipeline')}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            <span>{t('referrals.createReferral', 'Generate Referral Pass')}</span>
                        </button>
                    </div>
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
                            <span className="text-xs font-bold text-on-surface block leading-tight">{st.label}</span>
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
                                </div>

                                <div>
                                    <h3 className="text-base font-extrabold text-on-surface">
                                        {ref.patient_name} <span className="text-xs font-normal text-tertiary">({ref.patient_gender}, {ref.patient_age} yrs)</span>
                                    </h3>
                                    <p className="text-xs text-on-surface font-semibold mt-0.5">
                                        Diagnosis: <span className="text-primary">{ref.provisional_diagnosis}</span> • Specialty: <span className="font-bold">{ref.specialty}</span>
                                    </p>
                                </div>

                                {/* Facility Transition Path & Embedded Audit Timeline */}
                                <div className="p-3.5 bg-surface-container-low rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-surface-container/60">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-base">domain</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">From Facility</span>
                                                <span className="font-bold text-on-surface">{ref.referring_facility_name}</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-tertiary hidden sm:inline">arrow_forward</span>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-teal-600 text-base">local_hospital</span>
                                            <div>
                                                <span className="text-[10px] text-tertiary block font-medium">Destination</span>
                                                <span className="font-bold text-teal-800">{ref.destination_facility_name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedReferral(ref)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-container text-primary font-bold text-xs rounded-xl shadow-xs border border-surface-container transition-all self-start sm:self-auto group cursor-pointer"
                                        title="View Referral Audit Timeline"
                                    >
                                        <span className="material-symbols-outlined text-sm text-primary group-hover:scale-110 transition-transform">timeline</span>
                                        <span>Audit Timeline ({ref.timeline?.length || 1})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right: Actions & Status Advancement */}
                            <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-surface-container-high pt-4 lg:pt-0 lg:pl-6">
                                {/* Advance Status Actions */}
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
                                className="p-2 rounded-full text-tertiary hover:bg-surface-container"
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
                                    <span className="text-tertiary">Referring Doctor:</span>
                                    <span className="font-bold text-on-surface">{selectedReferral.referring_doctor_name}</span>
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

            {/* Create Referral Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-5">
                            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">add_circle</span>
                                <span>Create Public Health Referral Pass</span>
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 rounded-full text-tertiary hover:bg-surface-container"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateReferral} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Patient Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Rameshwar Patel"
                                        value={newRef.patient_name}
                                        onChange={(e) => setNewRef({ ...newRef, patient_name: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Age</label>
                                    <input
                                        type="number"
                                        required
                                        value={newRef.patient_age}
                                        onChange={(e) => setNewRef({ ...newRef, patient_age: parseInt(e.target.value) })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Origin Facility (Referring)</label>
                                    <input
                                        type="text"
                                        required
                                        value={newRef.referring_facility_name}
                                        onChange={(e) => setNewRef({ ...newRef, referring_facility_name: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Destination Facility</label>
                                    <input
                                        type="text"
                                        required
                                        value={newRef.destination_facility_name}
                                        onChange={(e) => setNewRef({ ...newRef, destination_facility_name: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Target Specialty</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Cardiology, Pulmonology, OBGYN"
                                        value={newRef.specialty}
                                        onChange={(e) => setNewRef({ ...newRef, specialty: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-tertiary mb-1">Urgency Tier</label>
                                    <select
                                        value={newRef.urgency}
                                        onChange={(e) => setNewRef({ ...newRef, urgency: e.target.value })}
                                        className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    >
                                        <option value="EMERGENCY">EMERGENCY (Immediate 108 Transit)</option>
                                        <option value="URGENT">URGENT (Within 24 Hours)</option>
                                        <option value="ROUTINE">ROUTINE (Within 7 Days)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Provisional Diagnosis</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Suspected Unstable Angina / Ischemic Heart Disease"
                                    value={newRef.provisional_diagnosis}
                                    onChange={(e) => setNewRef({ ...newRef, provisional_diagnosis: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Clinical Reason & Summary</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Describe clinical findings, ECG observations, lab markers..."
                                    value={newRef.clinical_reason}
                                    onChange={(e) => setNewRef({ ...newRef, clinical_reason: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? 'Generating Pass...' : 'Issue Referral Pass'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
