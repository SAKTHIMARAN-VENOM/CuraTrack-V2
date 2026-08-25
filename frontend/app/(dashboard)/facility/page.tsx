'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function FacilityOperationsPage() {
    const { t } = useI18n();
    const [stats, setStats] = useState<any>(null);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [allMedicines, setAllMedicines] = useState<any[]>([]);
    const [beds, setBeds] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'medicines' | 'doctors' | 'beds'>('medicines');

    // Filter states
    const [docFilter, setDocFilter] = useState<string>('ALL');
    const [medFilter, setMedFilter] = useState<'ALL' | 'ADEQUATE' | 'LOW_STOCK' | 'CRITICAL_STOCKOUT_RISK'>('ALL');

    // Stock Update / Adjustment Modal State
    const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
    const [selectedMed, setSelectedMed] = useState<any>(null);
    const [stockAction, setStockAction] = useState<'ADD' | 'REDUCE' | 'SET'>('ADD');
    const [unitsValue, setUnitsValue] = useState<number>(500);
    const [reason, setReason] = useState<string>('Depot Batch Receipt (DMSD / MMSCL)');
    const [batchNumber, setBatchNumber] = useState<string>('');
    const [updatingStock, setUpdatingStock] = useState<boolean>(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, docsRes, medsRes, bedsRes] = await Promise.all([
                apiFetch('/api/facility/stats'),
                apiFetch(`/api/facility/doctors${docFilter !== 'ALL' ? `?status=${docFilter}` : ''}`),
                apiFetch('/api/facility/medicines'),
                apiFetch('/api/facility/beds')
            ]);
            setStats(statsRes);
            if (docsRes.doctors) setDoctors(docsRes.doctors);
            if (medsRes.medicines) setAllMedicines(medsRes.medicines);
            setBeds(bedsRes);
        } catch (err) {
            console.error('Failed to load facility data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [docFilter]);

    // Computed inventory counts across status tiers
    const allCount = allMedicines.length;
    const adequateMeds = useMemo(() => allMedicines.filter(m => m.status === 'ADEQUATE'), [allMedicines]);
    const lowStockMeds = useMemo(() => allMedicines.filter(m => m.status === 'LOW_STOCK'), [allMedicines]);
    const criticalMeds = useMemo(() => allMedicines.filter(m => m.status === 'CRITICAL_STOCKOUT_RISK'), [allMedicines]);

    const adequateCount = adequateMeds.length;
    const lowStockCount = lowStockMeds.length;
    const criticalCount = criticalMeds.length;
    const totalAlertCount = lowStockCount + criticalCount;

    // Filtered list strictly based on selected category tab
    const displayedMedicines = useMemo(() => {
        if (medFilter === 'ADEQUATE') return adequateMeds;
        if (medFilter === 'LOW_STOCK') return lowStockMeds;
        if (medFilter === 'CRITICAL_STOCKOUT_RISK') return criticalMeds;
        return allMedicines;
    }, [allMedicines, medFilter, adequateMeds, lowStockMeds, criticalMeds]);

    const openStockModal = (med: any, action: 'ADD' | 'REDUCE' | 'SET' = 'ADD') => {
        setSelectedMed(med);
        setStockAction(action);
        setUnitsValue(action === 'SET' ? med.stock_units : action === 'REDUCE' ? Math.min(100, med.stock_units) : 500);
        setReason(
            action === 'REDUCE'
                ? 'Dispensed to Inpatient / Emergency Ward'
                : action === 'SET'
                ? 'Physical Inventory Audit Count'
                : 'Depot Batch Receipt (DMSD / MMSCL)'
        );
        setBatchNumber('');
        setIsStockModalOpen(true);
    };

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMed) return;
        if (stockAction !== 'SET' && unitsValue <= 0) {
            alert('Please enter a valid unit quantity greater than 0.');
            return;
        }
        if (stockAction === 'REDUCE' && unitsValue > selectedMed.stock_units) {
            alert(`Cannot reduce more than available stock (${selectedMed.stock_units} ${selectedMed.unit}).`);
            return;
        }

        setUpdatingStock(true);
        try {
            await apiFetch('/api/facility/medicines/update-stock', {
                method: 'POST',
                body: JSON.stringify({
                    medicine_id: selectedMed.id,
                    action: stockAction,
                    units: unitsValue,
                    reason: reason.trim(),
                    batch_number: batchNumber.trim() || undefined
                })
            });
            setIsStockModalOpen(false);
            await fetchData();
        } catch (err: any) {
            alert('Failed to update stock: ' + (err.message || 'Error communicating with backend'));
        } finally {
            setUpdatingStock(false);
        }
    };

    // Live calculation for modal preview
    const curStock = selectedMed?.stock_units ?? 0;
    const projectedStock = stockAction === 'ADD'
        ? curStock + unitsValue
        : stockAction === 'REDUCE'
        ? Math.max(0, curStock - unitsValue)
        : Math.max(0, unitsValue);

    const monthlyCons = Math.max(1, selectedMed?.monthly_consumption ?? 300);
    const dailyConsumption = Math.max(1, Math.floor(monthlyCons / 30));
    const projectedDaysOfSupply = Math.floor(projectedStock / dailyConsumption);

    const projectedStatus = projectedDaysOfSupply > 20
        ? 'ADEQUATE'
        : projectedDaysOfSupply > 7
        ? 'LOW_STOCK'
        : 'CRITICAL_STOCKOUT_RISK';

    const onDutyCount = doctors.filter(d => d.status === 'ON_DUTY').length;
    const totalAvailBeds = beds?.total_available ?? 13;
    const totalBeds = beds?.total_beds ?? 50;

    const FILTER_TABS = [
        {
            key: 'ALL' as const,
            label: t('facility.allMedicines', 'All Medicines'),
            count: allCount,
            activeClass: 'bg-primary text-white shadow-sm',
            badgeClass: 'bg-white/20 text-white'
        },
        {
            key: 'ADEQUATE' as const,
            label: t('facility.adequateStock', 'Adequate Stock'),
            count: adequateCount,
            activeClass: 'bg-teal-700 text-white shadow-sm',
            badgeClass: 'bg-teal-100 text-teal-800'
        },
        {
            key: 'LOW_STOCK' as const,
            label: t('facility.lowStock', 'Low Stock'),
            count: lowStockCount,
            activeClass: 'bg-amber-600 text-white shadow-sm',
            badgeClass: 'bg-amber-100 text-amber-900'
        },
        {
            key: 'CRITICAL_STOCKOUT_RISK' as const,
            label: t('facility.criticalStockoutRisk', 'Critical Stockout Risk'),
            count: criticalCount,
            activeClass: 'bg-red-600 text-white shadow-sm',
            badgeClass: 'bg-red-100 text-red-900'
        }
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-teal-900 via-primary to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
                            <span className="material-symbols-outlined text-sm">local_hospital</span>
                            <span>{t('facility.subtitle', 'Facility Operations & Supply Chain')}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">{t('facility.title', 'Nandurbar Sub-District Hospital & CHC')}</h1>
                        <p className="text-xs text-teal-100/80 mt-1">{t('facility.bannerDesc', 'Real-time inventory management, EDL supply monitoring, and bed occupancy.')}</p>
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
                <div
                    className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all"
                    onClick={() => setActiveTab('doctors')}
                >
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">{t('facility.availableDoctors', 'Available Doctors')}</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-teal-700">{onDutyCount}</span>
                            <span className="text-xs text-tertiary font-bold">{t('facility.onDuty', 'on duty')}</span>
                        </div>
                        <span className="text-[10px] text-teal-600 font-semibold">{t('facility.readyForConsultations', 'Active & ready for consultations')}</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">stethoscope</span>
                    </div>
                </div>

                <div
                    className={`border p-5 rounded-3xl shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all ${
                        totalAlertCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-surface-container-high'
                    }`}
                    onClick={() => {
                        setActiveTab('medicines');
                        if (criticalCount > 0) setMedFilter('CRITICAL_STOCKOUT_RISK');
                        else if (lowStockCount > 0) setMedFilter('LOW_STOCK');
                        else setMedFilter('ALL');
                    }}
                >
                    <div>
                        <span className={`text-[11px] font-bold uppercase tracking-wider block ${totalAlertCount > 0 ? 'text-red-700' : 'text-tertiary'}`}>
                            {t('facility.edlStockAlerts', 'EDL Stock Alerts')}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-3xl font-black ${totalAlertCount > 0 ? 'text-red-900' : 'text-on-surface'}`}>{totalAlertCount}</span>
                            <span className="text-xs text-tertiary font-bold">/ {allCount} {t('facility.medicinesLabel', 'medicines')}</span>
                        </div>
                        <span className={`text-[10px] font-semibold ${totalAlertCount > 0 ? 'text-red-600' : 'text-teal-600'}`}>
                            {totalAlertCount > 0 ? `${criticalCount} ${t('facility.criticalStockoutRisk', 'Critical')} + ${lowStockCount} ${t('facility.lowStock', 'Low Stock')}` : t('facility.allStockAdequate', 'All stock levels adequate')}
                        </span>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${totalAlertCount > 0 ? 'bg-red-200/80 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
                        <span className="material-symbols-outlined text-2xl">{totalAlertCount > 0 ? 'warning' : 'pill'}</span>
                    </div>
                </div>

                <div
                    className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all"
                    onClick={() => setActiveTab('beds')}
                >
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">{t('facility.bedsAvailable', 'Beds Available')}</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-on-surface">{totalAvailBeds}</span>
                            <span className="text-xs text-tertiary font-bold">/ {totalBeds} {t('facility.total', 'total')}</span>
                        </div>
                        <span className="text-[10px] text-teal-600 font-semibold">
                            {beds?.occupancy_rate ?? 76}% {t('facility.occupancyAcrossWards', 'occupancy across all wards')}
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
                    onClick={() => setActiveTab('medicines')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'medicines'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">pill</span>
                    <span>{t('facility.medicineStockEDL', 'Medicine Stock (EDL)')}</span>
                    {totalAlertCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                            {totalAlertCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('doctors')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'doctors'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">stethoscope</span>
                    <span>{t('facility.myDoctors', 'My Doctors')}</span>
                </button>

                <button
                    onClick={() => setActiveTab('beds')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'beds'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">bed</span>
                    <span>{t('facility.bedAvailability', 'Bed Availability')}</span>
                </button>
            </div>

            {/* TAB 1: Medicine Stock (EDL) */}
            {activeTab === 'medicines' && (
                <div className="space-y-6">
                    {/* EDL Category Filter Tabs with Live Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {FILTER_TABS.map((tab) => {
                                const isSelected = medFilter === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setMedFilter(tab.key)}
                                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                            isSelected
                                                ? tab.activeClass
                                                : 'bg-surface-container-low text-tertiary hover:bg-surface-container hover:text-on-surface'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            isSelected ? tab.badgeClass : 'bg-surface-container text-tertiary'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="text-xs text-tertiary font-medium">
                            Showing <strong className="text-on-surface font-bold">{displayedMedicines.length}</strong> of {allCount} medicines
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                            <p className="text-xs text-tertiary mt-2">{t('facility.loadingInventory', 'Loading facility drug inventory...')}</p>
                        </div>
                    ) : displayedMedicines.length === 0 ? (
                        /* Empty state when the selected stock tab has no medicines */
                        <div className="bg-white rounded-3xl p-12 border border-surface-container-high text-center shadow-card space-y-4 max-w-lg mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-on-surface">
                                    No medicines in {FILTER_TABS.find(t => t.key === medFilter)?.label}
                                </h3>
                                <p className="text-xs text-tertiary mt-1">
                                    {medFilter === 'LOW_STOCK'
                                        ? 'Great news! There are currently no medicines running at low stock levels.'
                                        : medFilter === 'CRITICAL_STOCKOUT_RISK'
                                        ? 'No critical stockout risks detected. All medicines have adequate buffer stock.'
                                        : 'No medicines match the selected filter criteria.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setMedFilter('ALL')}
                                className="px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">visibility</span>
                                <span>{t('facility.allMedicines', 'View All Medicines')}</span>
                            </button>
                        </div>
                    ) : (
                        /* Medicine Grid Cards */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {displayedMedicines.map((med) => (
                                <div
                                    key={med.id}
                                    className={`rounded-3xl p-6 border shadow-card flex flex-col justify-between space-y-4 hover:shadow-lg transition-all ${
                                        med.status === 'CRITICAL_STOCKOUT_RISK'
                                            ? 'bg-red-50/40 border-red-200'
                                            : med.status === 'LOW_STOCK'
                                            ? 'bg-amber-50/30 border-amber-200'
                                            : 'bg-white border-surface-container-high'
                                    }`}
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
                                                <span className="text-[10px] uppercase font-bold text-tertiary block">{t('facility.currentStock', 'Current Stock')}</span>
                                                <span className="text-base font-black text-on-surface">{med.stock_units.toLocaleString()} {med.unit}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-tertiary block">{t('facility.supplyRemaining', 'Supply Remaining')}</span>
                                                <span className={`text-base font-black ${
                                                    med.days_of_supply <= 7
                                                        ? 'text-red-600 font-extrabold'
                                                        : med.days_of_supply <= 20
                                                        ? 'text-amber-600'
                                                        : 'text-teal-700'
                                                }`}>
                                                    {med.days_of_supply} {t('facility.days', 'days')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons: Add (+) and Deduct / Reduce (-) */}
                                    <div className="space-y-2 pt-2 border-t border-surface-container-high">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => openStockModal(med, 'ADD')}
                                                className="py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-base text-teal-700">add_circle</span>
                                                <span>+ {t('facility.addStock', 'Add Stock')}</span>
                                            </button>

                                            <button
                                                onClick={() => openStockModal(med, 'REDUCE')}
                                                className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-base text-red-700">remove_circle</span>
                                                <span>- {t('facility.deductUse', 'Deduct / Use')}</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => openStockModal(med, 'SET')}
                                            className="w-full py-1.5 text-[11px] font-semibold text-tertiary hover:text-on-surface flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">tune</span>
                                            <span>{t('facility.setExactCount', 'Set Exact Count (Audit)')}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: My Doctors */}
            {activeTab === 'doctors' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                                {t('facility.availableDoctorsTitle', `Available On-Duty Medical Officers (${doctors.filter(d => d.status === 'ON_DUTY').length})`)}
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
                                            {t('status.available', 'AVAILABLE')}
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

            {/* TAB 3: Bed Availability */}
            {activeTab === 'beds' && (
                <div className="space-y-6">
                    {/* Bed Summary Banner */}
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-3xl border border-teal-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-teal-900">{t('facility.wardLevelBedOccupancy', 'Ward-Level Bed Occupancy')}</h3>
                                <p className="text-xs text-teal-700">
                                    {beds?.total_available ?? 13} {t('facility.bedsAvailableAcross', 'beds available across')} {beds?.wards?.length ?? 6} {t('facility.wardsLabel', 'wards')}
                                    • {beds?.occupancy_rate ?? 76}% {t('facility.overallOccupancy', 'overall occupancy')}
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
                                            <span className="text-[10px] uppercase font-bold text-tertiary block">{t('facility.total', 'Total')}</span>
                                            <span className="text-lg font-black text-on-surface">{ward.total}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-tertiary block">{t('facility.occupied', 'Occupied')}</span>
                                            <span className={`text-lg font-black ${isOverflow ? 'text-red-600' : 'text-on-surface'}`}>{ward.occupied}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-tertiary block">{t('facility.available', 'Available')}</span>
                                            <span className={`text-lg font-black ${isOverflow ? 'text-red-600' : isCritical ? 'text-amber-700' : 'text-teal-700'}`}>
                                                {Math.max(0, ward.available)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-tertiary">
                                            <span>{t('facility.occupancy', 'Occupancy')}</span>
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

            {/* Comprehensive Stock Adjustment Modal (Add, Reduce, Set) */}
            {isStockModalOpen && selectedMed && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="text-[10px] font-mono font-bold text-primary tracking-wider uppercase">{selectedMed.id}</span>
                                <h3 className="text-lg font-black text-on-surface">{selectedMed.name}</h3>
                                <p className="text-xs text-tertiary mt-0.5">{selectedMed.category} • {selectedMed.storage_location}</p>
                            </div>
                            <button
                                onClick={() => setIsStockModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-tertiary hover:text-on-surface transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>

                        {/* Mode Selector Tabs: ADD, REDUCE, SET */}
                        <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1.5 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setStockAction('ADD');
                                    setUnitsValue(500);
                                    setReason('Depot Batch Receipt (DMSD / MMSCL)');
                                }}
                                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    stockAction === 'ADD'
                                        ? 'bg-teal-600 text-white shadow-sm'
                                        : 'text-tertiary hover:text-on-surface'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">add_circle</span>
                                <span>+ {t('facility.addStock', 'Add Stock')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStockAction('REDUCE');
                                    setUnitsValue(Math.min(100, selectedMed.stock_units));
                                    setReason('Dispensed to Inpatient / Emergency Ward');
                                }}
                                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    stockAction === 'REDUCE'
                                        ? 'bg-red-600 text-white shadow-sm'
                                        : 'text-tertiary hover:text-on-surface'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">remove_circle</span>
                                <span>- {t('facility.deductUse', 'Deduct / Use')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStockAction('SET');
                                    setUnitsValue(selectedMed.stock_units);
                                    setReason('Physical Inventory Audit Count');
                                }}
                                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    stockAction === 'SET'
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-tertiary hover:text-on-surface'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">tune</span>
                                <span>{t('facility.setExactCount', 'Set Exact')}</span>
                            </button>
                        </div>

                        {/* Live Impact Preview Card */}
                        <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                            stockAction === 'REDUCE'
                                ? 'bg-red-50/70 border-red-200 text-red-950'
                                : stockAction === 'ADD'
                                ? 'bg-teal-50/70 border-teal-200 text-teal-950'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}>
                            <div className="flex items-center justify-between font-bold">
                                <span>{t('facility.stockImpactPreview', 'Stock Impact Preview:')}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    projectedStatus === 'ADEQUATE'
                                        ? 'bg-teal-100 text-teal-800'
                                        : projectedStatus === 'LOW_STOCK'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {projectedStatus.replace(/_/g, ' ')}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-white/80 backdrop-blur p-2.5 rounded-xl border border-black/5 text-center">
                                <div>
                                    <span className="text-[10px] text-tertiary font-bold uppercase block">{t('facility.current', 'Current')}</span>
                                    <span className="text-sm font-black text-on-surface">{curStock.toLocaleString()} {selectedMed.unit}</span>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <span className="text-[10px] text-tertiary font-bold uppercase block">{t('facility.adjustment', 'Adjustment')}</span>
                                    <span className={`text-sm font-black ${
                                        stockAction === 'ADD' ? 'text-teal-700' : stockAction === 'REDUCE' ? 'text-red-600' : 'text-slate-700'
                                    }`}>
                                        {stockAction === 'ADD' ? `+${unitsValue}` : stockAction === 'REDUCE' ? `-${unitsValue}` : `=${unitsValue}`}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-tertiary font-bold uppercase block">{t('facility.newTotal', 'New Total')}</span>
                                    <span className="text-sm font-black text-on-surface">{projectedStock.toLocaleString()} {selectedMed.unit}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1">
                                <span className="text-tertiary">{t('facility.forecastedDaysSupply', 'Forecasted Days of Supply:')}</span>
                                <strong className="text-on-surface">{projectedDaysOfSupply} {t('facility.daysRemaining', 'days remaining')}</strong>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateStock} className="space-y-4">
                            {/* Quantity Input */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-on-surface">
                                        {stockAction === 'ADD'
                                            ? `${t('facility.unitsReceived', 'Units Received')} (${selectedMed.unit})`
                                            : stockAction === 'REDUCE'
                                            ? `${t('facility.unitsToDeduct', 'Units to Deduct / Dispense')} (${selectedMed.unit})`
                                            : `${t('facility.newVerifiedPhysicalCount', 'New Verified Physical Count')} (${selectedMed.unit})`}
                                    </label>
                                    {stockAction === 'REDUCE' && (
                                        <button
                                            type="button"
                                            onClick={() => setUnitsValue(selectedMed.stock_units)}
                                            className="text-[10px] text-red-700 font-bold hover:underline cursor-pointer"
                                        >
                                            {t('facility.maxAvailable', 'Max Available')} ({selectedMed.stock_units})
                                        </button>
                                    )}
                                </div>

                                <input
                                    type="number"
                                    required
                                    min={stockAction === 'SET' ? 0 : 1}
                                    max={stockAction === 'REDUCE' ? selectedMed.stock_units : undefined}
                                    value={unitsValue}
                                    onChange={(e) => setUnitsValue(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full p-3 bg-surface-container-low rounded-2xl text-base font-black text-on-surface border border-surface-container-high outline-none focus:border-primary transition-all"
                                />

                                {/* Quick Increment Pills */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {[50, 100, 250, 500, 1000].map((step) => (
                                        <button
                                            key={step}
                                            type="button"
                                            onClick={() => setUnitsValue(stockAction === 'REDUCE' ? Math.min(step, selectedMed.stock_units) : step)}
                                            className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-[11px] font-bold rounded-lg text-on-surface transition-all cursor-pointer"
                                        >
                                            {stockAction === 'ADD' ? `+${step}` : stockAction === 'REDUCE' ? `-${step}` : step}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reason / Purpose Selector */}
                            <div>
                                <label className="block text-xs font-bold text-on-surface mb-1">{t('facility.reasonTransactionType', 'Reason / Transaction Type')}</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                >
                                    {stockAction === 'REDUCE' ? (
                                        <>
                                            <option value="Dispensed to Inpatient / Emergency Ward">Dispensed to Inpatient / Emergency Ward</option>
                                            <option value="Dispensed to OPD Pharmacy Counter">Dispensed to OPD Pharmacy Counter</option>
                                            <option value="Expired Stock Safe Disposal">Expired Stock Safe Disposal</option>
                                            <option value="Damaged / Broken Packaging Write-off">Damaged / Broken Packaging Write-off</option>
                                            <option value="Inter-facility Sub-centre Transfer">Inter-facility Sub-centre Transfer</option>
                                            <option value="Physical Audit Count Discrepancy Correction">Physical Audit Count Discrepancy Correction</option>
                                        </>
                                    ) : stockAction === 'ADD' ? (
                                        <>
                                            <option value="Depot Batch Receipt (DMSD / MMSCL)">Depot Batch Receipt (DMSD / MMSCL)</option>
                                            <option value="Emergency State Medical Quota Shipment">Emergency State Medical Quota Shipment</option>
                                            <option value="Returned Unused Medication from Ward">Returned Unused Medication from Ward</option>
                                            <option value="Physical Audit Count Reconciliation">Physical Audit Count Reconciliation</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Physical Inventory Audit Count">Physical Inventory Audit Count</option>
                                            <option value="Quarterly State Pharmacy Verification">Quarterly State Pharmacy Verification</option>
                                            <option value="Initial System Migration / Baseline">Initial System Migration / Baseline</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Optional Batch Number / Notes */}
                            <div>
                                <label className="block text-xs font-bold text-on-surface mb-1">{t('facility.batchNumberRefOptional', 'Batch Number / Reference (Optional)')}</label>
                                <input
                                    type="text"
                                    placeholder="e.g. BATCH-MH-2026-X09"
                                    value={batchNumber}
                                    onChange={(e) => setBatchNumber(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            {/* Modal Action Footer */}
                            <div className="pt-3 flex items-center justify-end gap-2 border-t border-surface-container-high">
                                <button
                                    type="button"
                                    onClick={() => setIsStockModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container transition-all cursor-pointer"
                                >
                                    {t('actions.cancel', 'Cancel')}
                                </button>

                                <button
                                    type="submit"
                                    disabled={updatingStock || (stockAction === 'REDUCE' && unitsValue > selectedMed.stock_units)}
                                    className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                                        stockAction === 'REDUCE'
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : stockAction === 'SET'
                                            ? 'bg-slate-900 hover:bg-black text-white'
                                            : 'bg-teal-700 hover:bg-teal-800 text-white'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-base">
                                        {updatingStock ? 'progress_activity' : 'check'}
                                    </span>
                                    <span>
                                        {updatingStock
                                            ? t('actions.saving', 'Saving Inventory...')
                                            : stockAction === 'REDUCE'
                                            ? `${t('actions.confirmDeduct', 'Confirm Deduct')} (-${unitsValue} ${selectedMed.unit})`
                                            : stockAction === 'SET'
                                            ? `${t('actions.setStockTo', 'Set Stock to')} ${unitsValue} ${selectedMed.unit}`
                                            : `${t('actions.confirmAdd', 'Confirm Add')} (+${unitsValue} ${selectedMed.unit})`}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
