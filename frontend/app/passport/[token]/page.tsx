'use client';

import { useEffect, useState, use } from 'react';
import { API_BASE } from '@/lib/api';

interface PassportData {
    patient_name: string;
    generated_at: string;
    version: string;
    expires_at: number;
    remaining_seconds: number;
    last_3_diagnoses?: Array<{ name: string; date: string; status: string }>;
    active_medications?: Array<{ name: string; dose: string; frequency: string; active: boolean }>;
    allergies?: Array<{ allergen: string; severity: string; reaction: string }>;
    last_lab_values?: Record<string, any> | null;
    insurance_status?: Record<string, any> | null;
}

export default function PassportPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [data, setData] = useState<PassportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expired, setExpired] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        const fetchPassport = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/patient-passport/${token}`);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    if (res.status === 401) {
                        setExpired(true);
                        setError(errData.detail || 'Access expired or token already used');
                    } else {
                        setError(errData.detail || `Error: ${res.status}`);
                    }
                    return;
                }
                const result = await res.json();
                setData(result);
                setCountdown(result.remaining_seconds || 0);
            } catch (err: any) {
                setError('Failed to load passport data');
            } finally {
                setLoading(false);
            }
        };

        fetchPassport();
    }, [token]);

    // Countdown timer
    useEffect(() => {
        if (!data || countdown <= 0) return;

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setExpired(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [data, countdown]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 primary-gradient rounded-2xl flex items-center justify-center text-white animate-pulse">
                        <span className="material-symbols-outlined text-3xl">badge</span>
                    </div>
                    <div className="space-y-3">
                        <div className="h-6 bg-surface-container rounded-lg w-3/4 mx-auto animate-pulse"></div>
                        <div className="h-4 bg-surface-container rounded-lg w-1/2 mx-auto animate-pulse"></div>
                        <div className="h-32 bg-surface-container rounded-2xl w-full animate-pulse mt-6"></div>
                        <div className="h-32 bg-surface-container rounded-2xl w-full animate-pulse"></div>
                    </div>
                    <p className="text-tertiary font-semibold mt-8">Verifying secure access...</p>
                </div>
            </div>
        );
    }

    // Error state (non-expiry)
    if (error && !expired) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-error/10 rounded-2xl flex items-center justify-center text-error">
                        <span className="material-symbols-outlined text-3xl">error</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-on-surface font-headline mb-2">Access Error</h1>
                    <p className="text-tertiary">{error}</p>
                </div>
            </div>
        );
    }

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="min-h-screen bg-surface p-4 md:p-8">
            <div className="max-w-2xl mx-auto relative">
                {/* Expired Overlay */}
                {expired && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
                        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-sm w-full text-center mx-4">
                            <div className="w-20 h-20 mx-auto mb-6 bg-error/10 rounded-full flex items-center justify-center text-error">
                                <span className="material-symbols-outlined text-4xl">lock_clock</span>
                            </div>
                            <h2 className="text-2xl font-extrabold text-on-surface font-headline mb-2">Access Expired</h2>
                            <p className="text-tertiary mb-6">This passport link has expired or has already been used. Please request a new QR code from the patient.</p>
                            <div className="px-4 py-2 bg-surface-container rounded-full inline-flex items-center gap-2 text-sm font-bold text-tertiary">
                                <span className="material-symbols-outlined text-sm">security</span>
                                Protected by CuraTrack
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-on-surface font-headline tracking-tight">CuraTrack</h1>
                            <p className="text-[10px] text-tertiary uppercase tracking-widest font-bold">Patient Passport</p>
                        </div>
                    </div>

                    {/* Countdown Badge */}
                    {!expired && countdown > 0 && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                            countdown > 120 ? 'bg-secondary/10 text-secondary' :
                            countdown > 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-error-container text-error animate-pulse'
                        }`}>
                            <span className="material-symbols-outlined text-sm">timer</span>
                            {formatTime(countdown)}
                        </div>
                    )}
                </div>

                {/* Patient Card */}
                {data && (
                    <div className={`space-y-4 transition-all duration-500 ${expired ? 'blur-lg pointer-events-none select-none' : ''}`}>
                        {/* Patient Info Header */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">{data.patient_name}</h2>
                                    <p className="text-xs text-tertiary">
                                        Generated: {new Date(data.generated_at).toLocaleString()} • v{data.version}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg w-fit">
                                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                <span className="text-xs font-bold text-tertiary">Secure One-Time Access</span>
                            </div>
                        </div>

                        {/* Allergies — Red highlight */}
                        {data.allergies !== undefined && (
                            <div className={`rounded-3xl p-6 shadow-sm border ${
                                data.allergies.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-surface-container'
                            }`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`material-symbols-outlined ${data.allergies.length > 0 ? 'text-red-600' : 'text-tertiary'}`}>warning</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Allergies</h3>
                                    {data.allergies.length > 0 && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md tracking-tight">Critical</span>
                                    )}
                                </div>
                                {data.allergies.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.allergies.map((a, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white/80 rounded-2xl">
                                                <div>
                                                    <p className="font-bold text-red-800">{a.allergen}</p>
                                                    <p className="text-xs text-red-600">{a.reaction}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                    a.severity === 'Severe' ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-700'
                                                }`}>{a.severity}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No known allergies</p>
                                )}
                            </div>
                        )}

                        {/* Active Medications */}
                        {data.active_medications !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-amber-600">pill</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Active Medications</h3>
                                </div>
                                {data.active_medications.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.active_medications.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl">
                                                <div>
                                                    <p className="font-bold text-on-surface">{m.name}</p>
                                                    <p className="text-xs text-tertiary">{m.dose} • {m.frequency}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-secondary/10 text-secondary text-[10px] font-black uppercase rounded-lg">Active</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No active medications</p>
                                )}
                            </div>
                        )}

                        {/* Last 3 Diagnoses */}
                        {data.last_3_diagnoses !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-blue-600">clinical_notes</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Recent Diagnoses</h3>
                                </div>
                                {data.last_3_diagnoses.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.last_3_diagnoses.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl">
                                                <div>
                                                    <p className="font-bold text-on-surface">{d.name}</p>
                                                    <p className="text-xs text-tertiary">{d.date}</p>
                                                </div>
                                                <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${
                                                    d.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-tertiary'
                                                }`}>{d.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No diagnoses on record</p>
                                )}
                            </div>
                        )}

                        {/* Latest Vitals */}
                        {data.last_lab_values !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-pink-600">favorite</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Latest Vitals</h3>
                                </div>
                                {data.last_lab_values ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {data.last_lab_values.heart_rate && (
                                            <div className="p-3 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">Heart Rate</p>
                                                <p className="text-2xl font-extrabold text-on-surface">{data.last_lab_values.heart_rate.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.heart_rate.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.blood_pressure && (
                                            <div className="p-3 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">Blood Pressure</p>
                                                <p className="text-2xl font-extrabold text-on-surface">
                                                    {data.last_lab_values.blood_pressure.systolic}/{data.last_lab_values.blood_pressure.diastolic}
                                                </p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.blood_pressure.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.spo2 && (
                                            <div className="p-3 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">SpO2</p>
                                                <p className="text-2xl font-extrabold text-on-surface">{data.last_lab_values.spo2.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.spo2.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.temperature && (
                                            <div className="p-3 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">Temp</p>
                                                <p className="text-2xl font-extrabold text-on-surface">{data.last_lab_values.temperature.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.temperature.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.blood_glucose && (
                                            <div className="p-3 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">Glucose</p>
                                                <p className="text-2xl font-extrabold text-on-surface">{data.last_lab_values.blood_glucose.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.blood_glucose.unit}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No vitals data available</p>
                                )}
                            </div>
                        )}

                        {/* Insurance Status */}
                        {data.insurance_status !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-green-600">shield</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Insurance Status</h3>
                                </div>
                                {data.insurance_status ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary">Provider</span>
                                            <span className="font-bold text-on-surface">{data.insurance_status.provider}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary">Plan</span>
                                            <span className="font-bold text-on-surface">{data.insurance_status.plan}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary">Status</span>
                                            <span className={`px-2 py-1 text-xs font-black uppercase rounded-lg ${
                                                data.insurance_status.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>{data.insurance_status.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary">Member ID</span>
                                            <span className="font-mono font-bold text-on-surface text-sm">{data.insurance_status.member_id}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No insurance data available</p>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center py-6">
                            <div className="flex items-center justify-center gap-2 text-xs text-tertiary">
                                <span className="material-symbols-outlined text-sm">security</span>
                                Secured by CuraTrack • HIPAA Compliant • One-time access
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
