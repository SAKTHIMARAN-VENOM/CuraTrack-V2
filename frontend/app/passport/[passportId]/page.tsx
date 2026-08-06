'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';

interface PassportData {
    passport_id?: string;
    patient_name: string;
    generated_at: string;
    version: string;
    expires_at: number;
    remaining_seconds: number;
    emergency_contact?: { name: string; relation: string; phone: string };
    last_3_diagnoses?: Array<{ name: string; date: string; status: string }>;
    active_medications?: Array<{ name: string; dose: string; frequency: string; active: boolean }>;
    allergies?: Array<{ allergen: string; severity: string; reaction: string }>;
    last_lab_values?: Record<string, any> | null;
    insurance_status?: Record<string, any> | null;
}

export default function PassportViewPage({
    params,
}: {
    params: Promise<{ passportId: string }>;
}) {
    const { passportId } = use(params);
    const searchParams = useSearchParams();
    const tokenQueryParam = searchParams.get('token');

    const [data, setData] = useState<PassportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expired, setExpired] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        const fetchPassport = async () => {
            try {
                // Query parameter token takes precedence, fallback to path parameter
                const targetToken = tokenQueryParam || passportId;
                const endpoint = `${API_BASE}/api/passport/${passportId}?token=${encodeURIComponent(targetToken)}`;

                const res = await fetch(endpoint);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    if (res.status === 401) {
                        setExpired(true);
                        setError(errData.detail || 'This passport link has expired or has already been used.');
                    } else {
                        setError(errData.detail || `Error loading passport (${res.status})`);
                    }
                    return;
                }
                const result = await res.json();
                setData(result);
                setCountdown(result.remaining_seconds || 0);
            } catch (err: any) {
                setError('Failed to connect to passport service.');
            } finally {
                setLoading(false);
            }
        };

        fetchPassport();
    }, [passportId, tokenQueryParam]);

    // Countdown timer
    useEffect(() => {
        if (!data || countdown <= 0) return;

        const interval = setInterval(() => {
            setCountdown((prev) => {
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

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 primary-gradient rounded-2xl flex items-center justify-center text-white animate-pulse">
                        <span className="material-symbols-outlined text-3xl">verified_user</span>
                    </div>
                    <div className="space-y-3">
                        <div className="h-6 bg-surface-container rounded-lg w-3/4 mx-auto animate-pulse"></div>
                        <div className="h-4 bg-surface-container rounded-lg w-1/2 mx-auto animate-pulse"></div>
                        <div className="h-28 bg-surface-container rounded-2xl w-full animate-pulse mt-6"></div>
                        <div className="h-28 bg-surface-container rounded-2xl w-full animate-pulse"></div>
                    </div>
                    <p className="text-tertiary font-semibold mt-8 text-sm">Verifying one-time secure passport link...</p>
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
                        <span className="material-symbols-outlined text-3xl">gpp_maybe</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-on-surface font-headline mb-2">Access Error</h1>
                    <p className="text-tertiary mb-6">{error}</p>
                    <div className="px-4 py-2 bg-surface-container rounded-full inline-flex items-center gap-2 text-xs font-bold text-tertiary">
                        <span className="material-symbols-outlined text-sm">shield</span>
                        CuraTrack Security Policy Enforced
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface p-4 md:p-8">
            <div className="max-w-2xl mx-auto relative">
                {/* Expired or Used Overlay */}
                {expired && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
                        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center mx-4 border border-surface-container">
                            <div className="w-20 h-20 mx-auto mb-6 bg-error/10 rounded-full flex items-center justify-center text-error">
                                <span className="material-symbols-outlined text-4xl">lock_clock</span>
                            </div>
                            <h2 className="text-2xl font-extrabold text-on-surface font-headline mb-2">Passport Unavailable</h2>
                            <p className="text-tertiary text-sm mb-6 leading-relaxed">
                                This passport has expired or has already been used. Please request a new QR code from the patient.
                            </p>
                            <div className="px-4 py-2.5 bg-surface-container-low rounded-xl inline-flex items-center gap-2 text-xs font-bold text-tertiary">
                                <span className="material-symbols-outlined text-sm text-primary">security</span>
                                One-Time Access Protection
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Branding & Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 primary-gradient rounded-2xl flex items-center justify-center text-white shadow-md shadow-primary/20">
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                local_hospital
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold text-on-surface font-headline tracking-tight">CuraTrack Hospital</h1>
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-md">
                                    Verified Secure Share
                                </span>
                            </div>
                            <p className="text-xs text-tertiary font-medium">Patient Medical Passport</p>
                        </div>
                    </div>

                    {/* Countdown Badge */}
                    {!expired && countdown > 0 && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm ${
                            countdown > 120 ? 'bg-secondary/10 text-secondary border border-secondary/20' :
                            countdown > 30 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-error-container text-error animate-pulse border border-error/30'
                        }`}>
                            <span className="material-symbols-outlined text-sm">timer</span>
                            {formatTime(countdown)}
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                {data && (
                    <div className={`space-y-5 transition-all duration-500 ${expired ? 'blur-md pointer-events-none select-none opacity-40' : ''}`}>
                        {/* Patient Overview Banner */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            person
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">
                                            {data.patient_name}
                                        </h2>
                                        <p className="text-xs text-tertiary mt-0.5">
                                            Issued: {new Date(data.generated_at).toLocaleString()} • Expires: {new Date(data.expires_at * 1000).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Active One-Time Access
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact (if shared) */}
                        {data.emergency_contact && (
                            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-amber-900">
                                    <span className="material-symbols-outlined text-xl">contact_emergency</span>
                                    <h3 className="font-extrabold text-sm font-headline">Emergency Contact</h3>
                                </div>
                                <div className="flex justify-between items-center text-sm font-semibold text-amber-950">
                                    <span>{data.emergency_contact.name} ({data.emergency_contact.relation})</span>
                                    <a href={`tel:${data.emergency_contact.phone}`} className="text-primary font-bold hover:underline">
                                        {data.emergency_contact.phone}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Allergies Card (Only rendered if permitted/scoped) */}
                        {data.allergies !== undefined && (
                            <div className={`rounded-3xl p-6 shadow-sm border ${
                                data.allergies.length > 0 ? 'bg-red-50/60 border-red-200' : 'bg-white border-surface-container'
                            }`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`material-symbols-outlined ${data.allergies.length > 0 ? 'text-red-600' : 'text-tertiary'}`}>
                                        warning
                                    </span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Allergies</h3>
                                    {data.allergies.length > 0 && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md tracking-tight">
                                            Critical Warning
                                        </span>
                                    )}
                                </div>
                                {data.allergies.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {data.allergies.map((a, i) => (
                                            <div key={i} className="flex items-center justify-between p-3.5 bg-white/90 rounded-2xl border border-red-100">
                                                <div>
                                                    <p className="font-bold text-red-950 text-sm">{a.allergen}</p>
                                                    <p className="text-xs text-red-700 mt-0.5">{a.reaction}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                    a.severity === 'Severe' ? 'bg-red-200 text-red-900' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {a.severity}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No known allergies on record.</p>
                                )}
                            </div>
                        )}

                        {/* Active Medications Card (Only rendered if permitted/scoped) */}
                        {data.active_medications !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-amber-600">pill</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Active Medications</h3>
                                </div>
                                {data.active_medications.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {data.active_medications.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-2xl">
                                                <div>
                                                    <p className="font-bold text-on-surface text-sm">{m.name}</p>
                                                    <p className="text-xs text-tertiary mt-0.5">{m.dose} • {m.frequency}</p>
                                                </div>
                                                <span className="px-2.5 py-1 bg-secondary/10 text-secondary text-[10px] font-black uppercase rounded-lg">
                                                    Active
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No active medications shared.</p>
                                )}
                            </div>
                        )}

                        {/* Latest Vitals Card (Only rendered if permitted/scoped) */}
                        {data.last_lab_values !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-pink-600">favorite</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Latest Vitals</h3>
                                </div>
                                {data.last_lab_values ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {data.last_lab_values.heart_rate && (
                                            <div className="p-3.5 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-extrabold uppercase tracking-wider">Heart Rate</p>
                                                <p className="text-2xl font-black text-on-surface mt-1">{data.last_lab_values.heart_rate.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.heart_rate.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.blood_pressure && (
                                            <div className="p-3.5 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-extrabold uppercase tracking-wider">Blood Pressure</p>
                                                <p className="text-2xl font-black text-on-surface mt-1">
                                                    {data.last_lab_values.blood_pressure.systolic}/{data.last_lab_values.blood_pressure.diastolic}
                                                </p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.blood_pressure.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.spo2 && (
                                            <div className="p-3.5 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-extrabold uppercase tracking-wider">SpO2</p>
                                                <p className="text-2xl font-black text-on-surface mt-1">{data.last_lab_values.spo2.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.spo2.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.temperature && (
                                            <div className="p-3.5 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-extrabold uppercase tracking-wider">Temp</p>
                                                <p className="text-2xl font-black text-on-surface mt-1">{data.last_lab_values.temperature.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.temperature.unit}</p>
                                            </div>
                                        )}
                                        {data.last_lab_values.blood_glucose && (
                                            <div className="p-3.5 bg-surface-container-low rounded-2xl text-center">
                                                <p className="text-[10px] text-tertiary font-extrabold uppercase tracking-wider">Glucose</p>
                                                <p className="text-2xl font-black text-on-surface mt-1">{data.last_lab_values.blood_glucose.value}</p>
                                                <p className="text-xs text-tertiary">{data.last_lab_values.blood_glucose.unit}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No vitals data shared.</p>
                                )}
                            </div>
                        )}

                        {/* Recent Diagnoses Card (Only rendered if permitted/scoped) */}
                        {data.last_3_diagnoses !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-blue-600">clinical_notes</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Recent Diagnoses</h3>
                                </div>
                                {data.last_3_diagnoses.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {data.last_3_diagnoses.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-2xl">
                                                <div>
                                                    <p className="font-bold text-on-surface text-sm">{d.name}</p>
                                                    <p className="text-xs text-tertiary mt-0.5">{d.date}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg ${
                                                    d.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-tertiary'
                                                }`}>
                                                    {d.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No diagnoses shared.</p>
                                )}
                            </div>
                        )}

                        {/* Insurance Status Card (Only rendered if permitted/scoped) */}
                        {data.insurance_status !== undefined && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-green-600">shield</span>
                                    <h3 className="text-lg font-bold text-on-surface font-headline">Insurance Status</h3>
                                </div>
                                {data.insurance_status ? (
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center p-3.5 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary font-medium">Provider</span>
                                            <span className="font-bold text-on-surface text-sm">{data.insurance_status.provider}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary font-medium">Plan</span>
                                            <span className="font-bold text-on-surface text-sm">{data.insurance_status.plan}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary font-medium">Status</span>
                                            <span className={`px-2.5 py-1 text-xs font-black uppercase rounded-lg ${
                                                data.insurance_status.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {data.insurance_status.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3.5 bg-surface-container-low rounded-2xl">
                                            <span className="text-sm text-tertiary font-medium">Member ID</span>
                                            <span className="font-mono font-bold text-on-surface text-sm">{data.insurance_status.member_id}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary italic">No insurance data shared.</p>
                                )}
                            </div>
                        )}

                        {/* Footer Security Stamp */}
                        <div className="text-center py-6">
                            <div className="flex items-center justify-center gap-2 text-xs text-tertiary font-medium">
                                <span className="material-symbols-outlined text-sm text-primary">verified</span>
                                Secured by CuraTrack • HIPAA Data Isolation • One-Time Verification
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
