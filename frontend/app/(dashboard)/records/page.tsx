'use client';

import { useState } from 'react';
import AddRecordModal from '@/components/AddRecordModal';
import ReviewMedicationModal from '@/components/ReviewMedicationModal';

export default function HealthRecordsPage() {
  const [activeTab, setActiveTab] = useState('medications');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [extractedMedications, setExtractedMedications] = useState<any[]>([]);
  const [activeMedications, setActiveMedications] = useState<any[]>([
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', time: '08:00 AM', status: 'TAKEN', color: '#d4f0fa', icon: 'medication' },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '01:00 PM with meal', status: 'UPCOMING', color: '#d4f0fa', icon: 'vaccines' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once at night', time: '09:00 PM (yesterday)', status: 'MISSED', color: '#ffdad6', icon: 'medication_liquid', isError: true },
    { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', time: '09:00 PM', status: 'UPCOMING', color: '#d4f0fa', icon: 'pill' },
  ]);
  const [reviewingMedication, setReviewingMedication] = useState<any>(null);
  const [reviewIndex, setReviewIndex] = useState<number>(-1);
  const [userPrescriptions, setUserPrescriptions] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [userLabReports, setUserLabReports] = useState<any[]>([]);

  const handleRecordAdded = (data: any) => {
    // Handle new structured record types
    if (data && data.type === 'prescription') {
      setUserPrescriptions(prev => [data.data, ...prev]);
      setActiveTab('prescriptions');
      return;
    }
    if (data && data.type === 'notes') {
      setUserNotes(prev => [data.data, ...prev]);
      setActiveTab('notes');
      return;
    }
    if (data && data.type === 'lab') {
      setUserLabReports(prev => [data.data, ...prev]);
      setActiveTab('lab');
      return;
    }
    // Legacy: AI-extracted medications
    if (data && data.medications && data.medications.length > 0) {
      setExtractedMedications(prev => [...prev, ...data.medications]);
      setActiveTab('prescriptions');
    }
  };

  const startReview = (med: any, index: number) => {
    setReviewingMedication(med);
    setReviewIndex(index);
    setIsReviewModalOpen(true);
  };

  const handleReviewConfirm = (updatedMed: any) => {
    // Add to active medications
    setActiveMedications(prev => [...prev, {
        ...updatedMed,
        status: 'UPCOMING', // Default status for new confirms
        color: '#d4f0fa',
        icon: 'pill'
    }]);
    
    // Remove the item from the extracted list
    setExtractedMedications(prev => prev.filter((_, i) => i !== reviewIndex));
    setReviewingMedication(null);
    setReviewIndex(-1);
    setActiveTab('medications'); // Switch to medications tab to see the result
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-full uppercase tracking-widest mb-3">Medical History</span>
          <h2 className="font-headline text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-none">Health Records</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-xl">download</span> Export PDF
          </button>
          <button onClick={() => setIsAddRecordModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}>
            <span className="material-symbols-outlined text-xl fill-icon">add_circle</span> Add Record
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 bg-surface-container-low p-1.5 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('medications')} className={`${activeTab === 'medications' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">medication</span>Medications
        </button>
        <button onClick={() => setActiveTab('lab')} className={`${activeTab === 'lab' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">biotech</span>Lab Results
        </button>
        <button onClick={() => setActiveTab('notes')} className={`${activeTab === 'notes' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">description</span>Doctor's Notes
        </button>
        <button onClick={() => setActiveTab('prescriptions')} className={`${activeTab === 'prescriptions' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">receipt_long</span>Prescriptions
        </button>
      </div>

      {/* ===== MEDICATIONS SECTION ===== */}
      {activeTab === 'medications' && (
        <div className="space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Active</p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">4</p>
              <p className="text-xs text-tertiary mt-1">Medications</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Next Dose</p>
              <p className="font-headline text-3xl font-extrabold text-primary">09:00</p>
              <p className="text-xs text-tertiary mt-1">Lisinopril · AM</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Adherence</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">92%</p>
              <p className="text-xs text-tertiary mt-1">This month</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Refill Due</p>
              <p className="font-headline text-3xl font-extrabold text-error">3</p>
              <p className="text-xs text-tertiary mt-1">Days remaining</p>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Today's Medication Schedule</h3>
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Tuesday, May 24</span>
            </div>
            <div className="space-y-4">
              {activeMedications.map((med, idx) => (
                <div key={`active-${idx}`} className={`flex items-center gap-5 p-4 ${med.isError ? 'bg-error-container/40' : 'bg-surface-container-low'} rounded-2xl group hover:bg-surface-container transition-colors`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${med.isError ? 'bg-error-container' : ''}`} style={!med.isError ? { background: med.color } : {}}>
                    <span className={`material-symbols-outlined fill-icon ${med.isError ? 'text-error' : 'text-primary'}`}>{med.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-headline font-bold text-on-surface">{med.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        med.status === 'TAKEN' ? 'status-badge-stable' : 
                        med.status === 'MISSED' ? 'status-badge-urgent' : 
                        'status-badge-pending'
                      }`}>{med.status}</span>
                    </div>
                    <p className="text-sm text-tertiary">{med.dosage} · {med.frequency} · {med.time}</p>
                    <div className="progress-bar mt-3 w-40" style={med.isError ? { background: '#ffdad6' } : {}}>
                      <div className={med.isError ? "" : "progress-fill"} style={med.isError ? { width: '0%', height: '100%', borderRadius: '9999px', background: '#ba1a1a' } : { width: med.status === 'TAKEN' ? '100%' : '0%' }}></div>
                    </div>
                  </div>
                  {med.status === 'TAKEN' ? (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-secondary">08:04 AM</p>
                      <p className="text-xs text-tertiary">Logged</p>
                    </div>
                  ) : med.status === 'MISSED' ? (
                    <button className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-error-container text-on-error-container hover:bg-error/20 transition-colors">Log Missed</button>
                  ) : (
                    <button className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}>{med.icon === 'pill' && idx > 3 ? 'Mark Taken' : 'Mark Taken'}</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Adherence chart + Refill tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly adherence */}
            <div className="section-card p-6">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Weekly Adherence</h3>
              <div className="flex items-end gap-3 h-28">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '80%', background: 'linear-gradient(180deg,#00647e,#2c7d99)' }}></div>
                  <span className="text-[10px] font-bold text-tertiary">Mon</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '100%', background: 'linear-gradient(180deg,#00647e,#2c7d99)' }}></div>
                  <span className="text-[10px] font-bold text-tertiary">Tue</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '75%', background: 'linear-gradient(180deg,#00647e,#2c7d99)' }}></div>
                  <span className="text-[10px] font-bold text-tertiary">Wed</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '50%', background: '#ffdad6' }}></div>
                  <span className="text-[10px] font-bold text-error">Thu</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '90%', background: 'linear-gradient(180deg,#00647e,#2c7d99)' }}></div>
                  <span className="text-[10px] font-bold text-tertiary">Fri</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '100%', background: 'linear-gradient(180deg,#00647e,#2c7d99)' }}></div>
                  <span className="text-[10px] font-bold text-tertiary">Sat</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full rounded-lg" style={{ height: '60%', opacity: 0.4, background: '#edeeef', border: '2px dashed #c1c6d7' }}></div>
                  <span className="text-[10px] font-bold text-tertiary">Sun</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: '#00647e' }}></div><span className="text-xs text-tertiary">Taken</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-error-container"></div><span className="text-xs text-tertiary">Missed</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-surface-container-high"></div><span className="text-xs text-tertiary">Upcoming</span></div>
              </div>
            </div>
            {/* Refill tracker */}
            <div className="section-card p-6">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Refill Tracker</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-bold text-on-surface">Lisinopril 10mg</span>
                    <span className="text-xs font-bold text-error">3 days left</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '15%', background: '#ba1a1a' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-bold text-on-surface">Metformin 500mg</span>
                    <span className="text-xs font-bold text-on-surface-variant">18 days left</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-bold text-on-surface">Atorvastatin 20mg</span>
                    <span className="text-xs font-bold text-on-surface-variant">24 days left</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-bold text-on-surface">Aspirin 81mg</span>
                    <span className="text-xs font-bold text-on-surface-variant">28 days left</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '93%' }}></div>
                  </div>
                </div>
                <button className="w-full mt-2 py-3 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-primary transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">local_pharmacy</span> Request Refill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LAB RESULTS SECTION ===== */}
      {activeTab === 'lab' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Total Tests</p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">12</p>
              <p className="text-xs text-tertiary mt-1">Last 6 months</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Normal</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">9</p>
              <p className="text-xs text-tertiary mt-1">Results</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Flagged</p>
              <p className="font-headline text-3xl font-extrabold text-error">2</p>
              <p className="text-xs text-tertiary mt-1">Needs attention</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Pending</p>
              <p className="font-headline text-3xl font-extrabold text-primary">1</p>
              <p className="text-xs text-tertiary mt-1">In progress</p>
            </div>
          </div>

          {/* Lab results list */}
          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Recent Lab Results</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-xl text-xs font-bold tab-active">All</button>
                <button className="px-3 py-1.5 rounded-xl text-xs font-bold tab-inactive hover:bg-surface-container">Flagged</button>
                <button className="px-3 py-1.5 rounded-xl text-xs font-bold tab-inactive hover:bg-surface-container">Normal</button>
              </div>
            </div>

            <div className="space-y-3">
              {/* User-added lab reports */}
              {userLabReports.map((lab, idx) => (
                <div key={`user-lab-${idx}`} className="rounded-2xl overflow-hidden">
                  <button onClick={() => toggleSection(`user-lab-${idx}`)} className={`w-full flex items-center gap-4 p-5 ${lab.status === 'Flagged' ? 'bg-error-container/30 hover:bg-error-container/50' : 'bg-surface-container-low hover:bg-surface-container'} transition-colors text-left`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${lab.status === 'Flagged' ? 'bg-error-container' : 'bg-primary/10'}`}>
                      <span className={`material-symbols-outlined ${lab.status === 'Flagged' ? 'text-error' : 'text-primary'}`}>biotech</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-headline font-bold text-on-surface">{lab.testName}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lab.status === 'Flagged' ? 'status-badge-urgent' : lab.status === 'Pending' ? 'status-badge-pending' : 'status-badge-stable'}`}>{lab.status?.toUpperCase()}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                      </div>
                      <p className="text-xs text-tertiary">{lab.date} · {lab.labName || 'Unknown Lab'} · {lab.doctor || 'Unknown Doctor'}</p>
                    </div>
                    <span className={`material-symbols-outlined rotate-icon text-tertiary ${openSections[`user-lab-${idx}`] ? 'open' : ''}`}>expand_more</span>
                  </button>
                  <div className={`collapsible-content ${openSections[`user-lab-${idx}`] ? 'open' : ''}`}>
                    <div className="p-5 bg-surface-container-lowest border-t border-outline-variant/10 space-y-3">
                      {lab.results && lab.results.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {lab.results.map((r: any, ri: number) => (
                            <div key={ri} className="p-4 bg-surface-container-low rounded-xl text-center">
                              <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">{r.key}</p>
                              <p className="font-headline text-xl font-extrabold text-on-surface">{r.value}</p>
                              {r.unit && <p className="text-[10px] text-tertiary">{r.unit}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Metabolic Panel */}
              <div className="rounded-2xl overflow-hidden">
                <button onClick={() => toggleSection('lab-metabolic')} className="w-full flex items-center gap-4 p-5 bg-surface-container-low hover:bg-surface-container transition-colors text-left">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">biotech</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-headline font-bold text-on-surface">Comprehensive Metabolic Panel</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">NORMAL</span>
                    </div>
                    <p className="text-xs text-tertiary">May 20, 2025 · Metro City Lab · Dr. Sarah Chen</p>
                  </div>
                  <span className={`material-symbols-outlined rotate-icon text-tertiary ${openSections['lab-metabolic'] ? 'open' : ''}`}>expand_more</span>
                </button>
                <div className={`collapsible-content ${openSections['lab-metabolic'] ? 'open' : ''}`}>
                  <div className="p-5 bg-surface-container-lowest border-t border-outline-variant/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 bg-surface-container-low rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Glucose</p>
                        <p className="font-headline text-xl font-extrabold text-on-surface">98</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-secondary">Normal</span></p>
                      </div>
                      <div className="p-4 bg-surface-container-low rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Creatinine</p>
                        <p className="font-headline text-xl font-extrabold text-on-surface">0.9</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-secondary">Normal</span></p>
                      </div>
                      <div className="p-4 bg-surface-container-low rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">BUN</p>
                        <p className="font-headline text-xl font-extrabold text-on-surface">14</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-secondary">Normal</span></p>
                      </div>
                      <div className="p-4 bg-surface-container-low rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">eGFR</p>
                        <p className="font-headline text-xl font-extrabold text-on-surface">92</p>
                        <p className="text-[10px] text-tertiary">mL/min · <span className="text-secondary">Normal</span></p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                      <span className="material-symbols-outlined text-base">download</span> Download full report (PDF)
                    </button>
                  </div>
                </div>
              </div>

              {/* Lipid Panel - Flagged */}
              <div className="rounded-2xl overflow-hidden">
                <button onClick={() => toggleSection('lab-lipid')} className="w-full flex items-center gap-4 p-5 bg-error-container/30 hover:bg-error-container/50 transition-colors text-left">
                  <div className="w-11 h-11 rounded-xl bg-error-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error">science</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-headline font-bold text-on-surface">Lipid Panel</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-urgent">FLAGGED</span>
                    </div>
                    <p className="text-xs text-tertiary">May 15, 2025 · Metro City Lab · Dr. Marcus Thorne</p>
                  </div>
                  <span className={`material-symbols-outlined rotate-icon text-tertiary ${openSections['lab-lipid'] ? 'open' : ''}`}>expand_more</span>
                </button>
                <div className={`collapsible-content ${openSections['lab-lipid'] ? 'open' : ''}`}>
                  <div className="p-5 bg-surface-container-lowest border-t border-error/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 bg-error-container/30 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">LDL</p>
                        <p className="font-headline text-xl font-extrabold text-error">148</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-error">High</span></p>
                      </div>
                      <div className="p-4 bg-surface-container-low rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">HDL</p>
                        <p className="font-headline text-xl font-extrabold text-on-surface">52</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-secondary">Normal</span></p>
                      </div>
                      <div className="p-4 bg-error-container/30 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Triglycerides</p>
                        <p className="font-headline text-xl font-extrabold text-error">210</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-error">High</span></p>
                      </div>
                      <div className="p-4 bg-surface-container-low rounded-xl text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Total Chol.</p>
                        <p className="font-headline text-xl font-extrabold text-on-surface">220</p>
                        <p className="text-[10px] text-tertiary">mg/dL · <span className="text-secondary">Borderline</span></p>
                      </div>
                    </div>
                    <div className="p-4 bg-error-container/20 rounded-xl flex items-start gap-3">
                      <span className="material-symbols-outlined fill-icon text-error text-xl shrink-0">warning</span>
                      <p className="text-sm text-on-surface-variant">LDL and Triglycerides are above recommended levels. Your physician has been notified. Consider scheduling a follow-up consultation.</p>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                      <span className="material-symbols-outlined text-base">download</span> Download full report (PDF)
                    </button>
                  </div>
                </div>
              </div>

              {/* CBC - Pending */}
              <div className="flex items-center gap-4 p-5 bg-surface-container-low rounded-2xl opacity-70">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">labs</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-headline font-bold text-on-surface">Complete Blood Count (CBC)</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-pending">PROCESSING</span>
                  </div>
                  <p className="text-xs text-tertiary">Collected May 24, 2025 · Results expected in 2–4 hours</p>
                </div>
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
              </div>

              {/* HbA1c */}
              <div className="rounded-2xl overflow-hidden">
                <button onClick={() => toggleSection('lab-hba1c')} className="w-full flex items-center gap-4 p-5 bg-surface-container-low hover:bg-surface-container transition-colors text-left">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">glucose</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-headline font-bold text-on-surface">HbA1c (Glycated Hemoglobin)</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-normal">NORMAL</span>
                    </div>
                    <p className="text-xs text-tertiary">Apr 30, 2025 · Metro City Lab · Dr. Sarah Chen</p>
                  </div>
                  <span className={`material-symbols-outlined rotate-icon text-tertiary ${openSections['lab-hba1c'] ? 'open' : ''}`}>expand_more</span>
                </button>
                <div className={`collapsible-content ${openSections['lab-hba1c'] ? 'open' : ''}`}>
                  <div className="p-5 bg-surface-container-lowest border-t border-outline-variant/10">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Result</p>
                        <p className="font-headline text-4xl font-extrabold text-primary">6.1<span className="text-lg">%</span></p>
                        <p className="text-xs text-secondary mt-1">Within target range</p>
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <div className="h-3 rounded-full" style={{ background: 'linear-gradient(90deg, #006a67 0%, #86d0ef 40%, #fbbc04 70%, #ba1a1a 100%)' }}></div>
                          <div className="absolute top-0 h-3 w-1 bg-on-surface rounded-full" style={{ left: '56%', transform: 'translateX(-50%)' }}></div>
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-tertiary">Normal &lt;5.7%</span>
                          <span className="text-[10px] text-tertiary">Pre-diabetic</span>
                          <span className="text-[10px] text-tertiary">Diabetic &gt;6.5%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DOCTOR'S NOTES SECTION ===== */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main notes list */}
            <div className="lg:col-span-2 space-y-4">
              {/* User-added notes */}
              {userNotes.map((note, idx) => (
                <div key={`user-note-${idx}`} className="section-card overflow-hidden">
                  <div className="p-6 lg:p-8 border-b border-outline-variant/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined fill-icon text-primary text-2xl">person</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-headline font-bold text-on-surface">{note.doctor}</p>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                          </div>
                          <p className="text-xs text-tertiary">{note.specialty || 'General'} · {note.date}</p>
                          {note.visitType && <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">{note.visitType.toUpperCase()}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 lg:p-8 space-y-5">
                    {note.complaint && (
                      <div>
                        <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Chief Complaint</p>
                        <p className="text-sm text-on-surface leading-relaxed">{note.complaint}</p>
                      </div>
                    )}
                    {note.observations && (
                      <div>
                        <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Clinical Observations</p>
                        <p className="text-sm text-on-surface leading-relaxed">{note.observations}</p>
                      </div>
                    )}
                    {note.plan && (
                      <div>
                        <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Assessment &amp; Plan</p>
                        <p className="text-sm text-on-surface leading-relaxed">{note.plan}</p>
                      </div>
                    )}
                    {note.followUp && (
                      <div className="p-4 bg-primary-fixed/40 rounded-xl">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Follow-up</p>
                        <p className="text-sm text-on-surface font-semibold">Next appointment: {note.followUp}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="section-card overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-outline-variant/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                      <div>
                        <p className="font-headline font-bold text-on-surface">Dr. Sarah Chen</p>
                        <p className="text-xs text-tertiary">Primary Care Physician · May 20, 2025</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">CARDIOLOGY FOLLOW-UP</span>
                      </div>
                    </div>
                    <button className="text-tertiary hover:text-primary transition-colors shrink-0">
                      <span className="material-symbols-outlined">download</span>
                    </button>
                  </div>
                </div>
                <div className="p-6 lg:p-8 space-y-5">
                  <div>
                    <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Chief Complaint</p>
                    <p className="text-sm text-on-surface leading-relaxed">Patient presents for routine cardiology follow-up. Reports mild fatigue in the mornings, otherwise stable. No chest pain, palpitations, or dyspnea at rest.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Clinical Observations</p>
                    <p className="text-sm text-on-surface leading-relaxed">BP: 128/82 mmHg (slightly elevated). HR: 72 bpm (normal). Weight: 74 kg. SpO₂: 98%. Cardiovascular: RRR, no murmurs. Respiratory: Clear to auscultation bilaterally.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Assessment &amp; Plan</p>
                    <p className="text-sm text-on-surface leading-relaxed">Continue current antihypertensive regimen. Lipid panel results reviewed — LDL elevation noted; dietary counseling provided. Increase Atorvastatin to 40mg. Repeat lipid panel in 3 months. Recommend moderate aerobic exercise 30 min/day, 5x/week.</p>
                  </div>
                  <div className="p-4 bg-primary-fixed/40 rounded-xl">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Follow-up</p>
                    <p className="text-sm text-on-surface font-semibold">Next appointment: August 20, 2025 at 10:30 AM</p>
                  </div>
                </div>
              </div>

              {/* Second note */}
              <div className="section-card overflow-hidden">
                <div className="p-6 border-b border-outline-variant/10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined fill-icon text-secondary">person</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-on-surface">Dr. Marcus Thorne</p>
                      <p className="text-xs text-tertiary">Endocrinologist · Apr 30, 2025</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-normal">DIABETES MANAGEMENT</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Summary</p>
                    <p className="text-sm text-on-surface leading-relaxed">HbA1c at 6.1% — well within target. Metformin 500mg BID maintaining adequate glycemic control. No signs of peripheral neuropathy. Continue current protocol. Encouraged patient to maintain carbohydrate tracking via the app.</p>
                  </div>
                  <button onClick={() => toggleSection('note-marcus')} className="text-xs font-bold text-primary flex items-center gap-1">
                    <span>Read full note</span><span className={`material-symbols-outlined text-base rotate-icon ${openSections['note-marcus'] ? 'open' : ''}`}>expand_more</span>
                  </button>
                  <div className={`collapsible-content ${openSections['note-marcus'] ? 'open' : ''}`}>
                    <div className="pt-4 border-t border-outline-variant/10 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Examination Findings</p>
                        <p className="text-sm text-on-surface leading-relaxed">Fasting glucose: 104 mg/dL. Foot examination normal. No edema. Reflexes intact. Ophthalmology referral not required at this time.</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Medications Reviewed</p>
                        <p className="text-sm text-on-surface leading-relaxed">Metformin 500mg BID — continue. No additional medications required. Discussed potential for GLP-1 agonist if HbA1c trends upward in next visit.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar: doctors list */}
            <div className="space-y-4">
              <div className="section-card p-6">
                <h3 className="font-headline text-base font-bold text-on-surface mb-4">Care Team</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-white"></span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Dr. Sarah Chen</p>
                      <p className="text-xs text-tertiary">Primary Care</p>
                    </div>
                    <button className="ml-auto text-tertiary hover:text-primary"><span className="material-symbols-outlined text-xl">message</span></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined fill-icon text-secondary text-sm">person</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Dr. Marcus Thorne</p>
                      <p className="text-xs text-tertiary">Endocrinologist</p>
                    </div>
                    <button className="ml-auto text-tertiary hover:text-primary"><span className="material-symbols-outlined text-xl">message</span></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined fill-icon text-primary text-sm">person</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Dr. Elena Rodriguez</p>
                      <p className="text-xs text-tertiary">Cardiologist</p>
                    </div>
                    <button className="ml-auto text-tertiary hover:text-primary"><span className="material-symbols-outlined text-xl">message</span></button>
                  </div>
                </div>
              </div>

              <div className="section-card p-6">
                <h3 className="font-headline text-base font-bold text-on-surface mb-4">Notes Archive</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-tertiary text-lg">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">Annual Check-up</p>
                      <p className="text-[10px] text-tertiary">Jan 15, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-tertiary text-lg">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">ER Visit - Dec 2024</p>
                      <p className="text-[10px] text-tertiary">Dec 3, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-tertiary text-lg">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">Cardiology Consultation</p>
                      <p className="text-[10px] text-tertiary">Oct 10, 2024</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRESCRIPTIONS SECTION ===== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Active Rx</p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">4</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Renewed</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">2</p>
              <p className="text-xs text-tertiary mt-1">This month</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Expired</p>
              <p className="font-headline text-3xl font-extrabold text-error">1</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Refills Left</p>
              <p className="font-headline text-3xl font-extrabold text-primary">6</p>
            </div>
          </div>

          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Active Prescriptions</h3>
              <button className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                <span className="material-symbols-outlined text-base">download</span> Download All
              </button>
            </div>

            <div className="space-y-4">
              {/* User-added prescriptions */}
              {userPrescriptions.map((rx, idx) => (
                <div key={`user-rx-${idx}`} className="p-6 bg-primary-container/20 border border-primary/20 rounded-2xl hover:bg-primary-container/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}>
                        <span className="material-symbols-outlined fill-icon text-white text-2xl">medication</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-headline font-bold text-on-surface text-lg">{rx.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">ACTIVE</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                        </div>
                        <p className="text-sm text-tertiary mb-3">{rx.dosage} · {rx.frequency || 'As directed'} · {rx.date}</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {rx.doctor && (
                            <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                              <span className="text-tertiary">Prescribed by: </span><span className="font-bold text-on-surface">{rx.doctor}</span>
                            </div>
                          )}
                          {rx.refills && (
                            <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                              <span className="text-tertiary">Refills: </span><span className="font-bold text-on-surface">{rx.refills} left</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="p-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors text-tertiary hover:text-primary">
                        <span className="material-symbols-outlined text-xl">download</span>
                      </button>
                    </div>
                  </div>
                  {rx.instructions && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/10">
                      <p className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Instructions</p>
                      <p className="text-sm text-on-surface">{rx.instructions}</p>
                    </div>
                  )}
                </div>
              ))}

              {extractedMedications.map((med, idx) => (
                <div key={`extracted-${idx}`} className="p-6 bg-primary-container/20 border border-primary/20 rounded-2xl hover:bg-primary-container/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}>
                        <span className="material-symbols-outlined fill-icon text-white text-2xl">medication</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-headline font-bold text-on-surface text-lg">{med.name || "Unknown Medication"}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable bg-primary/10 text-primary">NEW (EXTRACTED)</span>
                        </div>
                        <p className="text-sm text-tertiary mb-3">{med.dosage || "N/A"} · {med.frequency || "N/A"} · {med.time || "N/A"}</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {med.reason && (
                            <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                              <span className="text-tertiary">Reason: </span><span className="font-bold text-on-surface">{med.reason}</span>
                            </div>
                          )}
                          <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                            <span className="text-tertiary">AI Confidence: </span><span className="font-bold text-secondary">{Math.round((med.confidence || 0) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => startReview(med, idx)}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" 
                        style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Prescription card: Lisinopril */}
              <div className="p-6 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}>
                      <span className="material-symbols-outlined fill-icon text-white text-2xl">medication</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-headline font-bold text-on-surface text-lg">Lisinopril</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">ACTIVE</span>
                      </div>
                      <p className="text-sm text-tertiary mb-3">10mg · Once daily · Oral · Take in the morning</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Prescribed by: </span><span className="font-bold text-on-surface">Dr. Sarah Chen</span>
                        </div>
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Date: </span><span className="font-bold text-on-surface">May 20, 2025</span>
                        </div>
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Refills: </span><span className="font-bold text-error">1 left</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="p-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors text-tertiary hover:text-primary">
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                    <button className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}>
                      Refill Now
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-outline-variant/10">
                  <p className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Instructions</p>
                  <p className="text-sm text-on-surface">Take 1 tablet by mouth once daily. Avoid NSAIDs and potassium supplements. Monitor blood pressure regularly. Report dizziness or persistent cough to your physician.</p>
                </div>
              </div>

              {/* Prescription card: Metformin */}
              <div className="p-6 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#006a67,#00887f)' }}>
                      <span className="material-symbols-outlined fill-icon text-white text-2xl">vaccines</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-headline font-bold text-on-surface text-lg">Metformin</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">ACTIVE</span>
                      </div>
                      <p className="text-sm text-tertiary mb-3">500mg · Twice daily · Oral · Take with meals</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Prescribed by: </span><span className="font-bold text-on-surface">Dr. Marcus Thorne</span>
                        </div>
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Date: </span><span className="font-bold text-on-surface">Apr 30, 2025</span>
                        </div>
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Refills: </span><span className="font-bold text-on-surface">3 left</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="p-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors text-tertiary hover:text-primary">
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                    <button className="px-4 py-2.5 rounded-xl text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Prescription card: Atorvastatin (updated) */}
              <div className="p-6 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#4a5e73,#62778c)' }}>
                      <span className="material-symbols-outlined fill-icon text-white text-2xl">medication_liquid</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-headline font-bold text-on-surface text-lg">Atorvastatin</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#fff3cd', color: '#856404' }}>UPDATED</span>
                      </div>
                      <p className="text-sm text-tertiary mb-1">40mg · Once daily at bedtime · Oral</p>
                      <p className="text-xs font-semibold text-primary mb-3">⬆ Updated from 20mg on May 20, 2025</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Prescribed by: </span><span className="font-bold text-on-surface">Dr. Sarah Chen</span>
                        </div>
                        <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                          <span className="text-tertiary">Refills: </span><span className="font-bold text-on-surface">2 left</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="p-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors text-tertiary hover:text-primary">
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                    <button className="px-4 py-2.5 rounded-xl text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Expired */}
              <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-outline text-2xl">pill</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-headline font-bold text-on-surface-variant text-lg">Amoxicillin</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-pending">EXPIRED</span>
                    </div>
                    <p className="text-sm text-tertiary">500mg · 3x daily · 7-day course · Completed Mar 12, 2025</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AddRecordModal 
        isOpen={isAddRecordModalOpen} 
        onClose={() => setIsAddRecordModalOpen(false)} 
        onSuccess={handleRecordAdded} 
      />

      {reviewingMedication && (
        <ReviewMedicationModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewingMedication(null);
          }}
          medication={reviewingMedication}
          onConfirm={handleReviewConfirm}
        />
      )}
    </div>
  );
}
