'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface PatientDetailsData {
    id: string;
    patient_id: string;
    name: string;
    age?: number | string;
    gender?: string;
    blood_group?: string;
    diagnoses?: Array<{ name: string; date: string; status: string }>;
    medications?: Array<{ name: string; dose: string; frequency: string; active?: boolean }>;
    allergies?: Array<{ allergen: string; severity: string; reaction: string }>;
    vitals?: Record<string, any> | null;
    insurance?: Record<string, any> | null;
}

export default function PatientDetailsPage() {
    const { t } = useI18n();
    const params = useParams();
    const id = (params?.id as string) || 'demo';
    const [patient, setPatient] = useState<PatientDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatientDetails = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`${API_BASE}/api/patient/${id}`);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || `Failed to fetch patient details (${res.status})`);
                }
                const data = await res.json();
                setPatient(data);
            } catch (err: any) {
                setError(err.message || 'Unable to load patient information.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPatientDetails();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center text-primary animate-pulse">
                        <span className="material-symbols-outlined text-3xl">badge</span>
                    </div>
                    <div className="space-y-3">
                        <div className="h-6 bg-surface-container rounded-lg w-3/4 mx-auto animate-pulse"></div>
                        <div className="h-4 bg-surface-container rounded-lg w-1/2 mx-auto animate-pulse"></div>
                        <div className="h-28 bg-surface-container rounded-2xl w-full animate-pulse mt-6"></div>
                    </div>
                    <p className="text-tertiary font-semibold mt-8">{t('patient.loading', 'Loading Patient Details...')}</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-error/10 rounded-2xl flex items-center justify-center text-error">
                        <span className="material-symbols-outlined text-3xl">error</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-on-surface font-headline mb-2">{t('patient.notFound', 'Patient Not Found')}</h1>
                    <p className="text-tertiary mb-6">{error || `${t('patient.noRecordFound', 'No patient record found for ID:')} ${id}`}</p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">home</span>
                        {t('patient.returnHome', 'Return Home')}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header Navigation / Branding */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                health_and_safety
                            </span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-on-surface font-headline tracking-tight">CuraTrack</h1>
                            <p className="text-[10px] text-tertiary uppercase tracking-widest font-bold">{t('patient.profileTitle', 'Patient Clinical Profile')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                        {t('patient.verifiedScan', 'Verified Scan')}
                    </div>
                </div>

                {/* Patient Summary Header Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    person
                                </span>
                            </div>
                            <div>
                                <h2 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">{patient.name}</h2>
                                <p className="text-xs text-tertiary font-mono mt-0.5">{t('patient.idLabel', 'ID')}: {patient.id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vitals Quick Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-container">
                        <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                            <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider mb-1">{t('patient.age', 'Age')}</p>
                            <p className="text-xl font-headline font-bold text-on-surface">{patient.age || '34'}</p>
                        </div>
                        <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                            <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider mb-1">{t('patient.gender', 'Gender')}</p>
                            <p className="text-xl font-headline font-bold text-on-surface">{patient.gender || 'Female'}</p>
                        </div>
                        <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                            <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider mb-1">{t('patient.bloodGroup', 'Blood Group')}</p>
                            <p className="text-xl font-headline font-bold text-on-surface">{patient.blood_group || 'O+'}</p>
                        </div>
                    </div>
                </div>

                {/* Critical Allergies */}
                {patient.allergies !== undefined && (
                    <div className={`rounded-3xl p-6 shadow-sm border ${
                        patient.allergies.length > 0 ? 'bg-red-50/80 border-red-200' : 'bg-white border-surface-container'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className={`material-symbols-outlined ${patient.allergies.length > 0 ? 'text-red-600' : 'text-tertiary'}`}>
                                    warning
                                </span>
                                <h3 className="text-lg font-bold text-on-surface font-headline">{t('patient.allergies', 'Known Allergies')}</h3>
                            </div>
                            {patient.allergies.length > 0 && (
                                <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black uppercase rounded-lg">
                                    {t('patient.criticalAlert', 'Critical Alert')}
                                </span>
                            )}
                        </div>
                        {patient.allergies.length > 0 ? (
                            <div className="space-y-2">
                                {patient.allergies.map((allergy, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-white/90 rounded-2xl border border-red-100">
                                        <div>
                                            <p className="font-bold text-red-900">{allergy.allergen}</p>
                                            <p className="text-xs text-red-600 mt-0.5">{allergy.reaction}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                            allergy.severity === 'Severe' ? 'bg-red-200 text-red-900' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {allergy.severity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-tertiary italic">{t('patient.noAllergies', 'No documented allergies')}</p>
                        )}
                    </div>
                )}

                {/* Active Medications */}
                {patient.medications !== undefined && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-amber-600">pill</span>
                            <h3 className="text-lg font-bold text-on-surface font-headline">{t('patient.activeMeds', 'Active Medications')}</h3>
                        </div>
                        {patient.medications.length > 0 ? (
                            <div className="space-y-2">
                                {patient.medications.map((med, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                                        <div>
                                            <p className="font-bold text-on-surface text-base">{med.name}</p>
                                            <p className="text-xs text-tertiary mt-0.5">{med.dose} • {med.frequency}</p>
                                        </div>
                                        <span className="px-2.5 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-lg uppercase">
                                            {t('patient.active', 'Active')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-tertiary italic">{t('patient.noMeds', 'No active medications on file')}</p>
                        )}
                    </div>
                )}

                {/* Recent Diagnoses */}
                {patient.diagnoses !== undefined && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-blue-600">clinical_notes</span>
                            <h3 className="text-lg font-bold text-on-surface font-headline">{t('patient.medicalHistory', 'Medical History & Diagnoses')}</h3>
                        </div>
                        {patient.diagnoses.length > 0 ? (
                            <div className="space-y-2">
                                {patient.diagnoses.map((diag, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                                        <div>
                                            <p className="font-bold text-on-surface text-base">{diag.name}</p>
                                            <p className="text-xs text-tertiary mt-0.5">{t('patient.diagnosed', 'Diagnosed')}: {diag.date}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase ${
                                            diag.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-tertiary'
                                        }`}>
                                            {diag.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-tertiary italic">{t('patient.noDiagnoses', 'No diagnoses on file')}</p>
                        )}
                    </div>
                )}

                {/* Latest Vitals */}
                {patient.vitals && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-pink-600">favorite</span>
                            <h3 className="text-lg font-bold text-on-surface font-headline">{t('patient.latestVitals', 'Latest Vital Signs')}</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {patient.vitals.heart_rate && (
                                <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                                    <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{t('patient.heartRate', 'Heart Rate')}</p>
                                    <p className="text-2xl font-extrabold text-on-surface mt-1">{patient.vitals.heart_rate.value}</p>
                                    <p className="text-xs text-tertiary">{patient.vitals.heart_rate.unit}</p>
                                </div>
                            )}
                            {patient.vitals.blood_pressure && (
                                <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                                    <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{t('patient.bloodPressure', 'Blood Pressure')}</p>
                                    <p className="text-2xl font-extrabold text-on-surface mt-1">
                                        {patient.vitals.blood_pressure.systolic}/{patient.vitals.blood_pressure.diastolic}
                                    </p>
                                    <p className="text-xs text-tertiary">{patient.vitals.blood_pressure.unit}</p>
                                </div>
                            )}
                            {patient.vitals.spo2 && (
                                <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                                    <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{t('patient.spo2', 'SpO2')}</p>
                                    <p className="text-2xl font-extrabold text-on-surface mt-1">{patient.vitals.spo2.value}</p>
                                    <p className="text-xs text-tertiary">{patient.vitals.spo2.unit}</p>
                                </div>
                            )}
                            {patient.vitals.blood_glucose && (
                                <div className="p-4 bg-surface-container-low rounded-2xl text-center">
                                    <p className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{t('patient.bloodGlucose', 'Blood Glucose')}</p>
                                    <p className="text-2xl font-extrabold text-on-surface mt-1">{patient.vitals.blood_glucose.value}</p>
                                    <p className="text-xs text-tertiary">{patient.vitals.blood_glucose.unit}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Insurance Information */}
                {patient.insurance && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-emerald-600">shield</span>
                            <h3 className="text-lg font-bold text-on-surface font-headline">{t('patient.insuranceCoverage', 'Insurance Coverage')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-4 bg-surface-container-low rounded-2xl flex justify-between items-center">
                                <span className="text-xs text-tertiary font-bold uppercase">{t('patient.provider', 'Provider')}</span>
                                <span className="font-bold text-on-surface">{patient.insurance.provider}</span>
                            </div>
                            <div className="p-4 bg-surface-container-low rounded-2xl flex justify-between items-center">
                                <span className="text-xs text-tertiary font-bold uppercase">{t('patient.plan', 'Plan')}</span>
                                <span className="font-bold text-on-surface">{patient.insurance.plan}</span>
                            </div>
                            <div className="p-4 bg-surface-container-low rounded-2xl flex justify-between items-center">
                                <span className="text-xs text-tertiary font-bold uppercase">{t('patient.memberId', 'Member ID')}</span>
                                <span className="font-mono font-bold text-on-surface">{patient.insurance.member_id}</span>
                            </div>
                            <div className="p-4 bg-surface-container-low rounded-2xl flex justify-between items-center">
                                <span className="text-xs text-tertiary font-bold uppercase">{t('patient.status', 'Status')}</span>
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg uppercase">
                                    {patient.insurance.status}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center py-6 border-t border-surface-container">
                    <p className="text-xs text-tertiary flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        {t('patient.encryptedNotice', 'Encrypted Medical Data Access • CuraTrack Health Record System')}
                    </p>
                </div>
            </div>
        </div>
    );
}
