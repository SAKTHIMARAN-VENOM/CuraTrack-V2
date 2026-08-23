'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function FacilityOperationsPage() {
    const [stats, setStats] = useState<any>(null);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [diagnostics, setDiagnostics] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'inventory' | 'diagnostics' | 'opd'>('inventory');

    // Filter states
    const [medFilter, setMedFilter] = useState<string>('ALL');
    const [diagFilter, setDiagFilter] = useState<string>('ALL');

    // Diagnostic Order Modal
    const [isDiagModalOpen, setIsDiagModalOpen] = useState<boolean>(false);
    const [newDiag, setNewDiag] = useState({
        patient_id: 'P-5021',
        patient_name: '',
        test_name: 'Complete Blood Count (CBC) + Hemoglobin',
        category: 'Hematology',
        priority: 'HIGH',
        clinical_indication: ''
    });
    const [orderingDiag, setOrderingDiag] = useState<boolean>(false);

    // Stock Update Modal
    const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
    const [selectedMed, setSelectedMed] = useState<any>(null);
    const [unitsToAdd, setUnitsToAdd] = useState<number>(500);
    const [updatingStock, setUpdatingStock] = useState<boolean>(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, medsRes, diagsRes] = await Promise.all([
                apiFetch('/api/facility/stats'),
                apiFetch(`/api/facility/medicines?status=${medFilter}`),
                apiFetch(`/api/facility/diagnostics?status=${diagFilter}`)
            ]);
            setStats(statsRes);
            if (medsRes.medicines) setMedicines(medsRes.medicines);
            if (diagsRes.diagnostics) setDiagnostics(diagsRes.diagnostics);
        } catch (err) {
            console.error('Failed to load facility data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [medFilter, diagFilter]);

    const handleCreateDiagOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDiag.patient_name) return;
        setOrderingDiag(true);
        try {
            await apiFetch('/api/facility/diagnostics/order', {
                method: 'POST',
                body: JSON.stringify(newDiag)
            });
            setIsDiagModalOpen(false);
            setNewDiag({
                patient_id: 'P-5021',
                patient_name: '',
                test_name: 'Complete Blood Count (CBC) + Hemoglobin',
                category: 'Hematology',
                priority: 'HIGH',
                clinical_indication: ''
            });
            fetchData();
        } catch (err: any) {
            alert('Failed to order diagnostic test: ' + (err.message || 'Error'));
        } finally {
            setOrderingDiag(false);
        }
    };

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMed || unitsToAdd <= 0) return;
        setUpdatingStock(true);
        try {
            await apiFetch('/api/facility/medicines/update-stock', {
                method: 'POST',
                body: JSON.stringify({
                    medicine_id: selectedMed.id,
                    units_added: unitsToAdd
                })
            });
            setIsStockModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert('Failed to update stock: ' + (err.message || 'Error'));
        } finally {
            setUpdatingStock(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-teal-900 via-primary to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
                            <span className="material-symbols-outlined text-sm">local_hospital</span>
                            <span>Public Health Facility Operations & Pharmacy</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Facility Resource & Diagnostics Command</h1>
                        <p className="text-teal-100 text-sm mt-2 max-w-2xl leading-relaxed">
                            Real-time tracking of Essential Drug List (EDL) inventory, diagnostic lab orders, OPD queue flow, and bed occupancy for rural hospitals and Community Health Centres.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsDiagModalOpen(true)}
                            className="bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">science</span>
                            <span>Order Diagnostic Test</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Metric KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Today's OPD Queue</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-on-surface">{stats ? stats.opd_today.total_registered : 142}</span>
                            <span className="text-xs text-amber-600 font-bold">({stats ? stats.opd_today.waiting : 44} waiting)</span>
                        </div>
                        <span className="text-[10px] text-tertiary font-semibold">Avg wait: ~{stats ? stats.opd_today.average_wait_minutes : 22} mins</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">groups</span>
                    </div>
                </div>

                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Inpatient Bed Occupancy</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-on-surface">{stats ? stats.beds.occupied : 38}</span>
                            <span className="text-xs text-tertiary font-bold">/ {stats ? stats.beds.total : 50} beds</span>
                        </div>
                        <span className="text-[10px] text-teal-600 font-semibold">{stats ? stats.beds.available : 12} beds available ({stats ? stats.beds.maternal_ward_available : 4} maternal)</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">bed</span>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-200 p-5 rounded-3xl text-red-900 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">EDL Stockout Risks</span>
                        <span className="text-3xl font-black mt-1 block">{medicines.filter(m => m.status !== 'ADEQUATE').length || 2}</span>
                        <span className="text-[10px] text-red-600 font-semibold">IFA / ORS / Metformin alerts</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-red-200/80 text-red-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">warning</span>
                    </div>
                </div>

                <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Active Lab Tests</span>
                        <span className="text-3xl font-black text-on-surface mt-1 block">{diagnostics.filter(d => d.status !== 'COMPLETED').length || 2}</span>
                        <span className="text-[10px] text-purple-600 font-semibold">CBC, AFB Smear, Ultrasound</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">biotech</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-surface-container-high gap-2">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'inventory'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">pill</span>
                    <span>Essential Medicines Inventory (EDL)</span>
                </button>

                <button
                    onClick={() => setActiveTab('diagnostics')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'diagnostics'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">science</span>
                    <span>Diagnostic Lab Coordination</span>
                </button>

                <button
                    onClick={() => setActiveTab('opd')}
                    className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'opd'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-tertiary hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-base">airline_seat_recline_normal</span>
                    <span>OPD Flow & Bed Allocation</span>
                </button>
            </div>

            {/* TAB 1: Essential Medicines Inventory */}
            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            {/* TAB 2: Diagnostic Lab Coordination */}
            {activeTab === 'diagnostics' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-1.5">
                            {['ALL', 'ORDERED', 'SAMPLE_COLLECTED', 'SCHEDULED', 'COMPLETED'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setDiagFilter(st)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        diagFilter === st
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                                    }`}
                                >
                                    {st.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {diagnostics.map((diag) => (
                            <div
                                key={diag.id}
                                className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-primary">{diag.id} • {diag.facility_level}</span>
                                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                        diag.status === 'COMPLETED' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {diag.status.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-on-surface">{diag.test_name}</h3>
                                    <p className="text-xs text-tertiary mt-1">
                                        Patient: <strong className="text-on-surface">{diag.patient_name}</strong> ({diag.patient_id}) • Ordered by: {diag.ordered_by}
                                    </p>
                                </div>

                                {diag.result_summary ? (
                                    <div className={`p-4 rounded-2xl text-xs font-bold border ${
                                        diag.critical_alert ? 'bg-red-50 text-red-900 border-red-200' : 'bg-teal-50 text-teal-900 border-teal-200'
                                    }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="material-symbols-outlined text-base">
                                                {diag.critical_alert ? 'emergency' : 'check_circle'}
                                            </span>
                                            <span className="uppercase text-[10px] tracking-wider font-extrabold">Verified Lab Report</span>
                                        </div>
                                        <p>{diag.result_summary}</p>
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-surface-container-low rounded-2xl text-xs text-tertiary flex items-center gap-2">
                                        <span className="material-symbols-outlined animate-spin text-sm text-primary">hourglass_empty</span>
                                        <span>Sample processing in progress at central facility laboratory.</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: Live OPD Flow & Bed Allocation */}
            {activeTab === 'opd' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                            <span className="material-symbols-outlined">airline_seat_recline_normal</span>
                            <h3>OPD Live Token Queue</h3>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-teal-800 font-bold uppercase tracking-wider block">Now Consulting</span>
                                <span className="text-4xl font-black text-teal-950 block mt-1">Token #098</span>
                                <span className="text-xs text-teal-700 font-semibold mt-1 block">General Medicine Room 2 (Dr. David Ross)</span>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-teal-600 text-white flex items-center justify-center text-2xl font-black">
                                98
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-2 border-b border-surface-container">
                                <span className="text-tertiary">Next In Queue:</span>
                                <strong className="text-on-surface">Token #099, #100, #101</strong>
                            </div>
                            <div className="flex justify-between py-2 border-b border-surface-container">
                                <span className="text-tertiary">Estimated Wait For #115:</span>
                                <strong className="text-on-surface">~28 mins</strong>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                            <span className="material-symbols-outlined">bed</span>
                            <h3>Inpatient Ward Capacity</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold text-on-surface block">Maternal ANC Ward</span>
                                    <span className="text-tertiary">Postpartum & high-risk observation</span>
                                </div>
                                <span className="font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">4 Beds Available</span>
                            </div>

                            <div className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold text-on-surface block">Emergency / Trauma ICU</span>
                                    <span className="text-tertiary">Oxygen support & hemodynamic monitors</span>
                                </div>
                                <span className="font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">2 Beds Available</span>
                            </div>

                            <div className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold text-on-surface block">General Male/Female Ward</span>
                                    <span className="text-tertiary">Inpatient recovery</span>
                                </div>
                                <span className="font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">6 Beds Available</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Diagnostic Order Modal */}
            {isDiagModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4 mb-4">
                            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">science</span>
                                <span>Order Clinical Diagnostic Test</span>
                            </h3>
                            <button onClick={() => setIsDiagModalOpen(false)} className="p-2 rounded-full text-tertiary hover:bg-surface-container">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateDiagOrder} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Patient Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Ramesh Rathod"
                                    value={newDiag.patient_name}
                                    onChange={(e) => setNewDiag({ ...newDiag, patient_name: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Test Investigation</label>
                                <select
                                    value={newDiag.test_name}
                                    onChange={(e) => setNewDiag({ ...newDiag, test_name: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                >
                                    <option value="Complete Blood Count (CBC) + Hemoglobin">Complete Blood Count (CBC) + Hemoglobin</option>
                                    <option value="Sputum AFB Smear Microscopy (Day 1)">Sputum AFB Smear Microscopy (Day 1)</option>
                                    <option value="Fasting & Post-Prandial Blood Glucose">Fasting & Post-Prandial Blood Glucose</option>
                                    <option value="Obstetric Ultrasound (2nd Trimester Anomaly Scan)">Obstetric Ultrasound (2nd Trimester Anomaly Scan)</option>
                                    <option value="Chest X-Ray PA View">Chest X-Ray PA View</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Priority</label>
                                <select
                                    value={newDiag.priority}
                                    onChange={(e) => setNewDiag({ ...newDiag, priority: e.target.value })}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                >
                                    <option value="ROUTINE">ROUTINE</option>
                                    <option value="HIGH">HIGH (Within 4 hrs)</option>
                                    <option value="URGENT">URGENT (Immediate / STAT)</option>
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsDiagModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-tertiary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={orderingDiag}
                                    className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                                >
                                    {orderingDiag ? 'Ordering...' : 'Submit Lab Order'}
                                </button>
                            </div>
                        </form>
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
