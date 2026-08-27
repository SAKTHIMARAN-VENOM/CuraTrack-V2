'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function AdminReferralsPage() {
    const [referralData, setReferralData] = useState<any>(null);
    const [filterUrgency, setFilterUrgency] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReferrals() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/referrals-overview`);
                if (res.ok) {
                    const data = await res.json();
                    setReferralData(data);
                }
            } catch (err) {
                console.warn('Fetch referrals warning:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchReferrals();
    }, []);

    const referrals = referralData?.referrals || [];

    const filtered = referrals.filter((r: any) => {
        const matchesUrgency = filterUrgency === 'ALL' || r.urgency === filterUrgency;
        const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
        return matchesUrgency && matchesStatus;
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        District Referral Pipeline & SLA Monitoring
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Inter-facility emergency transfers, ambulance tracking (108), destination bed locks, and clinical handover audits
                    </p>
                </div>
                <Link
                    href="/referrals"
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 font-headline"
                >
                    <span>Open Live Referral Pipeline</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                    <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Total Transfers</p>
                    <p className="text-2xl font-black text-on-surface mt-1 font-headline">{referralData?.total_referrals || 0}</p>
                    <p className="text-xs text-tertiary font-medium">District Cross-Facility</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                    <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Active Pending</p>
                    <p className="text-2xl font-black text-amber-600 mt-1 font-headline">{referralData?.pending_referrals || 0}</p>
                    <p className="text-xs text-tertiary font-medium">Awaiting Handover</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                    <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Emergency Cases</p>
                    <p className="text-2xl font-black text-rose-600 mt-1 font-headline">{referralData?.emergency_referrals || 0}</p>
                    <p className="text-xs text-rose-700 font-bold">Immediate Care Protocol</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-surface-container shadow-sm">
                    <p className="text-[10px] text-tertiary uppercase font-bold font-headline">In Transit (108 EMS)</p>
                    <p className="text-2xl font-black text-primary mt-1 font-headline">{referralData?.in_transit_referrals || 0}</p>
                    <p className="text-xs text-tertiary font-medium">Active Ambulances</p>
                </div>
            </div>

            {/* Filter and Referral Records */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-on-surface font-headline">District Referral Registry</h2>
                    <div className="flex flex-wrap items-center gap-2 font-headline">
                        <select
                            value={filterUrgency}
                            onChange={(e) => setFilterUrgency(e.target.value)}
                            className="px-3.5 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface"
                        >
                            <option value="ALL">All Urgencies</option>
                            <option value="EMERGENCY">EMERGENCY Only</option>
                            <option value="URGENT">URGENT</option>
                            <option value="ROUTINE">ROUTINE</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3.5 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="CREATED">CREATED</option>
                            <option value="IN_TRANSIT">IN TRANSIT</option>
                            <option value="ACCEPTED">ACCEPTED</option>
                            <option value="COMPLETED">COMPLETED</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                            <tr className="border-b border-surface-container text-tertiary uppercase font-black text-[10px] tracking-wider font-headline">
                                <th className="py-3 px-4">Patient</th>
                                <th className="py-3 px-4">Originating Node</th>
                                <th className="py-3 px-4">Destination Facility</th>
                                <th className="py-3 px-4">Specialty Requested</th>
                                <th className="py-3 px-4">Urgency</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low">
                            {filtered.map((ref: any, idx: number) => (
                                <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-on-surface font-headline">
                                        <div>{ref.patient_name}</div>
                                        <div className="text-[10px] text-tertiary font-mono">{ref.patient_id}</div>
                                    </td>
                                    <td className="py-3.5 px-4 text-on-surface">{ref.referring_facility_name || 'PHC Nandurbar Rural'}</td>
                                    <td className="py-3.5 px-4 font-semibold text-primary">{ref.destination_facility_name || 'Nandurbar District Civil Hospital'}</td>
                                    <td className="py-3.5 px-4 text-on-surface">{ref.specialty || 'General Medicine'}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            ref.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-800 border border-red-200' :
                                            ref.urgency === 'URGENT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            {ref.urgency || 'URGENT'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="font-bold text-on-surface">{ref.status || 'CREATED'}</span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <Link href="/referrals" className="text-xs font-bold text-primary hover:underline font-headline">
                                            Track →
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
