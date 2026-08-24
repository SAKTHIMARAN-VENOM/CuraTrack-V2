'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface OPDQueuePatient {
  id: string;
  token: string;
  name: string;
  age: number;
  gender: string;
  abhaId: string;
  bloodGroup: string;
  allergies: string;
  priority: 'EMERGENCY' | 'PRIORITY' | 'ROUTINE';
  complaint: string;
  vitals: {
    bp: string;
    hr: number;
    spo2: number;
    temp: string;
    bmi: string;
  };
  type: 'In-Person OPD' | 'Teleconsult' | 'Emergency Follow-Up';
  status: 'WAITING' | 'IN-CONSULT' | 'COMPLETED';
  waitTime: string;
}

const INITIAL_QUEUE: OPDQueuePatient[] = [
  {
    id: 'PAT-001',
    token: 'TKN-042',
    name: 'Kavita Bai',
    age: 38,
    gender: 'Female',
    abhaId: '91-4502-8819-2041',
    bloodGroup: 'O+',
    allergies: 'Penicillin (Severe Rash)',
    priority: 'PRIORITY',
    complaint: 'Persistent high fever with chills for 3 days, body aches, severe fatigue',
    vitals: { bp: '118/76', hr: 88, spo2: 97, temp: '101.4 °F', bmi: '21.2' },
    type: 'In-Person OPD',
    status: 'IN-CONSULT',
    waitTime: '10 mins ago'
  },
  {
    id: 'PAT-002',
    token: 'TKN-043',
    name: 'Ramesh Tadvi',
    age: 52,
    gender: 'Male',
    abhaId: '91-7712-4401-9923',
    bloodGroup: 'B+',
    allergies: 'NKDA (No Known Drug Allergies)',
    priority: 'PRIORITY',
    complaint: 'Uncontrolled blood glucose check, bilateral lower limb numbness and dizziness',
    vitals: { bp: '142/90', hr: 76, spo2: 98, temp: '98.6 °F', bmi: '26.8' },
    type: 'In-Person OPD',
    status: 'WAITING',
    waitTime: '15 mins ago'
  },
  {
    id: 'PAT-003',
    token: 'TKN-044',
    name: 'Sunita Gavit',
    age: 24,
    gender: 'Female',
    abhaId: '91-3382-9910-1124',
    bloodGroup: 'A+',
    allergies: 'Sulfa Drugs (Mild Urticaria)',
    priority: 'ROUTINE',
    complaint: 'Antenatal Care (ANC) 28-Week routine review, mild pedal edema, mild fatigue',
    vitals: { bp: '110/70', hr: 74, spo2: 99, temp: '98.4 °F', bmi: '23.0' },
    type: 'Teleconsult',
    status: 'WAITING',
    waitTime: '25 mins ago'
  },
  {
    id: 'PAT-004',
    token: 'TKN-045',
    name: 'Prakash Patil',
    age: 45,
    gender: 'Male',
    abhaId: '91-1120-6677-8890',
    bloodGroup: 'AB+',
    allergies: 'NKDA',
    priority: 'EMERGENCY',
    complaint: 'Acute chest tightness radiating to left shoulder, diaphoresis for 40 mins',
    vitals: { bp: '165/102', hr: 104, spo2: 94, temp: '98.8 °F', bmi: '28.1' },
    type: 'In-Person OPD',
    status: 'WAITING',
    waitTime: '5 mins ago'
  },
  {
    id: 'PAT-005',
    token: 'TKN-046',
    name: 'Anandi Bai',
    age: 61,
    gender: 'Female',
    abhaId: '91-8843-2211-5566',
    bloodGroup: 'O+',
    allergies: 'NSAIDs (Gastric Distress)',
    priority: 'ROUTINE',
    complaint: 'Chronic knee osteoarthritis flare-up, requests refill of analgesics and calcium',
    vitals: { bp: '130/82', hr: 70, spo2: 98, temp: '98.2 °F', bmi: '24.5' },
    type: 'In-Person OPD',
    status: 'COMPLETED',
    waitTime: 'Completed'
  }
];

export default function DoctorClinicalDashboardPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<OPDQueuePatient[]>(INITIAL_QUEUE);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PAT-001');
  const [filterType, setFilterType] = useState<'ALL' | 'WAITING' | 'EMERGENCY' | 'TELECONSULT' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Clinical Encounter State
  const [soapDiagnosis, setSoapDiagnosis] = useState<string>('Acute febrile illness; likely vector-borne viral infection (Malarial / Dengue antigen screen pending)');
  const [soapNotes, setSoapNotes] = useState<string>('Patient reports 3 days of high-grade intermittent fever with rigors. Associated with generalized myalgia and frontal headache. No signs of respiratory distress. Advised hydration, paracetamol, and urgent diagnostic panel.');
  
  // Prescriptions List
  const [prescriptions, setPrescriptions] = useState<Array<{ id: string; drug: string; dosage: string; frequency: string; duration: string; instructions: string }>>([
    { id: '1', drug: 'Paracetamol 500mg IP (EDL Item)', dosage: '500mg', frequency: 'TDS (3 times daily)', duration: '5 Days', instructions: 'Take after meals with plenty of water' },
    { id: '2', drug: 'Amoxicillin 500mg Capsules', dosage: '500mg', frequency: 'BD (Twice daily)', duration: '5 Days', instructions: 'Complete full antibacterial course' },
    { id: '3', drug: 'Oral Rehydration Salts (ORS IP)', dosage: '1 Sachet in 1L Water', frequency: 'As needed', duration: '3 Days', instructions: 'Sip throughout the day to prevent dehydration' }
  ]);

  // Lab Tests State
  const [selectedLabs, setSelectedLabs] = useState<string[]>(['Complete Blood Count (CBC)', 'Rapid Malarial Antigen (Pf/Pv)']);

  const selectedPatient = queue.find(p => p.id === selectedPatientId) || queue[0];

  const filteredQueue = queue.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.complaint.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterType === 'WAITING') return item.status === 'WAITING' || item.status === 'IN-CONSULT';
    if (filterType === 'EMERGENCY') return item.priority === 'EMERGENCY';
    if (filterType === 'TELECONSULT') return item.type === 'Teleconsult';
    if (filterType === 'COMPLETED') return item.status === 'COMPLETED';
    return true;
  });

  const handleStatusChange = (patientId: string, nextStatus: 'WAITING' | 'IN-CONSULT' | 'COMPLETED') => {
    setQueue(prev => prev.map(p => p.id === patientId ? { ...p, status: nextStatus } : p));
  };

  const handleStartTeleconsult = () => {
    const roomId = `room_doc_${selectedPatient.token.toLowerCase()}_${Date.now()}`;
    router.push(`/call/${roomId}?role=doctor`);
  };

  const handleAddDrug = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const drug = (form.elements.namedItem('drug') as HTMLInputElement).value;
    const dosage = (form.elements.namedItem('dosage') as HTMLInputElement).value;
    const frequency = (form.elements.namedItem('frequency') as HTMLSelectElement).value;
    const duration = (form.elements.namedItem('duration') as HTMLInputElement).value;
    const instructions = (form.elements.namedItem('instructions') as HTMLInputElement).value;

    if (drug) {
      setPrescriptions(prev => [...prev, {
        id: Date.now().toString(),
        drug,
        dosage: dosage || 'Standard',
        frequency: frequency || 'BD (Twice daily)',
        duration: duration || '5 Days',
        instructions: instructions || 'Take after meals'
      }]);
      form.reset();
    }
  };

  const toggleLab = (lab: string) => {
    setSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  };

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-primary to-cyan-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
            <span className="material-symbols-outlined text-sm">stethoscope</span>
            <span>Clinical OPD & Teleconsultation Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Dr. David Ross, MD</h1>
          <p className="text-teal-100 text-sm mt-1 max-w-2xl">
            Nandurbar Sub-District Hospital • OPD Room 101 • General Medicine & Clinical Consultations
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-semibold">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              On Duty (Morning Shift 08:00 - 14:00)
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-teal-100">
              License: MMC/2018/04481
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/doctor/clinical-schedule"
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
          >
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            <span>Duty Roster</span>
          </Link>
          <Link
            href="/bluetooth/doctor"
            className="px-4 py-3 bg-teal-500/30 hover:bg-teal-500/40 text-white font-bold text-xs rounded-2xl flex items-center gap-2 border border-teal-400/40 backdrop-blur transition-all"
          >
            <span className="material-symbols-outlined text-lg">bluetooth</span>
            <span>BLE Offline Care</span>
          </Link>
          <button
            onClick={handleStartTeleconsult}
            className="px-5 py-3 bg-white text-primary hover:bg-teal-50 font-extrabold text-xs rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">video_call</span>
            <span>Start Teleconsult</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Patients in OPD Queue</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">
            {queue.filter(p => p.status === 'WAITING' || p.status === 'IN-CONSULT').length}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">1 Priority Emergency</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Completed Today</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">
            {queue.filter(p => p.status === 'COMPLETED').length + 12}
          </span>
          <span className="text-[10px] text-teal-600 font-semibold">Average 8 mins / patient</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">EDL Prescriptions</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">28</span>
          <span className="text-[10px] text-blue-600 font-semibold">100% Stock Available</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Lab Orders Pending</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">6</span>
          <span className="text-[10px] text-purple-600 font-semibold">Diagnostic sync active</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: OPD Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface">Live Outpatient Queue</h2>
                <p className="text-xs text-tertiary">Select patient to load clinical chart & encounter</p>
              </div>
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl">
                Room 101
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">search</span>
              <input
                type="text"
                placeholder="Search patient name, token or complaint..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['ALL', 'WAITING', 'EMERGENCY', 'TELECONSULT', 'COMPLETED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    filterType === tab ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Patient Cards List */}
            <div className="space-y-2.5 pt-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredQueue.map(patient => {
                const isSelected = patient.id === selectedPatientId;
                return (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary'
                        : 'bg-white border-surface-container-high hover:border-primary/40 hover:bg-surface-container-low/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-container text-slate-800 font-mono font-black text-[10px]">
                          {patient.token}
                        </span>
                        <h3 className="font-bold text-sm text-on-surface">{patient.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          patient.priority === 'EMERGENCY'
                            ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                            : patient.priority === 'PRIORITY'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {patient.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-tertiary text-[11px] mb-2">
                      <span>{patient.age}y / {patient.gender}</span>
                      <span>•</span>
                      <span className="font-mono">{patient.type}</span>
                      <span>•</span>
                      <span>{patient.waitTime}</span>
                    </div>

                    <p className="text-slate-700 text-xs line-clamp-2 bg-surface-container-low/60 p-2 rounded-xl border border-surface-container">
                      {patient.complaint}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-container-high text-[11px]">
                      <div className="flex items-center gap-3 font-semibold text-slate-600">
                        <span>BP: <strong>{patient.vitals.bp}</strong></span>
                        <span>HR: <strong>{patient.vitals.hr}</strong></span>
                        <span>SpO2: <strong>{patient.vitals.spo2}%</strong></span>
                      </div>
                      <span
                        className={`font-bold uppercase text-[10px] ${
                          patient.status === 'IN-CONSULT' ? 'text-teal-600 font-black' : patient.status === 'COMPLETED' ? 'text-slate-400' : 'text-amber-600'
                        }`}
                      >
                        {patient.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Patient Clinical Chart & Encounter (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Patient Header Card */}
          <div className="bg-white border border-surface-container-high p-6 rounded-3xl shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-lg bg-primary text-white font-mono font-black text-xs">
                    {selectedPatient.token}
                  </span>
                  <h2 className="text-2xl font-extrabold text-on-surface">{selectedPatient.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-tertiary">
                  <span>ABHA: <strong className="font-mono text-slate-800">{selectedPatient.abhaId}</strong></span>
                  <span>•</span>
                  <span>{selectedPatient.age} Years, {selectedPatient.gender}</span>
                  <span>•</span>
                  <span>Blood: <strong className="text-red-700 font-bold">{selectedPatient.bloodGroup}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedPatient.status !== 'IN-CONSULT' && (
                  <button
                    onClick={() => handleStatusChange(selectedPatient.id, 'IN-CONSULT')}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Call into Room
                  </button>
                )}
                {selectedPatient.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleStatusChange(selectedPatient.id, 'COMPLETED')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Mark Encounter Done
                  </button>
                )}
              </div>
            </div>

            {/* Allergy Warning Banner */}
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex items-center gap-3 text-xs text-red-900">
              <span className="material-symbols-outlined text-red-600 text-lg">warning</span>
              <div>
                <span className="font-extrabold uppercase tracking-wide">Allergy & Safety Alert: </span>
                <span className="font-semibold">{selectedPatient.allergies}</span>
              </div>
            </div>

            {/* Vitals Ribbon */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-tertiary block mb-2">Recorded Triage Vitals</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                  <span className="text-[10px] text-tertiary block">Blood Pressure</span>
                  <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.bp}</span>
                  <span className="text-[9px] text-emerald-600 font-semibold block">Normal</span>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                  <span className="text-[10px] text-tertiary block">Heart Rate</span>
                  <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.hr} bpm</span>
                  <span className="text-[9px] text-teal-600 font-semibold block">Rhythm Regular</span>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                  <span className="text-[10px] text-tertiary block">Oxygen (SpO2)</span>
                  <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.spo2}%</span>
                  <span className="text-[9px] text-blue-600 font-semibold block">Adequate</span>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                  <span className="text-[10px] text-tertiary block">Body Temp</span>
                  <span className="font-black text-sm text-amber-700">{selectedPatient.vitals.temp}</span>
                  <span className="text-[9px] text-amber-700 font-semibold block">Febrile</span>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                  <span className="text-[10px] text-tertiary block">BMI Index</span>
                  <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.bmi}</span>
                  <span className="text-[9px] text-slate-600 font-semibold block">Healthy Range</span>
                </div>
              </div>
            </div>

            {/* SOAP Clinical Encounter Notes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Clinical SOAP Notes & Assessment</span>
                <span className="text-[10px] text-tertiary font-semibold">ICD-10 Categorized</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-tertiary block mb-1">Provisional Diagnosis</label>
                <input
                  type="text"
                  value={soapDiagnosis}
                  onChange={e => setSoapDiagnosis(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-tertiary block mb-1">Subjective & Objective Clinical Findings</label>
                <textarea
                  rows={3}
                  value={soapNotes}
                  onChange={e => setSoapNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Digital E-Prescriptions */}
            <div className="space-y-3 pt-4 border-t border-surface-container-high">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">E-Prescription & EDL Dispensing Form</h3>
                  <p className="text-[10px] text-tertiary">Real-time prescription synchronization with SDH Pharmacy</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-200">
                  Interaction Safe (NKDA Checked)
                </span>
              </div>

              {/* Add Drug Form */}
              <form onSubmit={handleAddDrug} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-surface-container-low p-3.5 rounded-2xl border border-surface-container">
                <div className="sm:col-span-4">
                  <input
                    name="drug"
                    placeholder="Medicine Name (e.g. Paracetamol 500mg)"
                    required
                    className="w-full px-3 py-1.5 bg-white rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    name="dosage"
                    placeholder="Dosage (500mg)"
                    className="w-full px-3 py-1.5 bg-white rounded-xl text-xs border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    name="frequency"
                    className="w-full px-3 py-1.5 bg-white rounded-xl text-xs border border-surface-container-high outline-none focus:border-primary"
                  >
                    <option value="OD (Once daily)">OD (Once daily)</option>
                    <option value="BD (Twice daily)">BD (Twice daily)</option>
                    <option value="TDS (3 times daily)">TDS (3 times daily)</option>
                    <option value="QDS (4 times daily)">QDS (4 times daily)</option>
                    <option value="SOS (As needed)">SOS (As needed)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    name="duration"
                    placeholder="5 Days"
                    className="w-full px-3 py-1.5 bg-white rounded-xl text-xs border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    className="w-full h-full py-1.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center justify-center shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>
                <div className="sm:col-span-12">
                  <input
                    name="instructions"
                    placeholder="Special instructions (e.g. Take with warm water after meals)"
                    className="w-full px-3 py-1 bg-white rounded-xl text-[11px] border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </form>

              {/* Active Prescriptions Table */}
              <div className="overflow-x-auto rounded-2xl border border-surface-container-high">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-tertiary uppercase font-black text-[9px] tracking-wider border-b border-surface-container-high">
                    <tr>
                      <th className="p-2.5">Medicine</th>
                      <th className="p-2.5">Dosage</th>
                      <th className="p-2.5">Frequency</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Instructions</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {prescriptions.map(p => (
                      <tr key={p.id} className="hover:bg-surface-container-low/50">
                        <td className="p-2.5 font-bold text-on-surface">{p.drug}</td>
                        <td className="p-2.5 text-slate-700">{p.dosage}</td>
                        <td className="p-2.5 text-slate-700">{p.frequency}</td>
                        <td className="p-2.5 text-slate-700">{p.duration}</td>
                        <td className="p-2.5 text-tertiary text-[11px]">{p.instructions}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => setPrescriptions(prev => prev.filter(item => item.id !== p.id))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diagnostic Lab Ordering */}
            <div className="space-y-3 pt-4 border-t border-surface-container-high">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Diagnostic Lab Investigations Order</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Complete Blood Count (CBC)',
                  'Rapid Malarial Antigen (Pf/Pv)',
                  'Sickle Cell Solubility Test',
                  'Fasting Blood Glucose',
                  'Serum Creatinine & Electrolytes',
                  'Urine Routine & Microscopic'
                ].map(lab => {
                  const isSelected = selectedLabs.includes(lab);
                  return (
                    <button
                      key={lab}
                      onClick={() => toggleLab(lab)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm'
                          : 'bg-white border-surface-container-high text-tertiary hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm text-teal-600">
                        {isSelected ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span className="truncate">{lab}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-surface-container-high">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    alert(`Prescription and Lab Order for ${selectedPatient.name} dispatched to Pharmacy & Lab.`);
                  }}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>Submit Encounter & Order EDL Drugs</span>
                </button>
                <Link
                  href="/referrals"
                  className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">alt_route</span>
                  <span>Refer Patient</span>
                </Link>
              </div>

              <button
                onClick={handleStartTeleconsult}
                className="px-4 py-2.5 bg-teal-50 text-teal-800 hover:bg-teal-100 font-bold text-xs rounded-xl border border-teal-200 flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-base">video_call</span>
                <span>Launch Teleconsult</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
