'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function HealthcareWorkforcePage() {
    const [activeTab, setActiveTab] = useState<'doctors' | 'asha'>('doctors');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [ashaWorkers, setAshaWorkers] = useState<any[]>([]);
    const [filterVillage, setFilterVillage] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWorkforce() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/workers`);
                if (res.ok) {
                    const data = await res.json();
                    setDoctors(data.doctors || []);
                    setAshaWorkers(data.asha_workers || []);
                }
            } catch (err) {
                console.warn('Fetch workforce error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchWorkforce();
    }, []);

    const filteredDoctors = doctors.filter(doc => {
        const name = doc.personal_details?.name || '';
        const spec = doc.professional_details?.specialization || '';
        const hosp = doc.professional_details?.hospital_name || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              spec.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              hosp.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || (doc.verification_status || 'pending') === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const filteredAshas = ashaWorkers.filter(asha => {
        const name = asha.name || '';
        const vil = asha.village_name || '';
        const block = asha.block || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              vil.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              block.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVillage = filterVillage === 'ALL' || vil.toLowerCase().includes(filterVillage.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || (asha.verification_status || 'pending') === filterStatus;
        return matchesSearch && matchesVillage && matchesStatus;
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        District Healthcare Workforce Directory
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Monitoring deployment, credential verification, and beneficiary workloads for Doctors & ASHA workers
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/verification"
                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 font-headline"
                    >
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span>Open Verification Queue</span>
                    </Link>
                </div>
            </div>

            {/* Sub-navigation & Search Toolbar */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-surface-container shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Tabs */}
                <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-2xl w-full md:w-auto border border-surface-container">
                    <button
                        onClick={() => setActiveTab('doctors')}
                        className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-headline ${
                            activeTab === 'doctors' ? 'bg-white text-primary shadow-sm' : 'text-tertiary hover:text-on-surface'
                        }`}
                    >
                        Medical Doctors ({doctors.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('asha')}
                        className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-headline ${
                            activeTab === 'asha' ? 'bg-white text-purple-700 shadow-sm' : 'text-tertiary hover:text-on-surface'
                        }`}
                    >
                        ASHA Field Workers ({ashaWorkers.length})
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto font-headline">
                    <div className="relative flex-1 md:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-2 text-tertiary text-base">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, facility, village..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-sans"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="verified">Verified Only</option>
                        <option value="pending">Pending Review</option>
                    </select>
                </div>
            </div>

            {/* Doctors Workforce List */}
            {activeTab === 'doctors' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-on-surface font-headline">Registered Medical Doctors & Specialists</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                                <tr className="border-b border-surface-container text-tertiary uppercase font-black text-[10px] tracking-wider font-headline">
                                    <th className="py-3 px-4">Doctor Name</th>
                                    <th className="py-3 px-4">Specialization</th>
                                    <th className="py-3 px-4">Hospital / Facility</th>
                                    <th className="py-3 px-4">Reg Number</th>
                                    <th className="py-3 px-4">Experience</th>
                                    <th className="py-3 px-4">Verification</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-low">
                                {filteredDoctors.map((doc, idx) => (
                                    <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-on-surface font-headline">
                                            {doc.personal_details?.name || 'Dr. Medical Officer'}
                                        </td>
                                        <td className="py-3.5 px-4 text-on-surface font-medium">
                                            {doc.professional_details?.specialization || 'General Medicine'}
                                        </td>
                                        <td className="py-3.5 px-4 text-tertiary">
                                            {doc.professional_details?.hospital_name || 'Nandurbar Civil Hospital'}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-tertiary">
                                            {doc.professional_details?.reg_number || 'MED-00471'}
                                        </td>
                                        <td className="py-3.5 px-4 text-on-surface">
                                            {doc.professional_details?.experience_years || 5} yrs
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                            }`}>
                                                {doc.verification_status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <Link
                                                href="/admin/verification"
                                                className="text-xs font-bold text-primary hover:underline font-headline"
                                            >
                                                Audit →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ASHA Workers Workforce List */}
            {activeTab === 'asha' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-on-surface font-headline">Frontline ASHA Worker Deployment & Workload</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                                <tr className="border-b border-surface-container text-tertiary uppercase font-black text-[10px] tracking-wider font-headline">
                                    <th className="py-3 px-4">ASHA Worker</th>
                                    <th className="py-3 px-4">ASHA ID</th>
                                    <th className="py-3 px-4">Assigned Village</th>
                                    <th className="py-3 px-4">Taluk</th>
                                    <th className="py-3 px-4">Beneficiary Workload</th>
                                    <th className="py-3 px-4">Pending Follow-ups</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-low">
                                {filteredAshas.map((asha, idx) => (
                                    <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-on-surface font-headline">{asha.name}</td>
                                        <td className="py-3.5 px-4 font-mono text-purple-700 font-bold">{asha.asha_id}</td>
                                        <td className="py-3.5 px-4 font-medium text-on-surface">{asha.village_name}</td>
                                        <td className="py-3.5 px-4 text-tertiary">{asha.block}</td>
                                        <td className="py-3.5 px-4 font-bold text-primary">{asha.beneficiaries_count || 35} Catchment</td>
                                        <td className="py-3.5 px-4">
                                            <span className={`font-bold ${asha.pending_followups > 3 ? 'text-amber-600' : 'text-on-surface'}`}>
                                                {asha.pending_followups || 0} visits
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                asha.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                            }`}>
                                                {asha.verification_status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <Link
                                                href="/admin/verification"
                                                className="text-xs font-bold text-purple-700 hover:underline font-headline"
                                            >
                                                Verify →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
