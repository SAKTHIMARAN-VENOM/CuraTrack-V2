'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function VillagesDirectoryPage() {
    const [villages, setVillages] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const fetchVillages = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedBlock !== 'ALL') params.set('block', selectedBlock);
            if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
            if (searchTerm) params.set('search', searchTerm);

            const res = await fetch(`${API_BASE}/api/admin/villages?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setVillages(data.villages || []);
            }
        } catch (err) {
            console.warn('Fetch villages error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVillages();
    }, [selectedBlock, selectedStatus]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchVillages();
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        Rural Villages & Settlements Directory
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Comprehensive registry of all villages in Nandurbar District with demographic & clinical indices
                    </p>
                </div>
                <Link
                    href="/admin/district"
                    className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors flex items-center gap-2 font-headline"
                >
                    <span className="material-symbols-outlined text-base">map</span>
                    <span>Switch to Map View</span>
                </Link>
            </div>

            {/* Filter and Search Bar */}
            <div suppressHydrationWarning className="bg-white p-4 sm:p-6 rounded-3xl border border-surface-container shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-tertiary text-lg">search</span>
                        <input
                            suppressHydrationWarning
                            type="text"
                            placeholder="Search village name, taluk, or PHC facility..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                    <button
                        suppressHydrationWarning
                        type="submit"
                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer font-headline"
                    >
                        Search
                    </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Taluk Filter */}
                    <select
                        suppressHydrationWarning
                        value={selectedBlock}
                        onChange={(e) => setSelectedBlock(e.target.value)}
                        className="px-3.5 py-2.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface focus:outline-none font-headline"
                    >
                        <option value="ALL">All Taluks</option>
                        <option value="Nandurbar Taluk">Nandurbar Taluk</option>
                        <option value="Shahada Taluk">Shahada Taluk</option>
                        <option value="Taloda Taluk">Taloda Taluk</option>
                        <option value="Navapur Taluk">Navapur Taluk</option>
                        <option value="Akkalkuwa Taluk">Akkalkuwa Taluk</option>
                        <option value="Dhadgaon">Dhadgaon Taluk</option>
                    </select>

                    {/* Health Status Filter */}
                    <select
                        suppressHydrationWarning
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3.5 py-2.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface focus:outline-none font-headline"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="GOOD">🟢 Good Coverage</option>
                        <option value="NEEDS_ATTENTION">🟡 Needs Attention</option>
                        <option value="CRITICAL">🔴 Critical Gap</option>
                    </select>
                </div>
            </div>

            {/* Village Cards Grid */}
            {loading ? (
                <div className="text-center py-16 text-tertiary text-xs">Loading villages...</div>
            ) : villages.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-surface-container text-center space-y-2">
                    <span className="material-symbols-outlined text-4xl text-tertiary">holiday_village</span>
                    <p className="text-sm font-bold text-on-surface">No Villages Found</p>
                    <p className="text-xs text-tertiary">Try adjusting your search query or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {villages.map((v) => {
                        const totalDiseaseCases = (v.recent_diseases || []).reduce((acc: number, c: any) => acc + c.cases, 0);
                        return (
                            <div
                                key={v.id}
                                className="bg-white rounded-3xl p-6 border border-surface-container shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-container text-tertiary">
                                            {v.block}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            v.coverage_status === 'GOOD' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                            v.coverage_status === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                        }`}>
                                            {v.coverage_status === 'GOOD' ? '🟢 Good' : v.coverage_status === 'CRITICAL' ? '🔴 Critical' : '🟡 Needs Attention'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors font-headline">
                                            {v.name}
                                        </h3>
                                        <p className="text-xs text-tertiary mt-0.5">Facility: {v.attached_facility}</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-low text-center">
                                        <div className="bg-surface-container-low p-2 rounded-xl">
                                            <p className="text-[10px] text-tertiary uppercase font-bold">Pop</p>
                                            <p className="text-xs font-bold text-on-surface">{v.population}</p>
                                        </div>
                                        <div className="bg-surface-container-low p-2 rounded-xl">
                                            <p className="text-[10px] text-tertiary uppercase font-bold">ASHA</p>
                                            <p className="text-xs font-bold text-purple-700">{v.asha_workers_count}</p>
                                        </div>
                                        <div className="bg-surface-container-low p-2 rounded-xl">
                                            <p className="text-[10px] text-tertiary uppercase font-bold">High Risk</p>
                                            <p className="text-xs font-bold text-red-600">{v.high_risk_cases}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pt-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-tertiary">Active Disease Load</span>
                                            <span className="font-bold text-on-surface">{totalDiseaseCases} cases</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-tertiary">Immunization Rate</span>
                                            <span className="font-bold text-emerald-700">{v.vaccination_rate}</span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    href={`/admin/villages/${v.id}`}
                                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-colors text-center block shadow-sm font-headline"
                                >
                                    Open Village Dashboard →
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
