'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function FacilityOperationsPage() {
    const { t } = useI18n();
    const [stats, setStats] = useState<any>(null);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [beds, setBeds] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'doctors' | 'medicines' | 'beds'>('doctors');

    // Filters
    const [docFilter, setDocFilter] = useState<string>('ALL');
    const [medFilter, setMedFilter] = useState<string>('ALL');

    // Stock Update Modal
    const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
    const [selectedMed, setSelectedMed] = useState<any>(null);
    const [unitsToAdd, setUnitsToAdd] = useState<number>(500);
    const [updatingStock, setUpdatingStock] = useState<boolean>(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, docsRes, medsRes, bedsRes] = await Promise.all([
                apiFetch('/api/facility/stats'),
                apiFetch(`/api/facility/doctors${docFilter !== 'ALL' ? `?status=${docFilter}` : ''}`),
                apiFetch(`/api/facility/medicines${medFilter !== 'ALL' ? `?status=${medFilter}` : ''}`),
                apiFetch('/api/facility/beds')
            ]);
            setStats(statsRes);
            if (docsRes.doctors) setDoctors(docsRes.doctors);
            if (medsRes.medicines) setMedicines(medsRes.medicines);
            setBeds(bedsRes);
        } catch (err) {
            console.error('Failed to load facility data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [docFilter, medFilter]);

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMed || unitsToAdd <= 0) return;
        setUpdatingStock(true);
        try {
            await apiFetch(`/api/facility/medicines/${selectedMed.id}/update-stock`, {
                method: 'POST',
                body: JSON.stringify({ units_to_add: unitsToAdd })
            });
            setIsStockModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert('Failed to update stock: ' + (err.message || 'Error'));
        } finally {
            setUpdatingStock(false);
        }
    };

    const onDutyCount = doctors.filter(d => d.status === 'ON_DUTY').length;
    const criticalMeds = medicines.filter(m => m.status !== 'ADEQUATE').length;
    const totalAvailBeds = beds?.total_available ?? 13;
    const totalBeds = beds?.total_beds ?? 50;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-teal-900 via-primary to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
                            <span className="material-symbols-outlined text-sm">local_hospital</span>
                            <span>{t('facility.subtitle', 'Facility Operations & Bed Matrix')}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">{t('facility.title', 'Facility Operations & Bed Matrix')}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchData()}
                            className="bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                            <span>{t('actions.refresh', 'Refresh All Data')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Metric KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all" onClick={() => setActiveTab('doctors')}>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Available Doctors</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-teal-700">{onDutyCount}</span>
                            <span className="text-xs text-tertiary font-bold">on duty</span>
                        </div>
                        <span className="text-[10px] text-teal-600 font-semibold">Active & ready for consultations</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">stethoscope</span>
                    </div>
                </div>

                <div className={`border p-5 rounded-3xl shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all ${criticalMeds > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-surface-container-high'}`} onClick={() => setActiveTab('medicines')}>
                    <div>
                        <span className={`text-[11px] font-bold uppercase tracking-wider block ${criticalMeds > 0 ? 'text-red-700' : 'text-tertiary'}`}>EDL Stock Alerts</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-3xl font-black ${criticalMeds > 0 ? 'text-red-900' : 'text-on-surface'}`}>{criticalMeds}</span>
                            <span className="text-xs text-tertiary font-bold">/ {medicines.length} medicines</span>
                        </div>
                        <span className={`text-[10px] font-semibold ${criticalMeds > 0 ? 'text-red-600' : 'text-teal-600'}`}>
                            {criticalMeds > 0 ? 'Low stock / critical stockout risk' : 'All stock levels adequate'}
                        </span>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${criticalMeds > 0 ? 'bg-red-200/80 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
                        <span className="material-symbols-outlined text-2xl">{criticalMeds > 0 ? 'warning' : 'pill'}</span>
                    </div>
                </div>

                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all" onClick={() => setActiveTab('beds')}>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Beds Available</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-on-surface">{totalAvailBeds}</span>
                            <span className="text-xs text-tertiary font-bold">/ {totalBeds} total</span>
                        </div>
                        <span className="text-[10px] text-teal-600 font-semibold">
                            {beds?.occupancy_rate ?? 76}% occupancy across all wards
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">bed</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-surface-container-high gap-2">
                <button
                    onClick={() => setActiveTab('doctors')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'doctors'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">stethoscope</span>
                    <span>My Doctors</span>
                </button>

                <button
                    onClick={() => setActiveTab('medicines')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'medicines'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">pill</span>
                    <span>Medicine Stock (EDL)</span>
                </button>

                <button
                    onClick={() => setActiveTab('beds')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'beds'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">bed</span>
                    <span>Bed Availability</span>
                </button>
            </div>

            {/* TAB 1: My Doctors (Available Doctors Only) */}
            {activeTab === 'doctors' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                                Available On-Duty Medical Officers ({doctors.filter(d => d.status === 'ON_DUTY').length})
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {doctors.filter(d => d.status === 'ON_DUTY').map((doc) => (
                                <div
                                    key={doc.id}
                                    className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-4 hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg bg-teal-600 shadow-sm">
                                                {doc.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-on-surface">{doc.name}</h3>
                                                <span className="text-xs text-tertiary font-medium">{doc.specialty}</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                                            AVAILABLE
                                        </span>
                                    </div>

                                    <div className="text-xs text-tertiary space-y-2 bg-surface-container-low p-4 rounded-2xl">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-primary">school</span>
                                            <span className="font-semibold text-on-surface">{doc.qualification || 'MBBS, MD'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-primary">schedule</span>
                                            <span>{doc.shift || 'General Shift (08:00 AM - 02:00 PM)'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-primary">door_open</span>
                                            <span>{doc.room || 'OPD Room 101'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-primary">phone</span>
                                            <span className="font-bold text-on-surface">{doc.phone || '+91 98230 11223'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Medicine Stock (EDL) */}
            {activeTab === 'medicines' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-1.5">
                        {['ALL', 'ADEQUATE', 'LOW_STOCK', 'CRITICAL_STOCKOUT_RISK'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setMedFilter(st)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    medFilter === st
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                {st.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {medicines.map((med) => (
                                <div
                                    key={med.id}
                                    className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card flex flex-col justify-between space-y-4"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-mono font-bold text-primary">{med.id}</span>
                                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                                med.status === 'ADEQUATE'
                                                    ? 'bg-teal-100 text-teal-800'
                                                    : med.status === 'LOW_STOCK'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-red-100 text-red-800 animate-pulse'
                                            }`}>
                                                {med.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-on-surface">{med.name}</h3>
                                        <span className="text-xs text-tertiary block mt-1">{med.category} • {med.storage_location}</span>

                                        <div className="mt-4 grid grid-cols-2 gap-2 bg-surface-container-low p-3.5 rounded-2xl text-xs">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-tertiary block">Current Stock</span>
                                                <span className="text-base font-black text-on-surface">{med.stock_units.toLocaleString()} {med.unit}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-tertiary block">Supply Remaining</span>
                                                <span className={`text-base font-black ${med.days_of_supply < 7 ? 'text-red-600 font-extrabold' : 'text-teal-700'}`}>
                                                    {med.days_of_supply} days
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedMed(med);
                                            setIsStockModalOpen(true);
                                        }}
                                        className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-base">add_box</span>
                                        <span>Log Batch Receipt</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: Bed Availability */}
            {activeTab === 'beds' && (
                <div className="space-y-6">
                    {/* Bed Summary Banner */}
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-3xl border border-teal-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-teal-900">Ward-Level Bed Occupancy</h3>
                                <p className="text-xs text-teal-700">
                                    {beds?.total_available ?? 13} beds available across {beds?.wards?.length ?? 6} wards
                                    • {beds?.occupancy_rate ?? 76}% overall occupancy
                                </p>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-black">
                                {beds?.total_available ?? 13}
                            </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="w-full h-3 bg-teal-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    (beds?.occupancy_rate ?? 76) > 90 ? 'bg-red-500' : (beds?.occupancy_rate ?? 76) > 75 ? 'bg-amber-500' : 'bg-teal-600'
                                }`}
                                style={{ width: `${beds?.occupancy_rate ?? 76}%` }}
                            />
                        </div>
                    </div>

                    {/* Ward Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {(beds?.wards ?? []).map((ward: any, idx: number) => {
                            const occupancyPct = ward.total > 0 ? Math.round((ward.occupied / ward.total) * 100) : 0;
                            const isOverflow = ward.available < 0;
                            const isCritical = ward.available <= 1 && !isOverflow;
                            return (
                                <div
                                    key={idx}
                                    className={`rounded-3xl p-6 border shadow-card space-y-4 ${
                                        isOverflow
                                            ? 'bg-red-50 border-red-200'
                                            : isCritical
                                            ? 'bg-amber-50 border-amber-200'
                                            : 'bg-white border-surface-container-high'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-base font-bold text-on-surface">{ward.ward}</h3>
                                            <p className="text-xs text-tertiary mt-0.5">{ward.description}</p>
                                        </div>
                                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                                            isOverflow
                                                ? 'bg-red-100 text-red-800 animate-pulse'
                                                : isCritical
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-teal-100 text-teal-800'
                                        }`}>
                                            {isOverflow ? 'OVERFLOW' : isCritical ? 'NEAR FULL' : `${ward.available} FREE`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center bg-surface-container-low p-3 rounded-2xl">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-tertiary block">Total</span>
                                            <span className="text-lg font-black text-on-surface">{ward.total}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-tertiary block">Occupied</span>
                                            <span className={`text-lg font-black ${isOverflow ? 'text-red-600' : 'text-on-surface'}`}>{ward.occupied}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-tertiary block">Available</span>
                                            <span className={`text-lg font-black ${isOverflow ? 'text-red-600' : isCritical ? 'text-amber-700' : 'text-teal-700'}`}>
                                                {Math.max(0, ward.available)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-tertiary">
                                            <span>Occupancy</span>
                                            <span>{Math.min(100, occupancyPct)}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    isOverflow ? 'bg-red-500' : isCritical ? 'bg-amber-500' : 'bg-teal-600'
                                                }`}
                                                style={{ width: `${Math.min(100, occupancyPct)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stock Receipt Modal */}
            {isStockModalOpen && selectedMed && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200">
                        <h3 className="text-base font-bold text-on-surface mb-2">Log Stock Receipt</h3>
                        <p className="text-xs text-tertiary mb-4">Adding units for <strong>{selectedMed.name}</strong></p>

                        <form onSubmit={handleUpdateStock} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Units Received ({selectedMed.unit})</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={unitsToAdd}
                                    onChange={(e) => setUnitsToAdd(parseInt(e.target.value) || 0)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-tertiary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingStock}
                                    className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                                >
                                    {updatingStock ? 'Saving...' : 'Add To Inventory'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
