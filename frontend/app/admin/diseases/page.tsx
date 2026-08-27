'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

export default function DiseaseMonitoringPage() {
    const [diseases, setDiseases] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [selectedDisease, setSelectedDisease] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDiseaseData() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/disease-monitoring`);
                if (res.ok) {
                    const data = await res.json();
                    setDiseases(data.diseases || []);
                    setTrendData(data.trend_history_7d || []);
                }
            } catch (err) {
                console.warn('Fetch disease monitoring warning:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchDiseaseData();
    }, []);

    const filteredDiseases = selectedDisease === 'ALL'
        ? diseases
        : diseases.filter(d => d.name.toLowerCase().includes(selectedDisease.toLowerCase()));

    const totalActiveCases = diseases.reduce((acc, d) => acc + (d.cases_current || 0), 0);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        District Disease Surveillance & Epidemiology
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Tracking vector-borne surges, respiratory clusters, waterborne outbreaks, and chronic endemic conditions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/alerts"
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 font-headline"
                    >
                        <span className="material-symbols-outlined text-sm">emergency_heat</span>
                        <span>Outbreak Response Console</span>
                    </Link>
                </div>
            </div>

            {/* 7-Day Trend Chart */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-bold text-on-surface font-headline">7-Day Multi-Pathogen Incidence Curve</h2>
                        <p className="text-xs text-tertiary">Case trajectory monitored across PHCs and ASHA daily syndromic reporting</p>
                    </div>
                    <span className="text-xs font-bold text-on-surface font-headline">Total Active Cases: {totalActiveCases}</span>
                </div>

                <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#edeeef" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#717786" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#717786" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#191c1d', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="Dengue" stroke="#ba1a1a" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Malaria" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Gastro" stroke="#35B0AB" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="TB" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Disease Breakdown Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-on-surface font-headline">Active Pathogen Breakdown & Hotspots</h2>
                    <select
                        value={selectedDisease}
                        onChange={(e) => setSelectedDisease(e.target.value)}
                        className="px-3.5 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs font-bold text-on-surface focus:outline-none font-headline"
                    >
                        <option value="ALL">All Diseases</option>
                        <option value="Dengue">Dengue</option>
                        <option value="Malaria">Malaria</option>
                        <option value="TB">Pulmonary TB</option>
                        <option value="Gastro">Acute Gastroenteritis</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                            <tr className="border-b border-surface-container text-tertiary uppercase font-black text-[10px] tracking-wider font-headline">
                                <th className="py-3 px-4">Disease / Pathogen</th>
                                <th className="py-3 px-4">Current Cases</th>
                                <th className="py-3 px-4">Previous Baseline</th>
                                <th className="py-3 px-4">Trajectory (Change %)</th>
                                <th className="py-3 px-4">Severity Tier</th>
                                <th className="py-3 px-4">Hotspot Villages</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low">
                            {filteredDiseases.map((d, idx) => (
                                <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-on-surface flex items-center gap-2 font-headline">
                                        <span className="material-symbols-outlined text-base text-primary">coronavirus</span>
                                        <span>{d.name}</span>
                                    </td>
                                    <td className="py-3.5 px-4 font-black text-on-surface text-sm font-headline">{d.cases_current}</td>
                                    <td className="py-3.5 px-4 text-tertiary font-semibold">{d.cases_previous}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            d.trend === 'INCREASING' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {d.trend === 'INCREASING' ? `▲ ${d.change_pct}` : `▼ ${d.change_pct}`}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            d.severity === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {d.severity}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-medium text-on-surface">
                                        {(d.hotspot_villages || []).join(', ')}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <Link
                                            href="/admin/alerts"
                                            className="text-xs font-bold text-primary hover:underline font-headline"
                                        >
                                            View Response →
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
