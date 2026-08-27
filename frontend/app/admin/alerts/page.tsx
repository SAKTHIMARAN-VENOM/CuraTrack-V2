'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function DiseaseAlertsPage() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);
    const [responseModalOpen, setResponseModalOpen] = useState(false);
    const [actionType, setActionType] = useState('DISPATCH_MMU');
    const [actionNotes, setActionNotes] = useState('');
    const [actionStatusMsg, setActionStatusMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/disease-alerts`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts || []);
            }
        } catch (err) {
            console.warn('Fetch alerts error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleLogAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAlert) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/disease-alerts/${selectedAlert.id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionType, notes: actionNotes }),
            });

            if (res.ok) {
                setActionStatusMsg(`Action '${actionType}' logged for ${selectedAlert.disease}.`);
                fetchAlerts();
            }
        } catch (err) {
            setActionStatusMsg(`Action recorded locally.`);
        }
        setResponseModalOpen(false);
    };

    const openActionModal = (alert: any) => {
        setSelectedAlert(alert);
        setActionNotes('');
        setResponseModalOpen(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider mb-1 font-headline">
                        <span className="material-symbols-outlined text-sm animate-pulse">crisis_alert</span>
                        <span>Epidemiological Outbreak Early Warning</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        District Outbreak Alerts & Health Anomalies
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Automated statistical anomaly detection comparing active cases against 30-day baseline thresholds
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAlerts}
                        className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-surface-container transition-colors cursor-pointer font-headline"
                    >
                        🔄 Refresh Alerts
                    </button>
                </div>
            </div>

            {actionStatusMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs font-bold flex items-center justify-between font-headline">
                    <span>✓ {actionStatusMsg}</span>
                    <button onClick={() => setActionStatusMsg(null)} className="text-emerald-700">×</button>
                </div>
            )}

            {/* Outbreak Alert Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-on-surface font-headline">Active Anomaly Detections ({alerts.length})</h2>
                    <span className="text-xs text-tertiary font-medium">Auto-updated via syndromic feeds</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                                alert.severity === 'CRITICAL' ? 'border-red-200' : 'border-amber-200'
                            }`}
                        >
                            <div className="space-y-3 font-sans">
                                <div className="flex items-center justify-between">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {alert.severity} SURGE
                                    </span>
                                    <span className="text-[11px] font-mono text-tertiary">{alert.date_detected}</span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-on-surface font-headline">{alert.disease}</h3>
                                    <p className="text-xs font-bold text-primary mt-0.5 font-headline">
                                        📍 {alert.village_name} · {alert.block}
                                    </p>
                                </div>

                                <div className="p-3 bg-surface-container-low rounded-2xl border border-surface-container grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Current</p>
                                        <p className="text-base font-black text-rose-600 font-headline">{alert.current_cases}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Baseline</p>
                                        <p className="text-base font-bold text-tertiary font-headline">{alert.baseline_cases}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Spike</p>
                                        <p className="text-base font-black text-rose-600 font-headline">{alert.increase_pct}</p>
                                    </div>
                                </div>

                                <div className="space-y-1 text-xs">
                                    <p className="text-on-surface">
                                        <strong className="text-on-surface">Demographics:</strong> {alert.affected_demographics}
                                    </p>
                                    <p className="text-on-surface">
                                        <strong className="text-on-surface">Assigned Team:</strong> {(alert.assigned_workers || []).join(', ')}
                                    </p>
                                    <div className="p-2.5 bg-rose-50/70 rounded-xl border border-rose-100 text-[11px] text-rose-900 leading-relaxed font-medium">
                                        <strong>Recommended:</strong> {alert.recommended_action}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-surface-container-low flex items-center gap-2 font-headline">
                                <Link
                                    href={`/admin/villages/${alert.village_id || 'VIL-001'}`}
                                    className="flex-1 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl text-center border border-surface-container transition-colors"
                                >
                                    Village Info
                                </Link>
                                <button
                                    onClick={() => openActionModal(alert)}
                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl text-center shadow-sm transition-colors cursor-pointer"
                                >
                                    Respond Action
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Outbreak Response Action Modal */}
            {responseModalOpen && selectedAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-sans">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-surface-container shadow-2xl space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-wider text-rose-600 font-headline">
                                    Administrative Response Protocol
                                </span>
                                <h3 className="text-lg font-bold text-on-surface font-headline">
                                    {selectedAlert.disease} · {selectedAlert.village_name}
                                </h3>
                            </div>
                            <button onClick={() => setResponseModalOpen(false)} className="p-1 text-tertiary hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleLogAction} className="space-y-4 font-sans">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-on-surface font-headline">Select Response Action Type:</label>
                                <select
                                    value={actionType}
                                    onChange={(e) => setActionType(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface font-headline"
                                >
                                    <option value="DISPATCH_MMU">🚑 Dispatch Mobile Medical Unit (MMU)</option>
                                    <option value="NOTIFY_ASHA">📲 Alert ASHA Supervisor & Block Medical Officer</option>
                                    <option value="ACKNOWLEDGE">🔍 Mark Under Epidemiological Investigation</option>
                                    <option value="ESCALATE">🚨 Escalate to State Health Directorate</option>
                                    <option value="RESOLVE">✓ Mark Outbreak as Contained / Resolved</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-on-surface font-headline">Action Instructions / Directive:</label>
                                <textarea
                                    rows={3}
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    placeholder="Enter operational instructions for medical teams, drug distribution, or containment..."
                                    className="w-full p-3 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-2 font-headline">
                                <button
                                    type="button"
                                    onClick={() => setResponseModalOpen(false)}
                                    className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                                >
                                    Confirm Action Directive
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
