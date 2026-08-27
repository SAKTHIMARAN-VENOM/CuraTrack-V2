'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function DistrictOverviewPage() {
    const [districtData, setDistrictData] = useState<any>(null);
    const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
    const [selectedVillage, setSelectedVillage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDistrict() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/district-overview`);
                if (res.ok) {
                    const data = await res.json();
                    setDistrictData(data);
                    if (data.villages && data.villages.length > 0) {
                        setSelectedVillage(data.villages[0]);
                    }
                }
            } catch (err) {
                console.warn('District overview fetch warning:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchDistrict();
    }, []);

    const blocks = districtData?.blocks || [
        { id: "BLK-01", name: "Nandurbar Taluk", villages_count: 148, population: 384000, asha_count: 320, doctors_count: 24, coverage_status: "GOOD" },
        { id: "BLK-02", name: "Shahada Taluk", villages_count: 182, population: 412000, asha_count: 290, doctors_count: 18, coverage_status: "NEEDS_ATTENTION" },
        { id: "BLK-03", name: "Taloda Taluk", villages_count: 94, population: 168000, asha_count: 140, doctors_count: 12, coverage_status: "GOOD" },
        { id: "BLK-04", name: "Navapur Taluk", villages_count: 162, population: 295000, asha_count: 210, doctors_count: 15, coverage_status: "NEEDS_ATTENTION" },
        { id: "BLK-05", name: "Akkalkuwa Taluk", villages_count: 176, population: 238000, asha_count: 165, doctors_count: 10, coverage_status: "CRITICAL" },
        { id: "BLK-06", name: "Dhadgaon", villages_count: 166, population: 151290, asha_count: 110, doctors_count: 8, coverage_status: "CRITICAL" }
    ];

    const allVillages = districtData?.villages || [];
    const filteredVillages = selectedBlock === 'ALL'
        ? allVillages
        : allVillages.filter((v: any) => v.block.toLowerCase().includes(selectedBlock.toLowerCase()));

    const getCoverageBadge = (status: string) => {
        switch (status) {
            case 'GOOD':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'CRITICAL':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-amber-100 text-amber-800 border-amber-200';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        {typeof districtData?.district === 'string' ? districtData.district : (districtData?.district?.district_name || 'Nandurbar District')} Geographic & Administrative Overview
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Jurisdiction: 6 Taluks (Blocks) · 928 Inhabited Rural Settlements · 6 Public Health Units
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/villages"
                        className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-surface-container transition-colors"
                    >
                        📋 Village Directory
                    </Link>
                </div>
            </div>

            {/* Block / Taluk Explorer */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-on-surface font-headline">District Taluks (Sub-Districts)</h2>
                    <span className="text-xs text-tertiary">Select a block to inspect rural settlements</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <button
                        onClick={() => setSelectedBlock('ALL')}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            selectedBlock === 'ALL'
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white text-on-surface border-surface-container hover:border-primary/40'
                        }`}
                    >
                        <div>
                            <p className="text-xs font-bold font-headline">All Taluks</p>
                            <p className={`text-[10px] mt-0.5 ${selectedBlock === 'ALL' ? 'text-white/80' : 'text-tertiary'}`}>Entire District</p>
                        </div>
                        <p className="text-xs font-black mt-2 font-headline">{blocks.length} Blocks</p>
                    </button>

                    {blocks.map((blk: any) => (
                        <button
                            key={blk.id}
                            onClick={() => setSelectedBlock(blk.name)}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                selectedBlock === blk.name
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white text-on-surface border-surface-container hover:border-primary/40'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold truncate font-headline">{blk.name}</p>
                                </div>
                                <p className={`text-[10px] mt-0.5 ${selectedBlock === blk.name ? 'text-white/80' : 'text-tertiary'}`}>
                                    {blk.villages_count} Villages
                                </p>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px]">
                                <span className={selectedBlock === blk.name ? 'text-white/80' : 'text-tertiary'}>
                                    {blk.asha_count} ASHA
                                </span>
                                <span className={`px-1.5 py-0.2 rounded-full font-bold ${
                                    selectedBlock === blk.name
                                        ? 'bg-white/20 text-white'
                                        : blk.coverage_status === 'GOOD' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                                }`}>
                                    {blk.coverage_status === 'GOOD' ? '● Good' : '● Gap'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Interactive Geospatial Map Visualizer & Village Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 cols): Interactive Geospatial Map Canvas */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base text-on-surface font-headline">District Geospatial Surveillance Map</h3>
                            <p className="text-xs text-tertiary">GPS positions, active disease hot-spots, and primary health centre nodes</p>
                        </div>
                        <span className="text-xs font-bold text-primary">Nandurbar District (WGS84)</span>
                    </div>

                    {/* Styled Map Container */}
                    <div className="relative w-full h-96 bg-surface-container-low rounded-2xl border border-surface-container overflow-hidden flex items-center justify-center p-6 select-none">
                        {/* Map Grid Pattern */}
                        <div className="absolute inset-0 bg-[radial-gradient(#c1c6d7_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>

                        {/* District Boundary Mock Outline */}
                        <div className="absolute inset-4 border-2 border-dashed border-outline-variant/60 rounded-3xl pointer-events-none flex items-start justify-end p-3">
                            <span className="text-[10px] font-mono text-tertiary uppercase font-bold">Nandurbar District Boundary</span>
                        </div>

                        {/* Village Markers */}
                        <div className="relative w-full h-full">
                            {filteredVillages.map((v: any, idx: number) => {
                                const isSelected = selectedVillage?.id === v.id;
                                const isCritical = v.coverage_status === 'CRITICAL' || v.high_risk_cases > 15;
                                const left = `${20 + ((idx * 27) % 65)}%`;
                                const top = `${25 + ((idx * 33) % 55)}%`;

                                return (
                                    <div
                                        key={v.id}
                                        onClick={() => setSelectedVillage(v)}
                                        style={{ left, top }}
                                        className={`absolute cursor-pointer transition-all transform -translate-x-1/2 -translate-y-1/2 group z-10 ${
                                            isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center">
                                            {/* Pulse ring for critical/outbreak */}
                                            {isCritical && (
                                                <span className="absolute -inset-2 rounded-full bg-red-400 opacity-40 animate-ping"></span>
                                            )}

                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 ${
                                                isCritical
                                                    ? 'bg-red-600 text-white border-white'
                                                    : v.coverage_status === 'GOOD'
                                                    ? 'bg-emerald-600 text-white border-white'
                                                    : 'bg-primary text-white border-white'
                                            }`}>
                                                <span className="material-symbols-outlined text-sm">
                                                    {v.doctors_count > 0 ? 'local_hospital' : 'holiday_village'}
                                                </span>
                                            </div>

                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow-sm border ${
                                                isSelected
                                                    ? 'bg-on-surface text-white border-on-surface'
                                                    : 'bg-white text-on-surface border-surface-container'
                                            }`}>
                                                {v.name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Map Legend */}
                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-surface-container text-[10px] space-y-1 shadow-sm font-sans">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                <span className="text-on-surface font-medium">Adequate Health Coverage</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                                <span className="text-on-surface font-medium">Attached Sub-Centre</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                                <span className="text-on-surface font-medium">Critical Burden / Outbreak Hotspot</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right (1 col): Selected Village Inspector Card */}
                {selectedVillage && (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
                                <div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Village Inspector</span>
                                    <h3 className="text-xl font-extrabold text-on-surface font-headline">{selectedVillage.name}</h3>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCoverageBadge(selectedVillage.coverage_status)}`}>
                                    {selectedVillage.coverage_status}
                                </span>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1 border-b border-surface-container-low">
                                    <span className="text-tertiary">Taluk (Block)</span>
                                    <span className="font-bold text-on-surface">{selectedVillage.block}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-surface-container-low">
                                    <span className="text-tertiary">Rural Population</span>
                                    <span className="font-bold text-on-surface">{selectedVillage.population?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-surface-container-low">
                                    <span className="text-tertiary">Attached Facility</span>
                                    <span className="font-bold text-primary truncate max-w-[150px]">{selectedVillage.attached_facility}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-surface-container-low">
                                    <span className="text-tertiary">Frontline ASHA</span>
                                    <span className="font-bold text-purple-700">{selectedVillage.asha_workers_count} Assigned</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-surface-container-low">
                                    <span className="text-tertiary">High-Risk Patients</span>
                                    <span className="font-bold text-red-600">{selectedVillage.high_risk_cases} flagged</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-surface-container-low">
                                    <span className="text-tertiary">Immunization Coverage</span>
                                    <span className="font-bold text-emerald-700">{selectedVillage.vaccination_rate}</span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <p className="text-[11px] font-bold text-on-surface">Active Epidemiological Syndromes:</p>
                                <div className="space-y-1">
                                    {(selectedVillage.recent_diseases || []).map((d: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-xs p-2 bg-surface-container-low rounded-xl">
                                            <span className="font-semibold text-on-surface">{d.disease}</span>
                                            <span className="font-black text-red-600">{d.cases} cases ({d.trend})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Link
                            href={`/admin/villages/${selectedVillage.id}`}
                            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-colors text-center block shadow-sm font-headline"
                        >
                            Open Full Village Health Dashboard →
                        </Link>
                    </div>
                )}
            </div>

            {/* Health Coverage & Gap Analysis Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-bold text-on-surface font-headline">Village Health Coverage & Workforce Gap Analysis</h2>
                        <p className="text-xs text-tertiary">Monitored against National Health Mission (NHM) workforce ratios</p>
                    </div>
                    <span className="text-xs font-bold text-tertiary">Displaying {filteredVillages.length} Villages</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-surface-container text-tertiary uppercase font-black text-[10px] tracking-wider">
                                <th className="py-3 px-4">Village Name</th>
                                <th className="py-3 px-4">Taluk (Block)</th>
                                <th className="py-3 px-4">Population</th>
                                <th className="py-3 px-4">ASHA Ratio</th>
                                <th className="py-3 px-4">High Risk Cases</th>
                                <th className="py-3 px-4">Vaccination</th>
                                <th className="py-3 px-4">Coverage Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low font-sans">
                            {filteredVillages.map((v: any) => (
                                <tr key={v.id} className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-on-surface">
                                        <Link href={`/admin/villages/${v.id}`} className="hover:text-primary transition-colors">
                                            {v.name}
                                        </Link>
                                    </td>
                                    <td className="py-3.5 px-4 text-tertiary">{v.block}</td>
                                    <td className="py-3.5 px-4 font-medium text-on-surface">{v.population?.toLocaleString()}</td>
                                    <td className="py-3.5 px-4 text-purple-700 font-semibold">{v.asha_ratio}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`font-bold ${v.high_risk_cases > 15 ? 'text-red-600' : 'text-on-surface'}`}>
                                            {v.high_risk_cases} cases
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-emerald-700 font-bold">{v.vaccination_rate}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCoverageBadge(v.coverage_status)}`}>
                                            {v.coverage_status === 'GOOD' ? '🟢 Good' : v.coverage_status === 'CRITICAL' ? '🔴 Critical Gap' : '🟡 Needs Attention'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <Link
                                            href={`/admin/villages/${v.id}`}
                                            className="text-xs font-bold text-primary hover:underline font-headline"
                                        >
                                            Inspect →
                                        </Link>
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
