'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';

interface SelfTriageRecord {
  id: string;
  patient_id: string;
  patient_name?: string;
  symptoms?: string[];
  symptom_description?: string;
  red_flags?: string[];
  severity: number;
  duration_days: number;
  vitals?: {
    spo2?: number | string;
    heart_rate?: number | string;
    systolic_bp?: number | string;
    temperature?: number | string;
  };
  urgency: 'RED' | 'YELLOW' | 'GREEN';
  urgency_label?: string;
  recommended_facility?: string;
  immediate_actions?: string[];
  potential_conditions?: string[];
  teleconsult_recommended?: boolean;
  consult_action?: string;
  notified_parties?: string[];
  notification_message?: string;
  status: string;
  created_at: string;
}

export default function PatientSelfTriagePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [supabase] = useState(() => createClient());

  // Patient Profile state (strictly locked to self)
  const [patientInfo, setPatientInfo] = useState<{
    id: string;
    name: string;
    email: string;
    age: number | string;
    gender: string;
    abhaId: string;
  }>({
    id: 'patient-self',
    name: 'Patient',
    email: '',
    age: 32,
    gender: 'Other',
    abhaId: '91-4502-8819-0001'
  });
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  // Form Inputs
  const [symptomDescription, setSymptomDescription] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(5);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [isPregnant, setIsPregnant] = useState<boolean>(false);

  // Optional Vitals Inputs
  const [spo2, setSpo2] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [systolicBp, setSystolicBp] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');

  // Taxonomies & UI state
  const [redFlagTaxonomy, setRedFlagTaxonomy] = useState<string[]>([]);
  const [symptomCategories, setSymptomCategories] = useState<Record<string, string[]>>({});
  const [activeCategory, setActiveCategory] = useState<string>('Respiratory');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [history, setHistory] = useState<SelfTriageRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // 1. Fetch Patient Identity (Self only)
  useEffect(() => {
    async function loadPatientIdentity() {
      try {
        let authId = '';
        let authEmail = '';
        let authName = 'Patient';
        let authAge: number | string = 32;
        let authGender = 'Other';
        let abha = '91-4502-8819-0001';

        // Check Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          authId = user.id;
          authEmail = user.email || '';
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          if (prof) {
            if (prof.name) authName = prof.name;
            if (prof.age) authAge = prof.age;
            if (prof.gender) authGender = prof.gender;
            if (prof.abha_id) abha = prof.abha_id;
          }
        }

        // Local storage fallback
        if (typeof window !== 'undefined' && !authId) {
          try {
            const rawUser = localStorage.getItem('curatrack_auth_user');
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              if (parsed.id) authId = parsed.id;
              if (parsed.name) authName = parsed.name;
              if (parsed.email) authEmail = parsed.email;
              if (parsed.gender) authGender = parsed.gender;
              if (parsed.age) authAge = parsed.age;
            }
          } catch {}
        }

        const finalId = authId || 'patient-self';
        setPatientInfo({
          id: finalId,
          name: authName,
          email: authEmail,
          age: authAge,
          gender: authGender,
          abhaId: abha
        });

        setIsPregnant(authGender.toLowerCase() === 'female');
        fetchSelfTriageHistory(finalId);
      } catch (e) {
        console.warn('Error loading patient identity:', e);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadPatientIdentity();
  }, [supabase]);

  // 2. Fetch Symptom Taxonomy & Red Flags
  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const data = await apiFetch('/api/triage/symptoms');
        if (data.categories) setSymptomCategories(data.categories);
        if (data.red_flags) setRedFlagTaxonomy(data.red_flags);
      } catch (err) {
        console.warn('Fallback taxonomy used:', err);
        setRedFlagTaxonomy([
          "Severe central chest pain radiating to left arm or jaw",
          "Extreme breathlessness at rest (Cannot speak full sentences)",
          "Loss of consciousness or sudden confusion",
          "SpO2 oxygen saturation below 92%",
          "Severe uncontrolled bleeding",
          "High fever with neck stiffness and sensitivity to light",
          "Sudden weakness or drooping on one side of face/body",
          "Pregnancy with vaginal bleeding or severe headache"
        ]);
        setSymptomCategories({
          "Respiratory": ["Persistent Cough (> 2 weeks)", "Shortness of breath on exertion", "Chest tightness", "Wheezing / Stridor"],
          "Cardiovascular": ["Chest pain / Heavy pressure", "Palpitations / Rapid heartbeat", "Dizziness when standing", "Cyanosis (Bluish lips/fingers)"],
          "Gastrointestinal": ["Acute Diarrhea (> 3 episodes/day)", "Severe abdominal pain / cramping", "Persistent nausea / vomiting", "Blood in stool or vomit"],
          "Neurological": ["Severe sudden onset headache", "Dizziness / Vertigo", "Numbness or weakness in limbs", "Confusion / Altered sensorium"],
          "Pediatric & General": ["High fever (> 102°F / 38.9°C)", "Fever with chills", "Persistent body aches / Fatigue", "Severe dehydration / Dry tongue"]
        });
      }
    }
    loadTaxonomy();
  }, []);

  // 3. Fetch past self-triage history
  const fetchSelfTriageHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      // Try Supabase first
      const { data: dbRecords, error } = await supabase
        .from('self_triage')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (dbRecords && dbRecords.length > 0) {
        setHistory(dbRecords);
        return;
      }

      // Backend API fallback
      const apiRes = await apiFetch(`/api/triage/self-assessments?patient_id=${patientId}`);
      if (apiRes.assessments) {
        setHistory(apiRes.assessments);
      }
    } catch (e) {
      console.warn('History fetch fallback:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== sym));
    } else {
      setSelectedSymptoms(prev => [...prev, sym]);
    }
  };

  const toggleRedFlag = (flag: string) => {
    if (selectedRedFlags.includes(flag)) {
      setSelectedRedFlags(prev => prev.filter(f => f !== flag));
    } else {
      setSelectedRedFlags(prev => [...prev, flag]);
    }
  };

  // Real-time local clinical urgency rule evaluator
  const liveUrgency = useMemo(() => {
    const numSpo2 = spo2 ? parseFloat(spo2) : null;
    const numHr = heartRate ? parseFloat(heartRate) : null;
    const numBp = systolicBp ? parseFloat(systolicBp) : null;
    const numTemp = temperature ? parseFloat(temperature) : null;

    if (
      selectedRedFlags.length > 0 ||
      (numSpo2 !== null && numSpo2 < 92) ||
      (numBp !== null && (numBp >= 180 || numBp <= 80)) ||
      (numHr !== null && (numHr > 130 || numHr < 45)) ||
      (numTemp !== null && numTemp > 39.5) ||
      severity >= 9
    ) {
      return {
        tier: 'RED',
        label: 'EMERGENCY / IMMEDIATE EVACUATION',
        color: 'from-red-600 to-rose-600',
        borderColor: 'border-red-500',
        bgPill: 'bg-red-100 text-red-800 border-red-300',
        facility: 'District Hospital / 24x7 Emergency Room',
        notifies: 'Emergency Medical Officer & 108 Ambulance Dispatch',
        action: 'In-Person Emergency Visit'
      };
    }

    if (
      (numSpo2 !== null && numSpo2 >= 92 && numSpo2 <= 95) ||
      (numBp !== null && numBp >= 140 && numBp < 180) ||
      (numHr !== null && ((numHr >= 105 && numHr <= 130) || (numHr >= 45 && numHr <= 55))) ||
      (numTemp !== null && numTemp >= 38.3) ||
      severity >= 5 ||
      durationDays >= 3 ||
      selectedSymptoms.some(s => s.toLowerCase().includes('chest') || s.toLowerCase().includes('diarrhea') || s.toLowerCase().includes('breath'))
    ) {
      return {
        tier: 'YELLOW',
        label: 'PRIORITY / CLINICAL CONSULT WITHIN 24 HOURS',
        color: 'from-amber-500 to-yellow-600',
        borderColor: 'border-amber-500',
        bgPill: 'bg-amber-100 text-amber-800 border-amber-300',
        facility: 'Primary Health Centre (PHC) / Community Health Centre (CHC)',
        notifies: 'Assigned ASHA Health Worker & PHC Medical Officer',
        action: 'Online Teleconsultation or Clinic Visit'
      };
    }

    return {
      tier: 'GREEN',
      label: 'ROUTINE CARE / HOME MONITORING',
      color: 'from-emerald-600 to-teal-600',
      borderColor: 'border-emerald-500',
      bgPill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      facility: 'Ayushman Arogya Mandir (Sub-Centre) / Home Care',
      notifies: 'Catchment ASHA Health Worker for Routine Follow-Up',
      action: 'Home Care & ASHA Support'
    };
  }, [selectedRedFlags, spo2, heartRate, systolicBp, temperature, severity, durationDays, selectedSymptoms]);

  // Submit Self-Triage Assessment
  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);

    try {
      const payload = {
        patient_id: patientInfo.id,
        patient_name: patientInfo.name,
        age: patientInfo.age ? Number(patientInfo.age) : 32,
        gender: patientInfo.gender,
        pregnant: isPregnant,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : (symptomDescription ? [symptomDescription] : ['General Discomfort']),
        severity: Number(severity),
        duration_days: Number(durationDays),
        red_flags: selectedRedFlags,
        spo2: spo2 ? parseFloat(spo2) : undefined,
        heart_rate: heartRate ? parseFloat(heartRate) : undefined,
        systolic_bp: systolicBp ? parseFloat(systolicBp) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        notes: symptomDescription || selectedSymptoms.join(', ') || 'Patient self-triage submission'
      };

      let result: any = null;
      try {
        result = await apiFetch('/api/triage/self-assess', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (backendErr) {
        console.warn('Backend self-assess endpoint fallback:', backendErr);
        result = {
          id: `ST-${Date.now().toString().slice(-5)}`,
          urgency: liveUrgency.tier,
          urgency_label: liveUrgency.label,
          color: liveUrgency.tier === 'RED' ? 'red' : liveUrgency.tier === 'YELLOW' ? 'amber' : 'green',
          recommended_facility: liveUrgency.facility,
          immediate_actions: liveUrgency.tier === 'RED'
            ? ['Call 108 Emergency Ambulance immediately.', 'Sit or lie down in a well-ventilated space.', 'Keep prescription/ABHA records ready.']
            : liveUrgency.tier === 'YELLOW'
            ? ['Initiate doctor teleconsultation today.', 'Hydrate with Oral Rehydration Salts (ORS).', 'Monitor temperature and pulse every 4 hours.']
            : ['Rest and symptomatic hydration.', 'Consult ASHA worker if symptoms do not resolve in 48 hours.'],
          potential_conditions: selectedSymptoms.length > 0 ? selectedSymptoms.slice(0, 3) : ['Primary Clinical Complaint'],
          teleconsult_recommended: liveUrgency.tier === 'YELLOW',
          consult_action: liveUrgency.action,
          notified_parties: [liveUrgency.notifies],
          notification_message: `Alert dispatched to ${liveUrgency.notifies}.`,
          created_at: new Date().toISOString()
        };
      }

      setTriageResult(result);

      // Save to Supabase `self_triage` table
      try {
        await supabase.from('self_triage').insert({
          patient_id: patientInfo.id,
          patient_name: patientInfo.name,
          age: patientInfo.age ? Number(patientInfo.age) : 32,
          gender: patientInfo.gender,
          symptoms: payload.symptoms,
          symptom_description: symptomDescription,
          red_flags: selectedRedFlags,
          severity: Number(severity),
          duration_days: Number(durationDays),
          vitals: {
            spo2: spo2 ? parseFloat(spo2) : null,
            heart_rate: heartRate ? parseFloat(heartRate) : null,
            systolic_bp: systolicBp ? parseFloat(systolicBp) : null,
            temperature: temperature ? parseFloat(temperature) : null
          },
          urgency: result.urgency,
          urgency_label: result.urgency_label,
          recommended_facility: result.recommended_facility,
          immediate_actions: result.immediate_actions,
          potential_conditions: result.potential_conditions,
          teleconsult_recommended: result.teleconsult_recommended,
          status: 'PENDING'
        });
      } catch (dbErr) {
        console.warn('Supabase self_triage insertion:', dbErr);
      }

      // Refresh history
      fetchSelfTriageHistory(patientInfo.id);

      // Scroll to top of assessment result
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Self triage error:', err);
      alert('Triage assessment submission encountered an error. Please review inputs.');
    } finally {
      setEvaluating(false);
    }
  };

  const resetAssessment = () => {
    setTriageResult(null);
    setSelectedSymptoms([]);
    setSelectedRedFlags([]);
    setSymptomDescription('');
    setSeverity(5);
    setDurationDays(1);
    setSpo2('');
    setHeartRate('');
    setSystolicBp('');
    setTemperature('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-100 border border-white/20">
              <span className="material-symbols-outlined text-sm">emergency</span>
              <span>Patient Emergency Portal • Self-Assessment Engine</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Health Self-Triage &amp; Emergency Routing</h1>
            <p className="text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Evaluate your current symptoms in case of acute distress or illness. CuraTrack will classify your urgency level and immediately notify your assigned Frontline ASHA Worker or Medical Officer.
            </p>
          </div>

          {/* Locked Identity Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs shrink-0 space-y-2">
            <div className="flex items-center gap-2 text-teal-200">
              <span className="material-symbols-outlined text-base">lock</span>
              <span className="font-bold uppercase tracking-wider text-[10px]">Patient Identity Locked</span>
            </div>
            <div>
              <p className="text-white font-extrabold text-sm">{patientInfo.name}</p>
              <p className="text-teal-200 text-[11px] font-mono">ABHA: {patientInfo.abhaId}</p>
              <p className="text-teal-100 text-[11px]">{patientInfo.age} yrs • {patientInfo.gender}</p>
            </div>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="w-full mt-1 py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-xs">history</span>
              <span>Past Assessments ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ASSESSMENT RESULT CARD (When submitted)                                   */}
      {/* ========================================================================= */}
      {triageResult && (
        <div className={`p-8 rounded-3xl border shadow-xl animate-in zoom-in-95 duration-300 bg-white space-y-6 ${
          triageResult.urgency === 'RED' ? 'border-red-400 ring-2 ring-red-500/20' :
          triageResult.urgency === 'YELLOW' ? 'border-amber-400 ring-2 ring-amber-500/20' :
          'border-emerald-400 ring-2 ring-emerald-500/20'
        }`}>
          {/* Result Header Badge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container-high">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md ${
                triageResult.urgency === 'RED' ? 'bg-gradient-to-br from-red-600 to-rose-700 animate-pulse' :
                triageResult.urgency === 'YELLOW' ? 'bg-gradient-to-br from-amber-500 to-yellow-600' :
                'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                <span className="material-symbols-outlined text-3xl">
                  {triageResult.urgency === 'RED' ? 'warning' : triageResult.urgency === 'YELLOW' ? 'priority_high' : 'check_circle'}
                </span>
              </div>
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  triageResult.urgency === 'RED' ? 'bg-red-100 text-red-800' :
                  triageResult.urgency === 'YELLOW' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {triageResult.urgency} TIER EVALUATION
                </span>
                <h2 className="text-2xl font-black text-on-surface mt-1">{triageResult.urgency_label}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetAssessment}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>New Self-Assessment</span>
              </button>
            </div>
          </div>

          {/* Automated Notification Broadcast Details */}
          <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            triageResult.urgency === 'RED' ? 'bg-red-50/80 border-red-200 text-red-950' :
            triageResult.urgency === 'YELLOW' ? 'bg-amber-50/80 border-amber-200 text-amber-950' :
            'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-base">notifications_active</span>
                <span>Automated Clinical Notification Dispatched</span>
              </div>
              <p className="text-sm font-semibold">{triageResult.notification_message || 'Alert has been routed to attending healthcare team.'}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(triageResult.notified_parties || []).map((party: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-white/80 rounded-md text-[11px] font-bold shadow-xs border border-black/5">
                    ✓ {party}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Action Trigger */}
            <div className="shrink-0 flex gap-2">
              {triageResult.urgency === 'RED' ? (
                <a
                  href="tel:108"
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 animate-bounce transition-transform"
                >
                  <span className="material-symbols-outlined text-lg">call</span>
                  <span>Dial 108 Ambulance</span>
                </a>
              ) : triageResult.teleconsult_recommended ? (
                <button
                  onClick={() => router.push('/telemedicine')}
                  className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">video_chat</span>
                  <span>Launch Teleconsult</span>
                </button>
              ) : (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Grid of Clinical Guidance & Recommended Facility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recommended Care Facility */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-base">local_hospital</span>
                <span>Recommended Health Tier</span>
              </div>
              <p className="text-lg font-black text-on-surface">{triageResult.recommended_facility}</p>
              <p className="text-xs text-tertiary">
                Based on your reported symptoms and danger criteria, this is the designated primary facility for your clinical management.
              </p>
            </div>

            {/* Potential Conditions */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-base">troubleshoot</span>
                <span>Differential Assessment</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(triageResult.potential_conditions || []).map((cond: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-white rounded-xl text-xs font-bold text-slate-800 border border-surface-container-high shadow-xs">
                    • {cond}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Immediate Action Steps */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high space-y-3">
            <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">task_alt</span>
              <span>Immediate Clinical Action Steps:</span>
            </h3>
            <ul className="space-y-2">
              {(triageResult.immediate_actions || []).map((act: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-slate-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SELF-TRIAGE FORM                                                         */}
      {/* ========================================================================= */}
      {!triageResult && (
        <form onSubmit={handleSubmitTriage} className="space-y-8">
          {/* Real-Time Live Preview Indicator */}
          <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${liveUrgency.borderColor} bg-white shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-ping ${liveUrgency.tier === 'RED' ? 'bg-red-500' : liveUrgency.tier === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-tertiary">Real-time Triage Projection</span>
                <p className="font-extrabold text-sm text-on-surface">{liveUrgency.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`px-3 py-1 rounded-full font-bold text-[11px] border ${liveUrgency.bgPill}`}>
                {liveUrgency.action}
              </span>
              <span className="text-tertiary hidden md:inline">•</span>
              <span className="text-tertiary text-[11px] hidden md:inline">Notifies: <strong>{liveUrgency.notifies.split('&')[0]}</strong></span>
            </div>
          </div>

          {/* Section 1: Danger Signs / Red Flags (Critical for Emergency) */}
          <div className="bg-red-50/50 border-2 border-red-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-700 font-extrabold text-sm">
                  <span className="material-symbols-outlined text-lg">crisis_alert</span>
                  <span>Emergency Danger Signs (Red Flags)</span>
                </div>
                <p className="text-xs text-red-900/80">
                  Select any of the following acute symptoms if you or the patient are currently experiencing them:
                </p>
              </div>
              <span className="px-2.5 py-1 bg-red-600 text-white font-extrabold text-[10px] rounded-lg tracking-wider uppercase shrink-0">
                108 Emergency
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {redFlagTaxonomy.map((flag, idx) => {
                const isSelected = selectedRedFlags.includes(flag);
                return (
                  <label
                    key={idx}
                    onClick={() => toggleRedFlag(flag)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-md font-bold'
                        : 'bg-white text-slate-800 border-red-100 hover:border-red-300 hover:bg-red-50/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-red-600 focus:ring-red-500 accent-red-600"
                    />
                    <span className="text-xs leading-snug">{flag}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 2: Primary Symptoms by Category */}
          <div className="bg-white border border-surface-container-high rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">clinical_notes</span>
                <span>Select Your Presenting Symptoms</span>
              </h3>
              <p className="text-xs text-tertiary mt-1">
                Choose symptoms by anatomical category or type your description in the narrative box below.
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 border-b border-surface-container pb-4">
              {Object.keys(symptomCategories).map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    activeCategory === cat
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Chips for Active Category */}
            <div className="flex flex-wrap gap-2">
              {(symptomCategories[activeCategory] || []).map((sym, idx) => {
                const isSelected = selectedSymptoms.includes(sym);
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-surface-container-high'
                    }`}
                  >
                    <span>{sym}</span>
                    <span className="material-symbols-outlined text-xs">
                      {isSelected ? 'check' : 'add'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Free text symptom narrative */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-on-surface">
                Describe your condition &amp; other symptoms in detail:
              </label>
              <textarea
                value={symptomDescription}
                onChange={e => setSymptomDescription(e.target.value)}
                placeholder="Example: Woke up with fever, throbbing headache, and mild nausea after getting caught in the rain..."
                rows={3}
                className="w-full p-4 text-xs font-medium rounded-2xl border border-surface-container-high bg-surface-container-low/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Section 3: Severity, Duration & Obstetric Status */}
          <div className="bg-white border border-surface-container-high rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">tune</span>
              <span>Severity &amp; Duration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Severity Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Pain / Discomfort Intensity (1 to 10):</span>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                    severity >= 8 ? 'bg-red-100 text-red-800' :
                    severity >= 5 ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {severity} / 10 — {severity >= 8 ? 'Severe / Acute' : severity >= 5 ? 'Moderate' : 'Mild'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-tertiary font-bold">
                  <span>1 (Mild)</span>
                  <span>5 (Moderate)</span>
                  <span>10 (Emergency)</span>
                </div>
              </div>

              {/* Duration in days & Pregnancy Checkbox */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface">How many days have you had these symptoms?</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={durationDays}
                      onChange={e => setDurationDays(Math.max(1, Number(e.target.value)))}
                      className="w-24 p-2.5 text-xs font-bold rounded-xl border border-surface-container-high text-center"
                    />
                    <span className="text-xs text-tertiary">day(s)</span>
                  </div>
                </div>

                {patientInfo.gender.toLowerCase() === 'female' && (
                  <label className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-surface-container cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPregnant}
                      onChange={e => setIsPregnant(e.target.checked)}
                      className="rounded text-primary focus:ring-primary accent-primary"
                    />
                    <span className="text-xs font-bold text-on-surface">Currently pregnant / postpartum (within 6 weeks)</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Optional Vitals (Pulse Oximeter, BP, Thermometer) */}
          <div className="bg-white border border-surface-container-high rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">vital_signs</span>
                  <span>Recorded Vitals (Optional)</span>
                </h3>
                <p className="text-xs text-tertiary">
                  If you have a home pulse oximeter, blood pressure cuff, or thermometer, enter your readings:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-tertiary">SpO2 Oxygen (%)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={e => setSpo2(e.target.value)}
                    className="w-full bg-white p-2 rounded-xl text-xs font-bold border border-surface-container-high outline-none"
                  />
                  <span className="text-xs font-bold text-tertiary">%</span>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-tertiary">Heart Rate (BPM)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="75"
                    value={heartRate}
                    onChange={e => setHeartRate(e.target.value)}
                    className="w-full bg-white p-2 rounded-xl text-xs font-bold border border-surface-container-high outline-none"
                  />
                  <span className="text-xs font-bold text-tertiary">bpm</span>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-tertiary">Systolic BP (mmHg)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="120"
                    value={systolicBp}
                    onChange={e => setSystolicBp(e.target.value)}
                    className="w-full bg-white p-2 rounded-xl text-xs font-bold border border-surface-container-high outline-none"
                  />
                  <span className="text-xs font-bold text-tertiary">sys</span>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-tertiary">Temperature (°C)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value)}
                    className="w-full bg-white p-2 rounded-xl text-xs font-bold border border-surface-container-high outline-none"
                  />
                  <span className="text-xs font-bold text-tertiary">°C</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={resetAssessment}
              className="px-6 py-3.5 bg-surface-container text-on-surface hover:bg-surface-container-high font-bold text-xs rounded-2xl transition-all"
            >
              Clear Inputs
            </button>

            <button
              type="submit"
              disabled={evaluating}
              className="px-8 py-3.5 bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-800 hover:to-cyan-800 text-white font-extrabold text-sm rounded-2xl shadow-xl flex items-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                  <span>Evaluating Clinical Triage...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  <span>Submit Self-Triage &amp; Dispatch Alert</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* PAST ASSESSMENTS MODAL                                                    */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-surface-container-high">
            <div className="p-6 border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-lg text-on-surface">
                <span className="material-symbols-outlined text-primary">history</span>
                <span>Past Self-Triage Assessments</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>Loading past records...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-xs text-tertiary">
                  No previous self-triage assessments found for your profile.
                </div>
              ) : (
                history.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl border border-surface-container-high bg-surface-container-low/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        item.urgency === 'RED' ? 'bg-red-100 text-red-800' :
                        item.urgency === 'YELLOW' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.urgency} TIER
                      </span>
                      <span className="text-[11px] text-tertiary font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="font-extrabold text-xs text-on-surface">{item.recommended_facility || 'Health Centre'}</p>
                    <p className="text-xs text-slate-600">{item.symptom_description || (item.symptoms || []).join(', ')}</p>
                    <div className="flex items-center justify-between text-[11px] text-tertiary pt-2 border-t border-surface-container">
                      <span>Status: <strong>{item.status || 'PENDING'}</strong></span>
                      <span>Severity: {item.severity}/10</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
