'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch } from '@/lib/api';

export default function DigitalTriagePage() {
    const router = useRouter();
    const [categories, setCategories] = useState<Record<string, string[]>>({});
    const [redFlagList, setRedFlagList] = useState<string[]>([]);
    const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);

    // Form inputs
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
    const [severity, setSeverity] = useState<number>(4);
    const [durationDays, setDurationDays] = useState<number>(2);
    const [isPregnant, setIsPregnant] = useState<boolean>(false);
    const [patientAge, setPatientAge] = useState<number>(32);
    const [spo2, setSpo2] = useState<string>('98');
    const [heartRate, setHeartRate] = useState<string>('76');
    const [systolicBp, setSystolicBp] = useState<string>('120');
    const [temperature, setTemperature] = useState<string>('37.0');
    const [clinicalNotes, setClinicalNotes] = useState<string>('');

    // Assessment result
    const [evaluating, setEvaluating] = useState<boolean>(false);
    const [triageResult, setTriageResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>('Respiratory');

    useEffect(() => {
        const fetchTaxonomy = async () => {
            try {
                const data = await apiFetch('/api/triage/symptoms');
                if (data.categories) setCategories(data.categories);
                if (data.red_flags) setRedFlagList(data.red_flags);
            } catch (err) {
                console.warn('Failed to load symptom taxonomy from backend, using fallback:', err);
                setCategories({
                    "Respiratory": ["Persistent Cough (> 2 weeks)", "Shortness of breath on exertion", "Sore throat & difficulty swallowing", "Wheezing / Stridor", "Chest tightness"],
                    "Cardiovascular": ["Chest pain / Heavy pressure", "Palpitations / Rapid heartbeat", "Swelling in feet / ankles (Edema)", "Dizziness when standing"],
                    "Gastrointestinal": ["Acute Diarrhea (> 3 episodes/day)", "Severe abdominal pain / cramping", "Persistent nausea / vomiting", "Loss of appetite"],
                    "Neurological": ["Severe sudden onset headache", "Dizziness / Vertigo", "Numbness or weakness in limbs", "Confusion / Altered sensorium"],
                    "Maternal & Reproductive": ["Decreased fetal movements", "Severe lower abdominal pain during pregnancy", "Vaginal bleeding / discharge"],
                    "Pediatric & General": ["High fever (> 102°F)", "Fever with chills (Suspected Malaria/Dengue)", "Persistent body aches / Fatigue", "Severe dehydration"]
                });
                setRedFlagList([
                    "Severe central chest pain radiating to left arm or jaw",
                    "Extreme breathlessness at rest (Cannot speak full sentences)",
                    "Loss of consciousness or sudden confusion",
                    "SpO2 oxygen saturation below 92%",
                    "Severe uncontrolled bleeding",
                    "High fever with neck stiffness and sensitivity to light"
                ]);
            } finally {
                setLoadingTaxonomy(false);
            }
        };
        fetchTaxonomy();
    }, []);

    const toggleSymptom = (symptom: string) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptom]);
        }
    };

    const toggleRedFlag = (flag: string) => {
        if (selectedRedFlags.includes(flag)) {
            setSelectedRedFlags(selectedRedFlags.filter(f => f !== flag));
        } else {
            setSelectedRedFlags([...selectedRedFlags, flag]);
        }
    };

    const handleRunTriage = async (e: React.FormEvent) => {
        e.preventDefault();
        setEvaluating(true);
        try {
            const payload = {
                patient_name: "Patient User",
                age: Number(patientAge) || 32,
                pregnant: isPregnant,
                symptoms: selectedSymptoms,
                severity: Number(severity),
                duration_days: Number(durationDays),
                red_flags: selectedRedFlags,
                spo2: spo2 ? parseFloat(spo2) : undefined,
                heart_rate: heartRate ? parseFloat(heartRate) : undefined,
                systolic_bp: systolicBp ? parseFloat(systolicBp) : undefined,
                temperature: temperature ? parseFloat(temperature) : undefined,
                notes: clinicalNotes || undefined
            };

            const result = await apiFetch('/api/triage/assess', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setTriageResult(result);
        } catch (err: any) {
            console.error('Triage assessment error:', err);
            alert('Triage assessment failed: ' + (err.message || 'Check network'));
        } finally {
            setEvaluating(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-primary via-[#004d40] to-teal-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
                            <span className="material-symbols-outlined text-sm">clinical_notes</span>
                            <span>Clinical Protocol • Primary Healthcare Hierarchy</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Smart Clinical Triage & Facility Routing</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/telemedicine"
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">videocam</span>
                            <span>Direct Teleconsult</span>
                        </Link>
                        <Link
                            href="/referrals"
                            className="bg-teal-400 text-teal-950 hover:bg-teal-300 font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">alt_route</span>
                            <span>Referral Pipeline</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Red Flag Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2 font-bold text-sm text-red-800">
                    <span className="material-symbols-outlined text-xl text-red-600 animate-pulse">warning</span>
                    <span>Emergency Red-Flag Danger Signs (Instant 108 Ambulance Dispatch Tiers)</span>
                </div>
                <p className="text-xs text-red-700 mb-3">
                    If any of the following acute danger signs are present, mark them immediately for highest priority triage:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {redFlagList.map((flag, idx) => {
                        const isChecked = selectedRedFlags.includes(flag);
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => toggleRedFlag(flag)}
                                className={`text-left text-xs p-2.5 rounded-xl border flex items-start gap-2 transition-all ${
                                    isChecked
                                        ? 'bg-red-600 text-white border-red-700 shadow-md font-semibold'
                                        : 'bg-white text-red-900 border-red-200 hover:bg-red-100/60'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
                                    {isChecked ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                <span>{flag}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Input Column (7 cols) */}
                <form onSubmit={handleRunTriage} className="lg:col-span-7 space-y-6">
                    {/* Symptoms Selection by Category */}
                    <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-5">
                        <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
                            <div>
                                <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">symptoms</span>
                                    <span>Primary Symptoms Present</span>
                                </h2>
                                <p className="text-xs text-tertiary mt-0.5">Select all chief complaints reported by patient / ASHA worker</p>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                                {selectedSymptoms.length} selected
                            </span>
                        </div>

                        {/* Category Filter Tabs */}
                        <div className="flex flex-wrap gap-1.5 pb-2">
                            {Object.keys(categories).map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === cat
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Symptoms in active category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(categories[activeTab] || []).map((symptom) => {
                                const selected = selectedSymptoms.includes(symptom);
                                return (
                                    <button
                                        key={symptom}
                                        type="button"
                                        onClick={() => toggleSymptom(symptom)}
                                        className={`p-3 rounded-2xl text-left text-xs font-medium border flex items-center justify-between transition-all ${
                                            selected
                                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                                                : 'bg-surface-container-low border-transparent text-on-surface hover:bg-surface-container'
                                        }`}
                                    >
                                        <span>{symptom}</span>
                                        <span className="material-symbols-outlined text-base">
                                            {selected ? 'check_circle' : 'add_circle'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Vitals, Severity & Duration */}
                    <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-5">
                        <h2 className="font-bold text-base text-on-surface flex items-center gap-2 border-b border-surface-container-high pb-4">
                            <span className="material-symbols-outlined text-primary">vital_signs</span>
                            <span>Clinical Severity & Objective Telemetry</span>
                        </h2>

                        {/* Severity Slider */}
                        <div>
                            <div className="flex justify-between items-center text-xs mb-2">
                                <span className="font-semibold text-on-surface-variant">Symptom Severity / Distress Score: <strong>{severity} / 10</strong></span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                    severity >= 7 ? 'bg-red-100 text-red-700' : severity >= 4 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                    {severity >= 8 ? 'Critical Distress' : severity >= 6 ? 'Severe Pain / Discomfort' : severity >= 4 ? 'Moderate' : 'Mild'}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={severity}
                                onChange={(e) => setSeverity(parseInt(e.target.value))}
                                className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Age, Duration, Pregnant */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Patient Age</label>
                                <input
                                    type="number"
                                    value={patientAge}
                                    onChange={(e) => setPatientAge(parseInt(e.target.value))}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-tertiary mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={durationDays}
                                    onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-xl border border-surface-container-high cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPregnant}
                                        onChange={(e) => setIsPregnant(e.target.checked)}
                                        className="accent-primary w-4 h-4 rounded"
                                    />
                                    <span className="text-xs font-semibold text-on-surface">Pregnant Patient</span>
                                </label>
                            </div>
                        </div>

                        {/* Vitals Telemetry Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div>
                                <label className="block text-[11px] font-semibold text-tertiary mb-1">SpO2 Oxygen (%)</label>
                                <input
                                    type="number"
                                    placeholder="98"
                                    value={spo2}
                                    onChange={(e) => setSpo2(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-tertiary mb-1">Heart Rate (BPM)</label>
                                <input
                                    type="number"
                                    placeholder="76"
                                    value={heartRate}
                                    onChange={(e) => setHeartRate(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-tertiary mb-1">Systolic BP (mmHg)</label>
                                <input
                                    type="number"
                                    placeholder="120"
                                    value={systolicBp}
                                    onChange={(e) => setSystolicBp(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-tertiary mb-1">Temp (°C / °F)</label>
                                <input
                                    type="text"
                                    placeholder="37.0"
                                    value={temperature}
                                    onChange={(e) => setTemperature(e.target.value)}
                                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={evaluating}
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {evaluating ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                    <span>Evaluating Clinical Algorithm...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">ecg_heart</span>
                                    <span>Run Clinical Triage Assessment</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Triage Results Column (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {triageResult ? (
                        <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-xl space-y-6 animate-in fade-in duration-300">
                            {/* Urgency Badge Header */}
                            <div className={`p-5 rounded-2xl flex items-center gap-4 ${
                                triageResult.urgency === 'RED'
                                    ? 'bg-red-600 text-white'
                                    : triageResult.urgency === 'YELLOW'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-emerald-600 text-white'
                            }`}>
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-2xl">
                                        {triageResult.urgency === 'RED' ? 'e911_emergency' : triageResult.urgency === 'YELLOW' ? 'warning' : 'health_and_safety'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-90 block">Triage Classification</span>
                                    <h3 className="text-lg font-black">{triageResult.urgency_label}</h3>
                                </div>
                            </div>

                            {/* Recommended Facility */}
                            <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container">
                                <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Recommended Care Facility</span>
                                <p className="text-sm font-extrabold text-on-surface mt-1 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-primary text-lg">apartment</span>
                                    <span>{triageResult.recommended_facility}</span>
                                </p>
                            </div>

                            {/* Potential Diagnoses */}
                            {triageResult.potential_conditions && triageResult.potential_conditions.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-2">Differential Indications</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {triageResult.potential_conditions.map((cond: string, idx: number) => (
                                            <span key={idx} className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-xl">
                                                {cond}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Immediate Clinical Actions */}
                            {triageResult.immediate_actions && triageResult.immediate_actions.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-2">Immediate Protocol Checklist</h4>
                                    <div className="space-y-2">
                                        {triageResult.immediate_actions.map((act: string, idx: number) => (
                                            <div key={idx} className="p-3 bg-surface-container-low rounded-xl text-xs flex items-start gap-2 text-on-surface">
                                                <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">check_circle</span>
                                                <span className="font-medium leading-relaxed">{act}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action CTA Buttons */}
                            <div className="space-y-2 pt-2 border-t border-surface-container-high">
                                {triageResult.urgency === 'RED' ? (
                                    <a
                                        href="tel:108"
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-lg">emergency</span>
                                        <span>Dispatch 108 Emergency Ambulance</span>
                                    </a>
                                ) : (
                                    <Link
                                        href="/telemedicine"
                                        className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-lg">video_call</span>
                                        <span>Start Assisted Teleconsultation</span>
                                    </Link>
                                )}

                                <Link
                                    href="/referrals"
                                    className="w-full py-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">forward_to_inbox</span>
                                    <span>Create Public Health Referral Pass</span>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-8 border border-dashed border-surface-container-high text-center flex flex-col items-center justify-center min-h-[380px] shadow-sm">
                            <div className="w-16 h-16 rounded-2xl bg-surface-container text-tertiary flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">stethoscope</span>
                            </div>
                            <h3 className="text-base font-bold text-on-surface">Triage Assessment Ready</h3>
                            <p className="text-xs text-tertiary mt-1.5 max-w-xs leading-relaxed">
                                Select patient symptoms, danger signs, and vital signs on the left, then click <strong>Run Clinical Triage</strong> to calculate urgency and recommended care tiers.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
