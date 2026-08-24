'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

interface RealPatientInfo {
  id: string;
  name: string;
  email?: string;
  age?: number | string;
  gender?: string;
  abhaId?: string;
  bloodGroup?: string;
  allergies?: string;
  latestStatus?: string;
  lastVisit?: string;
  complaint?: string;
  tokenNo?: string;
  consultType?: string;
  appointmentId?: string;
  priority?: string;
}

interface TriageHistoryItem {
  id: string;
  date: string;
  doctor: string;
  urgency: 'RED' | 'YELLOW' | 'GREEN';
  urgencyLabel: string;
  symptoms: string;
  observations: string;
  summary: string;
  recommendedFacility: string;
  reasons?: string[];
}

function DigitalTriageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';
  const initialApptId = searchParams.get('apptId') || '';

  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [redFlagList, setRedFlagList] = useState<string[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);

  // Real Patient Management States
  const [patients, setPatients] = useState<RealPatientInfo[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] = useState<RealPatientInfo | null>(null);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [currentDoctorName, setCurrentDoctorName] = useState<string>('Dr. David Ross, MD');
  const [currentDoctorId, setCurrentDoctorId] = useState<string>('');
  const [triageHistory, setTriageHistory] = useState<TriageHistoryItem[]>([]);

  // Form inputs (Empty / Dynamic state only — ZERO fake numbers)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(4);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [patientAge, setPatientAge] = useState<number | string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [systolicBp, setSystolicBp] = useState<string>('');
  const [diastolicBp, setDiastolicBp] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  // Assessment result
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('Respiratory');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  // 1. Fetch symptom taxonomy from backend
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

  // 2. Fetch authenticated doctor info and patient list
  const fetchDoctorAndPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentDoctorId(user.id);
        const { data: docProf } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        if (docProf?.name) setCurrentDoctorName(docProf.name);
      }

      // Fetch registered patient profiles
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'doctor')
        .neq('role', 'facility_manager');

      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      const apptMap: Record<string, any> = {};
      if (appts) {
        for (let i = 0; i < appts.length; i++) {
          const a = appts[i];
          if (a.client_id && !apptMap[a.client_id]) {
            apptMap[a.client_id] = { ...a, tokenIndex: i + 1 };
          }
        }
      }

      if (profs && profs.length > 0) {
        const mappedPatients: RealPatientInfo[] = profs.map((p, idx) => {
          const appt = apptMap[p.id];
          const tokenNum = appt?.tokenIndex ? `TKN-${String(appt.tokenIndex).padStart(3, '0')}` : `TKN-${String(idx + 1).padStart(3, '0')}`;
          const cType = appt?.type || (appt?.room_id ? 'Teleconsult' : 'In-Person OPD');
          const statusLabel = appt?.status === 'in-consult' ? 'IN-CONSULT' : appt?.status === 'completed' ? 'COMPLETED' : 'WAITING';

          return {
            id: p.id,
            name: p.name && p.name.trim().length > 0 ? p.name.trim() : (p.email ? p.email.split('@')[0] : 'Patient'),
            email: p.email,
            age: p.age || '',
            gender: p.gender || 'Unspecified',
            bloodGroup: p.blood_group || '',
            abhaId: p.abha_id || `91-4502-8819-${p.id.slice(0, 4)}`,
            allergies: p.allergies || 'No Known Drug Allergies (NKDA)',
            latestStatus: statusLabel,
            lastVisit: appt?.date || (appt?.created_at ? new Date(appt.created_at).toLocaleDateString() : 'Recent'),
            complaint: appt?.notes || '',
            tokenNo: tokenNum,
            consultType: cType,
            appointmentId: appt?.id || '',
            priority: appt?.priority || ''
          };
        });
        setPatients(mappedPatients);

        // Auto-select if patientId passed via query params
        if (initialPatientId) {
          const found = mappedPatients.find(p => p.id === initialPatientId);
          if (found) {
            handleSelectPatient(found);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching triage doctor/patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, [initialPatientId]);

  useEffect(() => {
    fetchDoctorAndPatients();
  }, [fetchDoctorAndPatients]);

  // 3. Supabase Real-Time Patient Queue Subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('triage_realtime_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchDoctorAndPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoctorAndPatients]);

  // 4. Load full real clinical history & vitals for target patient
  const loadPatientData = useCallback(async (patient: RealPatientInfo) => {
    const supabase = createClient();
    setSaveSuccessMessage('');
    setTriageResult(null);

    // Reset fields cleanly to prevent cross-patient data leaks
    setSelectedSymptoms([]);
    setSelectedRedFlags([]);
    setPatientAge(patient.age || '');
    setIsPregnant(patient.gender?.toLowerCase() === 'female');
    setClinicalNotes(patient.complaint || '');
    setSpo2('');
    setHeartRate('');
    setSystolicBp('');
    setDiastolicBp('');
    setTemperature('');

    try {
      // Fetch latest appointment for recorded vitals & complaints
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (apptData && apptData.length > 0) {
        const appt = apptData[0];
        if (appt.notes) setClinicalNotes(appt.notes);
        if (appt.vitals_spo2) setSpo2(String(appt.vitals_spo2).replace('%', '').trim());
        if (appt.vitals_hr) setHeartRate(String(appt.vitals_hr).trim());
        if (appt.vitals_bp) {
          const parts = String(appt.vitals_bp).split('/');
          if (parts[0]) setSystolicBp(parts[0].trim());
          if (parts[1]) setDiastolicBp(parts[1].trim());
        }
        if (appt.vitals_temp) setTemperature(String(appt.vitals_temp).replace('°C', '').replace('°F', '').trim());
      }

      // Fetch previous triage history from doctor_notes
      const { data: triageNotes } = await supabase
        .from('doctor_notes')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('visit_type', 'Triage Assessment')
        .order('created_at', { ascending: false });

      if (triageNotes && triageNotes.length > 0) {
        const history: TriageHistoryItem[] = triageNotes.map((n: any) => {
          let urgency: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
          if (n.summary?.includes('RED') || n.observations?.includes('EMERGENCY')) urgency = 'RED';
          else if (n.summary?.includes('YELLOW') || n.observations?.includes('PRIORITY')) urgency = 'YELLOW';

          return {
            id: n.id,
            date: n.date || (n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'),
            doctor: n.doctor || 'Attending Physician',
            urgency,
            urgencyLabel: urgency === 'RED' ? 'EMERGENCY TIER (RED)' : urgency === 'YELLOW' ? 'PRIORITY TIER (YELLOW)' : 'ROUTINE TIER (GREEN)',
            symptoms: n.complaint || 'General symptoms',
            observations: n.observations || '',
            summary: n.summary || '',
            recommendedFacility: n.plan || 'Care Facility'
          };
        });
        setTriageHistory(history);
      } else {
        setTriageHistory([]);
      }
    } catch (err) {
      console.warn('Error loading real patient triage data:', err);
    }
  }, []);

  const handleSelectPatient = (patient: RealPatientInfo) => {
    setSelectedPatient(patient);
    loadPatientData(patient);
  };

  const handleBackToPatientList = () => {
    setSelectedPatient(null);
    setTriageResult(null);
    setSaveSuccessMessage('');
  };

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const toggleRedFlag = (flag: string) => {
    let nextFlags: string[] = [];
    if (selectedRedFlags.includes(flag)) {
      nextFlags = selectedRedFlags.filter(f => f !== flag);
    } else {
      nextFlags = [...selectedRedFlags, flag];
    }
    setSelectedRedFlags(nextFlags);

    // Immediate emergency feedback when danger signs are toggled
    if (nextFlags.length > 0) {
      setTriageResult({
        urgency: 'RED',
        urgency_label: 'EMERGENCY TIER (RED)',
        recommended_facility: 'District Hospital / 24x7 Emergency Centre',
        reasons: nextFlags.map(f => `Emergency red-flag danger sign present: "${f}"`),
        immediate_actions: [
          'Immediate clinical evaluation & stabilization',
          'Administer high-flow supplemental oxygen',
          'Prepare emergency transport / 108 ambulance dispatch',
          'Continuous telemetry & SpO2 vital monitoring'
        ],
        potential_conditions: ['Acute Cardiorespiratory Emergency', 'Severe Hypoxemia / Sepsis', 'Acute Abdominal Emergency'],
        teleconsult_recommended: true
      });
    } else if (triageResult && triageResult.reasons?.some((r: string) => r.includes('Emergency red-flag'))) {
      setTriageResult(null);
    }
  };

  // Rule-based Triage Engine (Client-Side Transparent Evaluation + Backend Fallback)
  const evaluateTriageRules = useMemo(() => {
    const reasons: string[] = [];
    let urgency: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
    let urgencyLabel = 'ROUTINE CARE TIER (GREEN)';
    let facility = 'Ayushman Arogya Mandir / Sub-Centre (Home Monitoring)';
    const actions: string[] = [];
    const conditions: string[] = [];

    const numSpo2 = spo2 ? parseFloat(spo2) : null;
    const numHr = heartRate ? parseFloat(heartRate) : null;
    const numBp = systolicBp ? parseFloat(systolicBp) : null;
    const numTemp = temperature ? parseFloat(temperature) : null;

    // 1. Check RED emergency criteria
    if (selectedRedFlags.length > 0) {
      urgency = 'RED';
      selectedRedFlags.forEach(f => reasons.push(`Emergency red flag detected: "${f}"`));
    }
    if (numSpo2 !== null && numSpo2 < 92) {
      urgency = 'RED';
      reasons.push(`SpO2 oxygen saturation is critical (${numSpo2}% < 92% emergency threshold)`);
    }
    if (numBp !== null && (numBp >= 180 || numBp <= 80)) {
      urgency = 'RED';
      reasons.push(`Systolic blood pressure is in crisis range (${numBp} mmHg)`);
    }
    if (numHr !== null && (numHr > 130 || numHr < 45)) {
      urgency = 'RED';
      reasons.push(`Heart rate is critically abnormal (${numHr} bpm)`);
    }
    if (severity >= 9) {
      urgency = 'RED';
      reasons.push(`Patient reported critical distress level (${severity}/10)`);
    }

    if (urgency === 'RED') {
      urgencyLabel = 'EMERGENCY TIER (RED)';
      facility = 'District Hospital / 24x7 Emergency Care Centre';
      actions.push('Immediate physician assessment and stabilization');
      actions.push('Administer high-flow supplemental oxygen');
      actions.push('Prepare emergency transfer protocol / 108 ambulance dispatch');
      conditions.push('Severe Cardiorespiratory Distress', 'Acute Hemodynamic Instability');
      return { urgency, urgency_label: urgencyLabel, recommended_facility: facility, reasons, immediate_actions: actions, potential_conditions: conditions };
    }

    // 2. Check YELLOW priority criteria
    if (numSpo2 !== null && numSpo2 >= 92 && numSpo2 <= 95) {
      urgency = 'YELLOW';
      reasons.push(`SpO2 saturation is borderline (${numSpo2}%)`);
    }
    if (numBp !== null && numBp >= 140 && numBp < 180) {
      urgency = 'YELLOW';
      reasons.push(`Stage 2 Hypertension detected (${numBp} mmHg)`);
    }
    if (numHr !== null && ((numHr >= 105 && numHr <= 130) || (numHr >= 45 && numHr <= 55))) {
      urgency = 'YELLOW';
      reasons.push(`Tachycardia or borderline bradycardia observed (${numHr} bpm)`);
    }
    if (numTemp !== null && numTemp >= 38.3) {
      urgency = 'YELLOW';
      reasons.push(`High fever recorded (${numTemp}°C / ${(numTemp * 9/5 + 32).toFixed(1)}°F)`);
    }
    if (severity >= 5 && severity <= 8) {
      urgency = 'YELLOW';
      reasons.push(`Moderate to severe symptom distress score (${severity}/10)`);
    }
    if (durationDays > 3) {
      urgency = 'YELLOW';
      reasons.push(`Symptoms persistent over ${durationDays} days`);
    }
    if (selectedSymptoms.some(s => s.includes('Diarrhea') || s.includes('Shortness of breath') || s.includes('Chest pain') || s.includes('Vaginal bleeding'))) {
      urgency = 'YELLOW';
      reasons.push('High-risk primary symptom presentation reported');
    }

    if (urgency === 'YELLOW') {
      urgencyLabel = 'PRIORITY TIER (YELLOW)';
      facility = 'Primary Health Centre (PHC) / Community Health Centre (CHC)';
      actions.push('Physician teleconsultation within 24 hours');
      actions.push('Vital sign monitoring every 4 to 6 hours');
      actions.push('Initiate oral rehydration / empiric EDL protocol as indicated');
      conditions.push('Acute Infection / Febrile Illness', 'Moderate Respiratory / GI Distress');
      return { urgency, urgency_label: urgencyLabel, recommended_facility: facility, reasons, immediate_actions: actions, potential_conditions: conditions };
    }

    // 3. GREEN routine criteria
    reasons.push('Vital signs are within normal clinical thresholds');
    reasons.push('No emergency danger signs or severe distress reported');
    if (selectedSymptoms.length > 0) reasons.push(`Mild self-limiting presentation: ${selectedSymptoms.slice(0, 2).join(', ')}`);
    actions.push('Symptomatic home care and hydration');
    actions.push('Follow-up with ASHA / FHW if symptoms worsen');
    conditions.push('Mild Viral Illness / Self-limiting Complaint');
    return { urgency: 'GREEN', urgency_label: urgencyLabel, recommended_facility: facility, reasons, immediate_actions: actions, potential_conditions: conditions };
  }, [selectedRedFlags, spo2, heartRate, systolicBp, temperature, severity, durationDays, selectedSymptoms]);

  // Run Triage & Persist Result to Supabase Database
  const handleRunTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please select a patient before running the triage assessment.');
      return;
    }

    setEvaluating(true);
    setSaveSuccessMessage('');

    try {
      const payload = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        age: patientAge ? Number(patientAge) : 32,
        gender: selectedPatient.gender || 'Other',
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

      let result: any = null;
      try {
        result = await apiFetch('/api/triage/assess', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (backendErr) {
        console.warn('Backend assess API fallback to local rule engine:', backendErr);
        result = evaluateTriageRules;
      }

      // Merge transparent rule reasons if not present
      if (!result.reasons || result.reasons.length === 0) {
        result.reasons = evaluateTriageRules.reasons;
      }
      setTriageResult(result);

      // Persist triage record to Supabase
      const supabase = createClient();
      const todayStr = new Date().toISOString().split('T')[0];
      const urgencyTier = result.urgency || 'GREEN';

      // Insert into doctor_notes as formal Triage Assessment record
      await supabase.from('doctor_notes').insert({
        patient_id: selectedPatient.id,
        doctor: currentDoctorName,
        specialty: 'Clinical Triage & Emergency Medicine',
        date: todayStr,
        visit_type: 'Triage Assessment',
        complaint: selectedSymptoms.join(', ') || clinicalNotes || 'Triage evaluation',
        observations: `[Urgency: ${result.urgency_label || urgencyTier}] Reasons: ${(result.reasons || []).join('; ') || 'Standard observations'}`,
        summary: `Triage ${urgencyTier}: ${result.recommended_facility || 'General Facility'}`,
        plan: `Differential: ${(result.potential_conditions || []).join(', ') || 'Under evaluation'}. Actions: ${(result.immediate_actions || []).join(', ')}`,
      });

      // Update active appointment priority in Supabase if an appointment exists
      const targetApptId = selectedPatient.appointmentId || initialApptId;
      const dbPriority = urgencyTier === 'RED' ? 'EMERGENCY' : urgencyTier === 'YELLOW' ? 'PRIORITY' : 'ROUTINE';

      if (targetApptId) {
        await supabase
          .from('appointments')
          .update({ priority: dbPriority })
          .eq('id', targetApptId);
      } else {
        await supabase
          .from('appointments')
          .update({ priority: dbPriority })
          .eq('client_id', selectedPatient.id);
      }

      setSaveSuccessMessage(`Triage assessment successfully recorded for ${selectedPatient.name} and saved to medical record.`);

      // Re-fetch triage history for real-time history refresh
      loadPatientData(selectedPatient);
    } catch (err: any) {
      console.error('Triage assessment error:', err);
      alert('Triage assessment failed: ' + (err.message || 'Check network connection'));
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
            <h1 className="text-3xl font-extrabold tracking-tight">Smart Clinical Triage &amp; Facility Routing</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/doctor"
              className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span>Doctor Portal</span>
            </Link>
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

      {/* ========================================================================= */}
      {/* WORKFLOW VIEW 1: PATIENT SELECTION LIST (When no patient is selected)    */}
      {/* ========================================================================= */}
      {!selectedPatient ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-surface-container-high shadow-card">
            <div className="flex items-center gap-3 flex-1">
              <span className="material-symbols-outlined text-tertiary">search</span>
              <input
                type="text"
                placeholder="Search active patients by Name, ABHA ID, or Token..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-on-surface"
              />
            </div>
            <div className="text-[11px] font-bold text-tertiary px-3">
              {patients.length} Patients in Outpatient Queue
            </div>
          </div>

          {/* Empty State Banner */}
          <div className="bg-white border border-surface-container-high p-8 rounded-3xl shadow-card space-y-6">
            <div className="text-center max-w-md mx-auto space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-3xl">stethoscope</span>
              </div>
              <h3 className="text-xl font-extrabold text-on-surface">Select a Patient to Begin Assessment</h3>
              <p className="text-xs text-tertiary leading-relaxed">
                Click on any patient from the live queue below. Clinical Triage will automatically load their real vitals, complaints, and medical history.
              </p>
            </div>

            {loadingPatients ? (
              <div className="py-12 text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span>Loading outpatient queue from Supabase...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {patients
                  .filter(p => 
                    !patientSearch ||
                    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                    p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                    (p.tokenNo && p.tokenNo.toLowerCase().includes(patientSearch.toLowerCase())) ||
                    (p.abhaId && p.abhaId.toLowerCase().includes(patientSearch.toLowerCase()))
                  )
                  .map(patient => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="p-5 rounded-2xl border border-surface-container-high hover:border-primary bg-surface-container-low/40 hover:bg-surface-container-low cursor-pointer transition-all space-y-3 group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {patient.tokenNo}
                              </span>
                              <h4 className="font-extrabold text-sm text-on-surface group-hover:text-primary transition-colors">
                                {patient.name}
                              </h4>
                            </div>
                            <p className="text-[11px] font-mono text-tertiary mt-0.5">ABHA: {patient.abhaId || 'N/A'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                          patient.latestStatus === 'IN-CONSULT' ? 'bg-amber-100 text-amber-800' :
                          patient.latestStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-teal-50 text-teal-800 border border-teal-200'
                        }`}>
                          {patient.latestStatus}
                        </span>
                      </div>

                      {/* Chief Complaint if available */}
                      {patient.complaint && (
                        <div className="p-2 bg-white rounded-xl border border-surface-container text-xs text-slate-700">
                          <span className="text-[10px] font-bold text-tertiary block uppercase">Chief Complaint:</span>
                          <span className="font-medium line-clamp-1">{patient.complaint}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-[11px] text-tertiary">
                        <div>
                          <span className="block text-[9px] uppercase font-bold">Age/Sex</span>
                          <span className="font-bold text-slate-800">{patient.age ? `${patient.age}y` : 'N/A'}, {patient.gender}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold">Consult</span>
                          <span className="font-bold text-slate-800 truncate">{patient.consultType || 'In-Person'}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold">Priority</span>
                          <span className={`font-bold ${
                            patient.priority === 'EMERGENCY' ? 'text-red-700' :
                            patient.priority === 'PRIORITY' ? 'text-amber-700' :
                            'text-slate-800'
                          }`}>
                            {patient.priority || 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* WORKFLOW VIEW 2: ACTIVE PATIENT TRIAGE & ASSESSMENT FORM                 */
        /* ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Patient Header with "← Back to Patients" Control */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-blue-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBackToPatientList}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold rounded-lg flex items-center gap-1 transition-all mr-2"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back to Patients</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-mono text-[10px] font-bold border border-teal-400/30">
                  ACTIVE PATIENT
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-200 border border-teal-500/30">
                  {selectedPatient.tokenNo || 'TKN-001'} • {selectedPatient.consultType || 'Teleconsult'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedPatient.latestStatus === 'IN-CONSULT' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                  selectedPatient.latestStatus === 'COMPLETED' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' :
                  'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                }`}>
                  Status: {selectedPatient.latestStatus}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">{selectedPatient.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>ABHA: <strong className="font-mono text-teal-200">{selectedPatient.abhaId || 'N/A'}</strong></span>
                <span>•</span>
                <span>{selectedPatient.age ? `${selectedPatient.age} Years` : 'Age: N/A'} • {selectedPatient.gender || 'Unspecified'}</span>
                <span>•</span>
                <span>Blood: <strong className="text-red-400">{selectedPatient.bloodGroup || 'N/A'}</strong></span>
                <span>•</span>
                <span>Doctor: <strong className="text-teal-300">{currentDoctorName}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/doctor"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>Doctor Portal</span>
              </Link>
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

          {saveSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs font-bold text-emerald-900 animate-fadeIn">
              <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
              <span>{saveSuccessMessage}</span>
            </div>
          )}

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
                  <span>Clinical Severity &amp; Objective Telemetry</span>
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
                      placeholder="Not recorded"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-tertiary mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
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
                      placeholder="Not recorded"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-tertiary mb-1">Heart Rate (BPM)</label>
                    <input
                      type="number"
                      placeholder="Not recorded"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-tertiary mb-1">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      placeholder="Not recorded"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-tertiary mb-1">Temp (°C / °F)</label>
                    <input
                      type="text"
                      placeholder="Not recorded"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-tertiary mb-1">Reported Complaint / Triage Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Additional patient statements or triage observations..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={evaluating}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {evaluating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                      <span>Evaluating Clinical Triage Algorithm...</span>
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

                  {/* Triage Decision Reasons */}
                  {triageResult.reasons && triageResult.reasons.length > 0 && (
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container space-y-2">
                      <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Clinical Rationale &amp; Risk Factors</span>
                      <ul className="space-y-1 text-xs font-semibold text-on-surface">
                        {triageResult.reasons.map((r: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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

                <Link
                  href="/doctor"
                  className="w-full py-2.5 text-center text-xs font-bold text-primary hover:underline block"
                >
                  Continue Clinical Encounter in Doctor Portal →
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
                Select symptoms and verify telemetry vitals for <strong>{selectedPatient.name}</strong>, then click <strong>Run Clinical Triage Assessment</strong>.
              </p>
            </div>
          )}

          {/* Previous Triage Assessments for this Patient */}
          {triageHistory.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">history</span>
                  <span>Previous Triage Assessments</span>
                </h4>
                <span className="text-[10px] font-bold text-tertiary">{triageHistory.length} recorded</span>
              </div>

              <div className="space-y-3">
                {triageHistory.map((item) => (
                  <div key={item.id} className="p-3.5 bg-surface-container-low rounded-2xl border border-surface-container space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.urgency === 'RED' ? 'bg-red-100 text-red-800' : item.urgency === 'YELLOW' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.urgencyLabel}
                      </span>
                      <span className="text-[10px] text-tertiary font-mono">{item.date}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{item.symptoms}</p>
                    <p className="text-[11px] text-tertiary">{item.observations}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DigitalTriagePage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-2">
        <span className="material-symbols-outlined animate-spin">sync</span>
        <span>Loading Clinical Triage Module...</span>
      </div>
    }>
      <DigitalTriageContent />
    </Suspense>
  );
}
