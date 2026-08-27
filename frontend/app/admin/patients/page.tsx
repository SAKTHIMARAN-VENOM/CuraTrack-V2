'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function PatientsBeneficiariesPage() {
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [categoryCounts, setCategoryCounts] = useState<any>({});
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterRisk, setFilterRisk] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBeneficiaries() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filterCategory !== 'ALL') params.set('category', filterCategory);
                if (filterRisk !== 'ALL') params.set('risk_level', filterRisk);

                const res = await fetch(`${API_BASE}/api/admin/beneficiaries-overview?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setBeneficiaries(data.beneficiaries || []);
                    setCategoryCounts(data.by_category || {});
                }
            } catch (err) {
                console.warn('Fetch beneficiaries warning:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchBeneficiaries();
    }, [filterCategory, filterRisk]);

    const filtered = beneficiaries.filter(b => {
        const name = b.name || '';
        const village = b.village_name || '';
        const id = b.id || b.patient_id || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               village.toLowerCase().includes(searchTerm.toLowerCase()) ||
               id.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        District Beneficiary & Patient Registry
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        District catchment monitoring for Maternal ANC, Child Immunization, NCD Chronic Disease, and TB cases
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl border border-primary/20 font-headline">
                        {beneficiaries.length} Registered Beneficiaries
                    </span>
                </div>
            </div>

            {/* Category KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                    onClick={() => setFilterCategory('Maternal ANC')}
                    className={`p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                        filterCategory === 'Maternal ANC'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-on-surface border-surface-container hover:border-primary/40'
                    }`}
                >
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 font-headline">Maternal ANC</p>
                    <p className="text-2xl font-black mt-1 font-headline">{categoryCounts['Maternal ANC'] || 0}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${filterCategory === 'Maternal ANC' ? 'text-white/80' : 'text-tertiary'}`}>High-Risk Pregnancies</p>
                </button>

                <button
                    onClick={() => setFilterCategory('Child Immunization')}
                    className={`p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                        filterCategory === 'Child Immunization'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-on-surface border-surface-container hover:border-primary/40'
                    }`}
                >
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 font-headline">Immunization</p>
                    <p className="text-2xl font-black mt-1 font-headline">{categoryCounts['Child Immunization'] || 0}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${filterCategory === 'Child Immunization' ? 'text-white/80' : 'text-tertiary'}`}>0-5 Yr Vaccination</p>
                </button>

                <button
                    onClick={() => setFilterCategory('NCD Chronic')}
                    className={`p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                        filterCategory === 'NCD Chronic'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-on-surface border-surface-container hover:border-primary/40'
                    }`}
                >
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 font-headline">NCD Chronic</p>
                    <p className="text-2xl font-black mt-1 font-headline">{categoryCounts['NCD Chronic'] || 0}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${filterCategory === 'NCD Chronic' ? 'text-white/80' : 'text-tertiary'}`}>BP & Blood Sugar</p>
                </button>

                <button
                    onClick={() => setFilterCategory('TB / Communicable')}
                    className={`p-5 rounded-3xl border text-left transition-all cursor-pointer ${
                        filterCategory === 'TB / Communicable'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-on-surface border-surface-container hover:border-primary/40'
                    }`}
                >
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 font-headline">TB DOTS</p>
                    <p className="text-2xl font-black mt-1 font-headline">{categoryCounts['TB / Communicable'] || 0}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${filterCategory === 'TB / Communicable' ? 'text-white/80' : 'text-tertiary'}`}>Communicable Tracking</p>
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-surface-container shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-tertiary text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search beneficiary name, ABHA ID, or village..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-sans"
                    />
                </div>

                <div className="flex items-center gap-2 font-headline">
                    <select
                        value={filterRisk}
                        onChange={(e) => setFilterRisk(e.target.value)}
                        className="px-3.5 py-2.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface focus:outline-none"
                    >
                        <option value="ALL">All Risk Levels</option>
                        <option value="HIGH">🔴 High Risk Only</option>
                        <option value="MODERATE">🟡 Moderate Risk</option>
                        <option value="LOW">🟢 Low Risk</option>
                    </select>

                    <button
                        onClick={() => { setFilterCategory('ALL'); setFilterRisk('ALL'); setSearchTerm(''); }}
                        className="px-3 py-2 text-xs font-bold text-tertiary hover:text-on-surface"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Beneficiaries Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-on-surface font-headline">Beneficiary Cohort Records</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                            <tr className="border-b border-surface-container text-tertiary uppercase font-black text-[10px] tracking-wider font-headline">
                                <th className="py-3 px-4">Beneficiary</th>
                                <th className="py-3 px-4">Age / Gender</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Village</th>
                                <th className="py-3 px-4">Assigned ASHA</th>
                                <th className="py-3 px-4">Next Due Service</th>
                                <th className="py-3 px-4">Risk Level</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low">
                            {filtered.map((ben, idx) => (
                                <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-on-surface font-headline">
                                        <div>{ben.name}</div>
                                        <div className="text-[10px] text-tertiary font-mono">{ben.id || ben.patient_id}</div>
                                    </td>
                                    <td className="py-3.5 px-4 text-tertiary">{ben.age}y · {ben.gender}</td>
                                    <td className="py-3.5 px-4">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                            {ben.category}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-on-surface font-medium">{ben.village_name}</td>
                                    <td className="py-3.5 px-4 text-purple-700 font-semibold">{ben.assigned_asha || 'Sunita Tai'}</td>
                                    <td className="py-3.5 px-4 text-tertiary max-w-xs truncate">{ben.next_due_service || 'Routine Screening'}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            ben.risk_level === 'HIGH' ? 'bg-red-100 text-red-800' :
                                            ben.risk_level === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            {ben.risk_level || 'MODERATE'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className={`font-bold ${ben.status === 'OVERDUE' ? 'text-red-600' : 'text-tertiary'}`}>
                                            {ben.status || 'DUE_SOON'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
