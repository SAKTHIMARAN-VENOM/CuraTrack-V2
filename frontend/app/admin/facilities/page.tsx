'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function FacilitiesMonitoringPage() {
    const [facilities, setFacilities] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        async function fetchFacilities() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/facilities-overview`);
                if (res.ok) {
                    const data = await res.json();
                    setFacilities(data.facilities || []);
                    setMetrics(data.metrics || {});
                }
            } catch (err) {
                console.warn('Fetch facilities error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchFacilities();
    }, []);

    const filteredFacilities = facilities.filter(f => {
        if (filterType === 'ALL') return true;
        return f.type.toLowerCase().includes(filterType.toLowerCase());
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        Healthcare Facilities & Hospital Operations
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        District Civil Hospital, Sub-District Hospitals, CHCs, and PHC Primary Centres Monitoring
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 font-headline">
                        {facilities.length} Public Health Facilities Online
                    </span>
                </div>
            </div>

            {/* Metrics Overview Strip */}
            {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Total Inpatient Beds</p>
                        <p className="text-2xl font-black text-on-surface mt-1 font-headline">{metrics.total_beds}</p>
                        <p className="text-xs text-tertiary font-medium">{metrics.occupied_beds} Occupied ({metrics.district_bed_occupancy})</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Available Beds</p>
                        <p className="text-2xl font-black text-emerald-700 mt-1 font-headline">{metrics.available_beds}</p>
                        <p className="text-xs text-tertiary font-medium">Across District Wards</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Total Facility Doctors</p>
                        <p className="text-2xl font-black text-primary mt-1 font-headline">{metrics.total_facility_doctors}</p>
                        <p className="text-xs text-tertiary font-medium">Medical Officers & Specialists</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">EDL Stockout Warning</p>
                        <p className="text-2xl font-black text-rose-600 mt-1 font-headline">{metrics.facilities_at_critical_risk} Facilities</p>
                        <p className="text-xs text-rose-700 font-bold">Action Required</p>
                    </div>
                </div>
            )}

            {/* Facility Cards List */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-on-surface font-headline">Hospital & Health Centre Registry</h2>
                    <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-surface-container font-headline">
                        {['ALL', 'District Hospital', 'CHC', 'PHC'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filterType === type ? 'bg-primary text-white' : 'text-tertiary hover:text-on-surface'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredFacilities.map((fac) => (
                        <div
                            key={fac.id}
                            className="bg-white rounded-3xl p-6 border border-surface-container shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                        >
                            <div className="space-y-3 font-sans">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-container text-tertiary">
                                        {fac.type}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        fac.workload_status === 'HIGH' ? 'bg-red-100 text-red-800' :
                                        fac.workload_status === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                        {fac.workload_status} Workload
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-on-surface font-headline">{fac.name}</h3>
                                    <p className="text-xs text-tertiary font-medium">{fac.block}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-low text-center">
                                    <div className="bg-surface-container-low p-2 rounded-xl">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Beds</p>
                                        <p className="text-xs font-bold text-on-surface font-headline">{fac.occupied_beds}/{fac.total_beds}</p>
                                    </div>
                                    <div className="bg-surface-container-low p-2 rounded-xl">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Doctors</p>
                                        <p className="text-xs font-bold text-primary font-headline">{fac.doctors_count}</p>
                                    </div>
                                    <div className="bg-surface-container-low p-2 rounded-xl">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">OPD Queue</p>
                                        <p className="text-xs font-bold text-on-surface font-headline">{fac.current_opd_queue}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-tertiary">Bed Occupancy</span>
                                        <span className="font-bold text-on-surface">{fac.bed_occupancy_pct}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tertiary">Essential Drug List (EDL)</span>
                                        <span className={`font-bold ${fac.edl_stock_status === 'ADEQUATE' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                            {fac.edl_stock_status}
                                        </span>
                                    </div>
                                    {fac.critical_stockouts && fac.critical_stockouts.length > 0 && (
                                        <div className="p-2 bg-rose-50 rounded-lg text-[10px] text-rose-800 font-bold">
                                            ⚠️ Stockout Risk: {fac.critical_stockouts.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Link
                                href="/facility"
                                className="w-full py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-surface-container transition-colors text-center block font-headline"
                            >
                                Open Facility Console →
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
