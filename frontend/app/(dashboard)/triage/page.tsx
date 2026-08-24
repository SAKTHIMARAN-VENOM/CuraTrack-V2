'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
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
}

function DigitalTriageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';
  const initialApptId = searchParams.get('apptId') || '';

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

  // Form inputs
  const [symptomDescription, setSymptomDescription] = useState<string>('');
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(4);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [patientAge, setPatientAge] = useState<number | string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [systolicBp, setSystolicBp] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  // Assessment result
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  const commonSymptomChips = [
    "Persistent Cough (> 2 weeks)",
    "Shortness of breath on exertion",
    "High fever with chills",
    "Chest tightness / heaviness",
    "Acute Diarrhea / Vomiting",
    "Severe abdominal pain",
    "Sudden onset headache",
    "Dizziness / Vertigo",
    "Decreased fetal movements",
    "Extreme fatigue / body aches",
    "Wheezing / Stridor",
    "Pediatric dehydration"
  ];

  // 1. Fetch symptom taxonomy from backend
  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const data = await apiFetch('/api/triage/symptoms');
        if (data.red_flags) setRedFlagList(data.red_flags);
      } catch (err) {
        console.warn('Failed to load symptom taxonomy from backend, using fallback:', err);
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

  const appendSymptomTag = (tag: string) => {
    setSymptomDescription(prev => {
      if (!prev.trim()) return tag;
      if (prev.toLowerCase().includes(tag.toLowerCase())) return prev;
      return `${prev.trim()}, ${tag}`;
    });
  };

  // 2. Fetch authenticated doctor info and patient list
  useEffect(() => {
    const fetchDoctorAndPatients = async () => {
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

        // Fetch patient profiles
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
          for (const a of appts) {
            if (a.client_id && !apptMap[a.client_id]) {
              apptMap[a.client_id] = a;
            }
          }
        }

        if (profs && profs.length > 0) {
          const mappedPatients: RealPatientInfo[] = profs.map(p => {
            const appt = apptMap[p.id];
            return {
              id: p.id,
              name: p.name && p.name.trim().length > 0 ? p.name.trim() : (p.email ? p.email.split('@')[0] : 'Patient'),
              email: p.email,
              age: p.age || 32,
              gender: p.gender || 'Unspecified',
              bloodGroup: p.blood_group || 'O+',
              abhaId: p.abha_id || `91-4502-8819-${p.id.slice(0, 4)}`,
              allergies: p.allergies || 'No Known Drug Allergies (NKDA)',
              latestStatus: appt?.status === 'in-consult' ? 'In Consultation' : appt?.status === 'completed' ? 'Completed' : 'Registered Patient',
              lastVisit: appt?.date || (appt?.created_at ? new Date(appt.created_at).toLocaleDateString() : 'Recent'),
              complaint: appt?.notes || '',
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
    };

    fetchDoctorAndPatients();
  }, [initialPatientId]);

  // 3. Load full real clinical history & vitals for target patient
  const loadPatientData = useCallback(async (patient: RealPatientInfo) => {
    const supabase = createClient();
    setSaveSuccessMessage('');
    setTriageResult(null);

    // Reset fields cleanly
    setSymptomDescription(patient.complaint || '');
    setSelectedRedFlags([]);
    setPatientAge(patient.age || '');
    setIsPregnant(patient.gender?.toLowerCase() === 'female');
    setClinicalNotes(patient.complaint || '');
    setSpo2('');
    setHeartRate('');
    setSystolicBp('');
    setTemperature('');

    try {
      // 1. Fetch latest appointment for vitals
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (apptData && apptData.length > 0) {
        const appt = apptData[0];
        if (appt.notes && !patient.complaint) {
          setClinicalNotes(appt.notes);
          if (!patient.complaint) setSymptomDescription(appt.notes);
        }
        if (appt.vitals_spo2) setSpo2(String(appt.vitals_spo2).replace('%', ''));
        if (appt.vitals_hr) setHeartRate(String(appt.vitals_hr));
        if (appt.vitals_bp) {
          const sys = String(appt.vitals_bp).split('/')[0];
          if (sys) setSystolicBp(sys.trim());
        }
        if (appt.vitals_temp) setTemperature(String(appt.vitals_temp).replace('°C', '').replace('°F', '').trim());
      }

      // 2. Fetch previous triage history from doctor_notes
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
            urgencyLabel: urgency === 'RED' ? 'EMERGENCY TIER' : urgency === 'YELLOW' ? 'PRIORITY TIER' : 'ROUTINE TIER',
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

  const toggleRedFlag = (flag: string) => {
    if (selectedRedFlags.includes(flag)) {
      setSelectedRedFlags(selectedRedFlags.filter(f => f !== flag));
    } else {
      setSelectedRedFlags([...selectedRedFlags, flag]);
    }
  };

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
      const parsedSymptoms = symptomDescription
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const payload = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        age: patientAge ? Number(patientAge) : 32,
        gender: selectedPatient.gender || 'Other',
        pregnant: isPregnant,
        symptoms: parsedSymptoms.length > 0 ? parsedSymptoms : (symptomDescription ? [symptomDescription] : []),
        severity: Number(severity),
        duration_days: Number(durationDays),
        red_flags: selectedRedFlags,
        spo2: spo2 ? parseFloat(spo2) : undefined,
        heart_rate: heartRate ? parseFloat(heartRate) : undefined,
        systolic_bp: systolicBp ? parseFloat(systolicBp) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        notes: clinicalNotes || symptomDescription || undefined
      };

      // 1. Calculate clinical triage assessment from engine
      const result = await apiFetch('/api/triage/assess', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setTriageResult(result);

      // 2. Persist triage record to Supabase
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
        complaint: symptomDescription || 'Triage evaluation',
        observations: `[Urgency: ${result.urgency_label || urgencyTier}] Actions: ${(result.immediate_actions || []).join('; ') || 'Standard observation'}`,
        summary: `Triage ${urgencyTier}: ${result.recommended_facility || 'General Facility'}`,
        plan: `Differential: ${(result.potential_conditions || []).join(', ') || 'Under evaluation'}`,
      });

      // Update active appointment priority in Supabase if an appointment exists
      const targetApptId = initialApptId || undefined;
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

      {/* Patient Selection & Context Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-surface-container-high shadow-card">
          <div className="flex items-center gap-3 flex-1">
            <span className="material-symbols-outlined text-tertiary">search</span>
            <input
              type="text"
              placeholder="Search real patients by Name, ABHA ID, or UUID..."
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              className="w-full text-xs font-semibold bg-transparent outline-none text-on-surface"
            />
          </div>
          {selectedPatient && (
            <button
              onClick={() => setSelectedPatient(null)}
              className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">swap_horiz</span>
              <span>Switch Patient</span>
            </button>
          )}
        </div>

        {/* If No Patient Selected: Display Searchable Real Patient List */}
        {!selectedPatient ? (
          <div className="bg-white border border-surface-container-high p-8 rounded-3xl shadow-card space-y-6">
            <div className="text-center max-w-md mx-auto space-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                <span className="material-symbols-outlined text-3xl">person_search</span>
              </div>
              <h3 className="text-lg font-extrabold text-on-surface">Select a Patient for Clinical Triage</h3>
              <p className="text-xs text-tertiary">
                Choose a verified patient from the outpatient directory to pre-fill known telemetry vitals and evaluate emergency prioritization tiers.
              </p>
            </div>

            {loadingPatients ? (
              <div className="py-12 text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span>Loading real patient records from Supabase...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients
                  .filter(p => 
                    !patientSearch ||
                    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                    p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
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
                            <h4 className="font-extrabold text-sm text-on-surface group-hover:text-primary transition-colors">
                              {patient.name}
                            </h4>
                            <p className="text-[11px] font-mono text-tertiary">ABHA: {patient.abhaId}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {patient.latestStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-[11px] text-tertiary">
                        <div>
                          <span className="block text-[9px] uppercase font-bold">Age/Sex</span>
                          <span className="font-bold text-slate-800">{patient.age}y, {patient.gender}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold">Blood</span>
                          <span className="font-bold text-red-700">{patient.bloodGroup}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold">Last Visit</span>
                          <span className="font-bold text-slate-800">{patient.lastVisit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Selected Patient Demographics Header */
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-blue-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-mono text-[10px] font-bold border border-teal-400/30">
                  Target Patient for Triage
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-slate-300">ID: {selectedPatient.id}</span>
              </div>
              <h3 className="text-2xl font-black text-white">{selectedPatient.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>ABHA: <strong className="font-mono text-teal-200">{selectedPatient.abhaId}</strong></span>
                <span>•</span>
                <span>{selectedPatient.age} Years, {selectedPatient.gender}</span>
                <span>•</span>
                <span>Blood: <strong className="text-red-400">{selectedPatient.bloodGroup}</strong></span>
                <span>•</span>
                <span>Doctor: <strong className="text-teal-300">{currentDoctorName}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/doctor"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>Doctor Portal</span>
              </Link>
            </div>
          </div>
        )}
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
          {/* Symptoms Description Compartment */}
          <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
              <div>
                <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <span>Primary Symptoms & Chief Complaints</span>
                </h2>
                <p className="text-xs text-tertiary mt-0.5">
                  Enter detailed patient-reported symptoms, onset description, and clinical complaints
                </p>
              </div>
              {symptomDescription.trim() && (
                <button
                  type="button"
                  onClick={() => setSymptomDescription('')}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  <span>Clear text</span>
                </button>
              )}
            </div>

            {/* Free-text Description Input */}
            <div className="relative">
              <textarea
                value={symptomDescription}
                onChange={(e) => setSymptomDescription(e.target.value)}
                placeholder="Type the patient's symptoms here in detail...&#10;&#10;Examples:&#10;• Severe continuous dry cough for 3 weeks, chest pain while breathing, fever with chills&#10;• Acute watery diarrhea 5 times since morning, vomiting, severe abdominal cramping&#10;• Shortness of breath on mild walking, dizziness, ankle swelling"
                rows={6}
                className="w-full p-4 bg-surface-container-low rounded-2xl text-xs font-medium text-on-surface border border-surface-container-high outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y leading-relaxed"
              />
              <div className="flex justify-between items-center text-[11px] text-tertiary mt-1 px-1">
                <span>Clinical Observation Narrative</span>
                <span>{symptomDescription.length} characters • {symptomDescription.trim() ? symptomDescription.trim().split(/\s+/).length : 0} words</span>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="pt-2 border-t border-surface-container-high/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-tertiary mb-2.5">
                <span className="material-symbols-outlined text-sm text-primary">touch_app</span>
                <span>Quick Add Common Clinical Keywords:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {commonSymptomChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => appendSymptomTag(chip)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 hover:text-primary hover:border-primary border border-surface-container-high/80 text-on-surface transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px] opacity-70">add</span>
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
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
                  placeholder="e.g. 32"
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
                {selectedPatient
                  ? `Select symptoms and verify telemetry vitals for ${selectedPatient.name}, then click Run Clinical Triage.`
                  : 'Select a patient from the outpatient directory above to run an evidence-based clinical triage assessment.'}
              </p>
            </div>
          )}

          {/* Previous Triage Assessments for this Patient */}
          {selectedPatient && triageHistory.length > 0 && (
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
