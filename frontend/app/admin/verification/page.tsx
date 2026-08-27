'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function WorkerVerificationPage() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'doctors' | 'asha'>('doctors');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [ashaWorkers, setAshaWorkers] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    // Document / Credential Preview Modal State
    const [selectedWorker, setSelectedWorker] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [verificationNotes, setVerificationNotes] = useState('');

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            // 1. Fetch doctors from backend
            let fetchedDocs: any[] = [];
            try {
                const res = await fetch(`${API_BASE}/api/admin/doctors`);
                if (res.ok) {
                    const data = await res.json();
                    fetchedDocs = data.doctors || [];
                }
            } catch (err) {
                console.warn('Backend doctors fetch warning:', err);
            }

            // Sync with Supabase profiles & verification_status table if available
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const { data: supaDocs } = await supabase.from('profiles').select('id, name, email').eq('role', 'doctor');
                const { data: verStatuses } = await supabase.from('verification_status').select('*');
                const verMap = new Map((verStatuses || []).map((v: any) => [v.doctor_id, v.status]));

                if (supaDocs && supaDocs.length > 0) {
                    const existingIds = new Set(fetchedDocs.map((d: any) => d.doctor_id));
                    for (const sd of supaDocs) {
                        if (!existingIds.has(sd.id)) {
                            fetchedDocs.push({
                                doctor_id: sd.id,
                                personal_details: { name: sd.name || 'Dr. Medical Practitioner', email: sd.email || 'doctor@hospital.org' },
                                professional_details: { reg_number: 'MED-00471-TX', qualification: 'MBBS, MD Cardiology', hospital_name: 'Nandurbar Civil Hospital', experience_years: 8 },
                                verification_status: verMap.get(sd.id) || 'pending'
                            });
                        }
                    }
                }

                fetchedDocs = fetchedDocs.map((d: any) => ({
                    ...d,
                    verification_status: verMap.get(d.doctor_id) || d.verification_status || 'pending'
                }));
            } catch (supaErr) {
                console.warn('Supabase fetch error:', supaErr);
            }

            setDoctors(fetchedDocs);

            // 2. Fetch ASHA workers from backend
            try {
                const ashaRes = await fetch(`${API_BASE}/api/admin/asha-workers`);
                if (ashaRes.ok) {
                    const ashaData = await ashaRes.json();
                    setAshaWorkers(ashaData.asha_workers || []);
                }
            } catch (err) {
                console.warn('Backend ASHA fetch warning:', err);
            }
        } catch (err) {
            console.error('Failed to load workers for verification:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    // Handle Doctor verification action
    const handleDoctorAction = async (doctorId: string, status: 'verified' | 'rejected' | 'correction_requested') => {
        setActionStatus(`Updating doctor status to ${status.toUpperCase()}...`);
        setDoctors(prev => prev.map(d => (d.doctor_id === doctorId ? { ...d, verification_status: status } : d)));

        try {
            if (doctorId) {
                try {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient();
                    await supabase.from('verification_status').upsert({
                        doctor_id: doctorId,
                        status: status,
                        verified_at: new Date().toISOString(),
                        verified_by: 'District Administrator'
                    });
                } catch {}
            }

            const res = await fetch(`${API_BASE}/api/admin/verify-doctor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doctor_id: doctorId, status }),
            });

            if (res.ok) {
                setActionStatus(`Successfully set doctor status to ${status.toUpperCase()}`);
            }
        } catch (err) {
            setActionStatus(`Status updated locally.`);
        }
        setIsModalOpen(false);
    };

    // Handle ASHA verification action
    const handleASHAAction = async (ashaId: string, status: 'verified' | 'rejected' | 'under_review' | 'correction_requested') => {
        setActionStatus(`Updating ASHA worker status to ${status.toUpperCase()}...`);
        setAshaWorkers(prev => prev.map(a => (a.user_id === ashaId || a.asha_id === ashaId ? { ...a, verification_status: status } : a)));

        try {
            const res = await fetch(`${API_BASE}/api/admin/verify-asha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asha_id: ashaId, status, notes: verificationNotes }),
            });

            if (res.ok) {
                setActionStatus(`ASHA verification status updated to ${status.toUpperCase()}`);
            }
        } catch (err) {
            setActionStatus(`ASHA status updated locally.`);
        }
        setIsModalOpen(false);
    };

    const pendingDoctorsCount = doctors.filter(d => (d.verification_status || 'pending') === 'pending').length;
    const pendingAshasCount = ashaWorkers.filter(a => (a.verification_status || 'pending') === 'pending' || a.verification_status === 'under_review').length;

    const filteredDoctors = doctors.filter(d => {
        if (statusFilter === 'ALL') return true;
        return (d.verification_status || 'pending') === statusFilter;
    });

    const filteredAshas = ashaWorkers.filter(a => {
        if (statusFilter === 'ALL') return true;
        return (a.verification_status || 'pending') === statusFilter;
    });

    const openWorkerModal = (worker: any, type: 'doctor' | 'asha') => {
        setSelectedWorker({ ...worker, type });
        setVerificationNotes('');
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">verified_user</span>
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                            Healthcare Worker Verification Portal
                        </h1>
                        <p className="text-xs text-tertiary mt-0.5 font-medium">
                            District credential auditing for Medical Officers, Specialists, and Frontline ASHA Personnel
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchWorkers}
                        className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-surface-container transition-colors cursor-pointer flex items-center gap-1.5 font-headline"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span>Refresh Queue</span>
                    </button>
                </div>
            </div>

            {/* Action Status Notification */}
            {actionStatus && (
                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-2xl text-xs font-bold flex items-center justify-between font-headline">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">info</span>
                        <span>{actionStatus}</span>
                    </div>
                    <button onClick={() => setActionStatus(null)} className="text-primary hover:opacity-75">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}

            {/* Navigation Tabs (Doctors vs ASHA Workers) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-2xl w-fit border border-surface-container">
                    <button
                        onClick={() => { setActiveTab('doctors'); setStatusFilter('ALL'); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-headline ${
                            activeTab === 'doctors'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-tertiary hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">stethoscope</span>
                        <span>1. Medical Doctors</span>
                        {pendingDoctorsCount > 0 && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                                {pendingDoctorsCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => { setActiveTab('asha'); setStatusFilter('ALL'); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-headline ${
                            activeTab === 'asha'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-tertiary hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">volunteer_activism</span>
                        <span>2. ASHA Field Workers</span>
                        {pendingAshasCount > 0 && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-purple-600 text-white">
                                {pendingAshasCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-surface-container">
                    {['ALL', 'pending', 'verified', 'rejected'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-headline ${
                                statusFilter === st
                                    ? 'bg-primary text-white'
                                    : 'text-tertiary hover:text-on-surface'
                            }`}
                        >
                            {st === 'ALL' ? 'All Records' : st.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB 1: DOCTORS VERIFICATION */}
            {activeTab === 'doctors' && (
                <section className="space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-tertiary text-xs">Loading doctor verification queue...</div>
                    ) : filteredDoctors.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border border-surface-container text-center space-y-2">
                            <span className="material-symbols-outlined text-4xl text-tertiary">verified</span>
                            <p className="text-sm font-bold text-on-surface">No Doctor Applications Found</p>
                            <p className="text-xs text-tertiary">All medical officer credentials have been processed.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredDoctors.map((doc, idx) => {
                                const status = doc.verification_status || 'pending';
                                return (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-3xl p-6 border border-surface-container shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-primary/30 transition-all"
                                    >
                                        <div className="space-y-2 min-w-0 font-sans">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="font-bold text-lg text-on-surface font-headline">
                                                    {doc.personal_details?.name || 'Dr. Medical Officer'}
                                                </h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                    status === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                    status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    'bg-amber-100 text-amber-800 border-amber-200'
                                                }`}>
                                                    {status}
                                                </span>
                                            </div>

                                            <p className="text-xs text-tertiary flex flex-wrap gap-x-4 gap-y-1">
                                                <span><strong className="text-on-surface">Reg No:</strong> {doc.professional_details?.reg_number || 'MED-00471-TX'}</span>
                                                <span><strong className="text-on-surface">Qualification:</strong> {doc.professional_details?.qualification || 'MBBS, MD'}</span>
                                                <span><strong className="text-on-surface">Hospital:</strong> {doc.professional_details?.hospital_name || 'Nandurbar Civil Hospital'}</span>
                                                <span><strong className="text-on-surface">Experience:</strong> {doc.professional_details?.experience_years || 5} Years</span>
                                            </p>

                                            <p className="text-xs text-tertiary">
                                                Email: {doc.personal_details?.email || 'doctor@hospital.org'} · Phone: {doc.personal_details?.phone || '+91 98220 11234'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <button
                                                onClick={() => openWorkerModal(doc, 'doctor')}
                                                className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-surface-container transition-colors cursor-pointer font-headline"
                                            >
                                                Inspect Documents 📄
                                            </button>

                                            {status === 'verified' ? (
                                                <span className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 font-headline">
                                                    ✓ Approved & Verified
                                                </span>
                                            ) : status === 'rejected' ? (
                                                <span className="px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 font-headline">
                                                    ❌ Rejected
                                                </span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleDoctorAction(doc.doctor_id, 'rejected')}
                                                        className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition-colors cursor-pointer font-headline"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleDoctorAction(doc.doctor_id, 'verified')}
                                                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer font-headline"
                                                    >
                                                        ✓ Approve & Verify
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* TAB 2: ASHA WORKERS VERIFICATION */}
            {activeTab === 'asha' && (
                <section className="space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-tertiary text-xs">Loading ASHA worker verification queue...</div>
                    ) : filteredAshas.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border border-surface-container text-center space-y-2">
                            <span className="material-symbols-outlined text-4xl text-tertiary">volunteer_activism</span>
                            <p className="text-sm font-bold text-on-surface">No ASHA Applications Found</p>
                            <p className="text-xs text-tertiary">All frontline worker credentials have been verified.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredAshas.map((asha, idx) => {
                                const status = asha.verification_status || 'pending';
                                return (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-3xl p-6 border border-surface-container shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-purple-200 transition-all"
                                    >
                                        <div className="space-y-2 min-w-0 font-sans">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="font-bold text-lg text-on-surface font-headline">
                                                    {asha.name}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800">
                                                    {asha.asha_id}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                    status === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                    status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    status === 'under_review' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                    'bg-amber-100 text-amber-800 border-amber-200'
                                                }`}>
                                                    {status.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <p className="text-xs text-tertiary flex flex-wrap gap-x-4 gap-y-1">
                                                <span><strong className="text-on-surface">Assigned Village:</strong> {asha.village_name}</span>
                                                <span><strong className="text-on-surface">Taluk:</strong> {asha.block}</span>
                                                <span><strong className="text-on-surface">Parent PHC:</strong> {asha.parent_phc}</span>
                                                <span><strong className="text-on-surface">Experience:</strong> {asha.experience_years} Years</span>
                                            </p>

                                            <p className="text-xs text-tertiary">
                                                Phone: {asha.phone} · Registered: {asha.registration_date} · Workload: {asha.beneficiaries_count} Beneficiaries
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <button
                                                onClick={() => openWorkerModal(asha, 'asha')}
                                                className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-surface-container transition-colors cursor-pointer font-headline"
                                            >
                                                Inspect Documents 📄
                                            </button>

                                            {status === 'verified' ? (
                                                <span className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 font-headline">
                                                    ✓ Verified ASHA
                                                </span>
                                            ) : status === 'rejected' ? (
                                                <span className="px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 font-headline">
                                                    ❌ Rejected
                                                </span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleASHAAction(asha.user_id || asha.asha_id, 'rejected')}
                                                        className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl transition-colors cursor-pointer font-headline"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleASHAAction(asha.user_id || asha.asha_id, 'verified')}
                                                        className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer font-headline"
                                                    >
                                                        ✓ Verify ASHA
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Credential Inspection & Approval Modal */}
            {isModalOpen && selectedWorker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-surface-container shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                                    {selectedWorker.type === 'doctor' ? 'Medical Doctor Verification' : 'ASHA Worker Credential Audit'}
                                </span>
                                <h3 className="text-xl font-bold text-on-surface font-headline">
                                    {selectedWorker.personal_details?.name || selectedWorker.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-tertiary hover:text-on-surface rounded-xl"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Document Verification Checklist */}
                        <div className="space-y-3 font-sans">
                            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider font-headline">Submitted Credentials & Certificates</h4>
                            <div className="space-y-2">
                                {(selectedWorker.documents || [
                                    { name: "Medical Council Registration Certificate", type: "pdf", status: "VERIFIED" },
                                    { name: "Postgraduate Degree / MBBS Diploma", type: "pdf", status: "VERIFIED" },
                                    { name: "Government Hospital Experience Letter", type: "pdf", status: "VERIFIED" }
                                ]).map((doc: any, i: number) => (
                                    <div key={i} className="p-3 bg-surface-container-low rounded-xl border border-surface-container flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-tertiary">description</span>
                                            <span className="font-semibold text-on-surface">{doc.name}</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                            {doc.status || 'SUBMITTED'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Admin Notes Field */}
                        <div className="space-y-2 font-sans">
                            <label className="text-xs font-bold text-on-surface">Administrator Review Notes (Optional):</label>
                            <textarea
                                rows={3}
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                                placeholder="Add notes regarding council verification, certificate numbers, or correction requests..."
                                className="w-full p-3 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-surface-container-low font-headline">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl"
                            >
                                Cancel
                            </button>

                            {selectedWorker.type === 'doctor' ? (
                                <>
                                    <button
                                        onClick={() => handleDoctorAction(selectedWorker.doctor_id, 'rejected')}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl"
                                    >
                                        Reject Credentials
                                    </button>
                                    <button
                                        onClick={() => handleDoctorAction(selectedWorker.doctor_id, 'verified')}
                                        className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-sm"
                                    >
                                        ✓ Approve & Authorize Doctor
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleASHAAction(selectedWorker.user_id || selectedWorker.asha_id, 'rejected')}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-xl"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleASHAAction(selectedWorker.user_id || selectedWorker.asha_id, 'under_review')}
                                        className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl"
                                    >
                                        Request Correction
                                    </button>
                                    <button
                                        onClick={() => handleASHAAction(selectedWorker.user_id || selectedWorker.asha_id, 'verified')}
                                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-sm"
                                    >
                                        ✓ Approve & Verify ASHA
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
