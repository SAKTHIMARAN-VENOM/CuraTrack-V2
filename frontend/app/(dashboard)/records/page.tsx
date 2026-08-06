'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddRecordModal from '@/components/AddRecordModal';
import ReviewMedicationModal from '@/components/ReviewMedicationModal';
import { offlineStorage } from '@/lib/offline-storage';

const DEFAULT_MEDICATIONS = [
  { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', time: '8:00 AM (Morning)', status: 'TAKEN', color: '#d4f0fa', icon: 'pill', isError: false },
  { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '1:00 PM (Afternoon)', status: 'UPCOMING', color: '#d4f0fa', icon: 'pill', isError: false },
  { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', time: '9:00 PM (Night)', status: 'UPCOMING', color: '#e8def8', icon: 'medication', isError: false },
  { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'Once daily', time: '8:00 AM (Morning)', status: 'MISSED', color: '#ffe082', icon: 'pill', isError: true },
];

export default function HealthRecordsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('medications');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [extractedMedications, setExtractedMedications] = useState<any[]>([]);
  const [activeMedications, setActiveMedications] = useState<any[]>([]);
  const [reviewingMedication, setReviewingMedication] = useState<any>(null);
  const [reviewIndex, setReviewIndex] = useState<number>(-1);
  const [userPrescriptions, setUserPrescriptions] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [userLabReports, setUserLabReports] = useState<any[]>([]);
  const [refillStatus, setRefillStatus] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Hydrate medications from offlineStorage
    const cachedMeds = offlineStorage.getMedications();
    if (cachedMeds && cachedMeds.length > 0) {
      setActiveMedications(cachedMeds);
    } else {
      setActiveMedications(DEFAULT_MEDICATIONS);
      offlineStorage.saveMedications(DEFAULT_MEDICATIONS);
    }

    if (!offlineStorage.isOnline()) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      // Flush pending syncs when back online
      const pending = offlineStorage.getPendingSyncs();
      if (pending.length > 0) {
        console.log('Online restored. Processing pending offline sync queue:', pending);
        offlineStorage.clearPendingSyncs();
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dynamic summary stats
  const takenCount = activeMedications.filter(m => m.status === 'TAKEN').length;
  const adherencePercentage = activeMedications.length > 0 
    ? Math.round((takenCount / activeMedications.length) * 100) 
    : 100;
  const nextDoseMed = activeMedications.find(m => m.status === 'UPCOMING');

  const handleExportPDF = () => {
    const text = `CuraTrack Medical History & Health Records Export\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `Active Medications:\n` +
      activeMedications.map(m => `- ${m.name} (${m.dosage}) - Status: ${m.status}`).join('\n') +
      `\n\nPrescriptions: ${userPrescriptions.length}\nDoctor Notes: ${userNotes.length}\nLab Reports: ${userLabReports.length}\n`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CuraTrack_Medical_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRequestRefill = (medName?: string) => {
    const target = medName || 'Lisinopril 10mg';
    setRefillStatus(`Refill request for ${target} submitted to pharmacy.`);
    alert(`💊 Refill request for ${target} has been sent to your preferred pharmacy!`);
  };

  const handleToggleMedicationStatus = (index: number) => {
    setActiveMedications(prev => {
      const updated = prev.map((med, idx) => {
        if (idx !== index) return med;
        const nextStatus: 'TAKEN' | 'MISSED' | 'UPCOMING' = 
          med.status === 'TAKEN' ? 'MISSED' : med.status === 'MISSED' ? 'UPCOMING' : 'TAKEN';
        return {
          ...med,
          status: nextStatus,
          isError: nextStatus === 'MISSED'
        };
      });

      // Save to offline storage immediately
      offlineStorage.saveMedications(updated);

      if (!offlineStorage.isOnline()) {
        offlineStorage.queueOfflineAction({
          type: 'TOGGLE_MEDICATION',
          payload: { index, medication: updated[index] },
          timestamp: Date.now()
        });
      }

      return updated;
    });
  };

  const handleDownloadReport = (reportTitle: string) => {
    const content = `Report Title: ${reportTitle}\nStatus: Complete\nGenerated: ${new Date().toLocaleString()}\nVerified by CuraTrack Medical Team.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '_')}_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMessageDoctor = (doctorName: string) => {
    router.push(`/telemedicine?doctor=${encodeURIComponent(doctorName)}`);
  };

  const handleRecordAdded = (data: any) => {
    // Handle new structured record types
    if (data && data.type === 'prescription') {
      const rxItems = Array.isArray(data.data) ? data.data : [data.data];
      setUserPrescriptions(prev => [...rxItems, ...prev]);

      // Automatically populate activeMedications schedule for today
      const newActiveMeds = rxItems.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency || 'Once daily',
        time: m.time || 'Morning',
        status: 'UPCOMING',
        color: '#d4f0fa',
        icon: 'pill',
        isError: false,
      }));
      setActiveMedications(prev => {
        const updated = [...newActiveMeds, ...prev];
        offlineStorage.saveMedications(updated);
        return updated;
      });
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
    setActiveMedications(prev => {
      const updated = [...prev, {
          ...updatedMed,
          status: 'UPCOMING', // Default status for new confirms
          color: '#d4f0fa',
          icon: 'pill'
      }];
      offlineStorage.saveMedications(updated);
      return updated;
    });
    
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
      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
          <span className="material-symbols-outlined text-amber-600">wifi_off</span>
          <span>Offline Mode • Medication tracking and health records are saved locally</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-full uppercase tracking-widest mb-3">Medical History</span>
          <h2 className="font-headline text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-none">Health Records</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
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
              <p className="font-headline text-3xl font-extrabold text-on-surface">{activeMedications.length}</p>
              <p className="text-xs text-tertiary mt-1">Medications</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Next Dose</p>
              <p className="font-headline text-3xl font-extrabold text-primary">{nextDoseMed ? nextDoseMed.time.split(' ')[0] : 'None'}</p>
              <p className="text-xs text-tertiary mt-1">{nextDoseMed ? `${nextDoseMed.name} · ${nextDoseMed.dosage}` : 'All complete'}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Adherence</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">{adherencePercentage}%</p>
              <p className="text-xs text-tertiary mt-1">This month</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Refill Due</p>
              <p className="font-headline text-3xl font-extrabold text-error">{activeMedications.length > 0 ? '7d' : 'None'}</p>
              <p className="text-xs text-tertiary mt-1">{activeMedications.length > 0 ? 'Days remaining' : 'No active refills'}</p>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Today's Medication Schedule</h3>
              <span suppressHydrationWarning className="text-xs font-bold text-tertiary uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="space-y-4">
              {activeMedications.length === 0 ? (
                <div className="text-center py-8 text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">medication</span>
                  <p className="font-semibold text-sm">No active medications added yet.</p>
                  <p className="text-xs mt-1">Click "Add Record" above to upload or log your medications.</p>
                </div>
              ) : (
                activeMedications.map((med, idx) => (
                  <div key={`active-${idx}`} className={`flex items-center gap-5 p-4 ${med.isError ? 'bg-error-container/40' : 'bg-surface-container-low'} rounded-2xl group hover:bg-surface-container transition-colors`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${med.isError ? 'bg-error-container' : ''}`} style={!med.isError ? { background: med.color } : {}}>
                      <span className={`material-symbols-outlined fill-icon ${med.isError ? 'text-error' : 'text-primary'}`}>
                        {(!med.icon || med.icon === 'capsule') ? 'pill' : med.icon}
                      </span>
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
                    <button 
                      onClick={() => handleToggleMedicationStatus(idx)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        med.status === 'TAKEN' 
                          ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' 
                          : med.status === 'MISSED' 
                          ? 'bg-error-container text-on-error-container hover:bg-error/20' 
                          : 'text-white'
                      }`}
                      style={med.status === 'UPCOMING' ? { background: 'linear-gradient(135deg, #00647e, #2c7d99)' } : {}}
                    >
                      {med.status === 'TAKEN' ? '✓ Taken' : med.status === 'MISSED' ? 'Mark Taken' : 'Mark Taken'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adherence chart + Refill tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly adherence */}
            <div className="section-card p-6">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Weekly Adherence</h3>
              <div className="flex items-end gap-3 h-28">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <div key={day} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className="w-full rounded-lg" 
                      style={{ 
                        height: activeMedications.length > 0 ? `${(80 + (idx * 3) % 20)}%` : '15%', 
                        background: activeMedications.length > 0 ? 'linear-gradient(180deg,#00647e,#2c7d99)' : '#edeeef',
                        opacity: activeMedications.length > 0 ? 1 : 0.4 
                      }}
                    ></div>
                    <span className="text-[10px] font-bold text-tertiary">{day}</span>
                  </div>
                ))}
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
                {activeMedications.length === 0 ? (
                  <div className="text-center py-6 text-tertiary">
                    <p className="text-sm font-semibold">No active medication refills tracked.</p>
                  </div>
                ) : (
                  activeMedications.map((med, idx) => (
                    <div key={`refill-${idx}`}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-bold text-on-surface">{med.name} {med.dosage}</span>
                        <span className="text-xs font-bold text-on-surface-variant">Active</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: med.status === 'TAKEN' ? '100%' : '50%' }}></div>
                      </div>
                    </div>
                  ))
                )}
                {activeMedications.length > 0 && (
                  <button 
                    onClick={() => handleRequestRefill()}
                    className="w-full mt-2 py-3 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">local_pharmacy</span> Request Refill
                  </button>
                )}
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
              <p className="font-headline text-3xl font-extrabold text-on-surface">{userLabReports.length}</p>
              <p className="text-xs text-tertiary mt-1">Uploaded tests</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Normal</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">{userLabReports.filter(l => l.status === 'Normal').length}</p>
              <p className="text-xs text-tertiary mt-1">Results</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Flagged</p>
              <p className="font-headline text-3xl font-extrabold text-error">{userLabReports.filter(l => l.status === 'Flagged').length}</p>
              <p className="text-xs text-tertiary mt-1">Needs attention</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Pending</p>
              <p className="font-headline text-3xl font-extrabold text-primary">{userLabReports.filter(l => l.status === 'Pending').length}</p>
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
              {userLabReports.length === 0 ? (
                <div className="text-center py-10 text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">biotech</span>
                  <p className="font-semibold text-sm">No lab results uploaded yet.</p>
                  <p className="text-xs mt-1">Upload a lab report PDF or prescription to automatically extract test values.</p>
                </div>
              ) : (
                userLabReports.map((lab, idx) => (
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
                        <button 
                          onClick={() => handleDownloadReport(lab.testName)}
                          className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-base">download</span> Download report (PDF)
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
              {userNotes.length === 0 ? (
                <div className="section-card p-10 text-center text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">description</span>
                  <p className="font-semibold text-sm">No doctor's notes recorded yet.</p>
                  <p className="text-xs mt-1">Uploaded clinical notes and consultation summaries will appear here.</p>
                </div>
              ) : (
                userNotes.map((note, idx) => (
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
                ))
              )}
            </div>

            {/* Right sidebar: doctors list & archive */}
            <div className="space-y-4">
              <div className="section-card p-6">
                <h3 className="font-headline text-base font-bold text-on-surface mb-4">Care Team</h3>
                {(() => {
                  const doctors = Array.from(new Set([
                    ...userNotes.map(n => n.doctor),
                    ...userPrescriptions.map(p => p.doctor),
                    ...userLabReports.map(l => l.doctor)
                  ].filter(Boolean)));

                  if (doctors.length === 0) {
                    return (
                      <p className="text-xs text-tertiary text-center py-4">No care team members linked yet.</p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {doctors.map((docName, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-xl">person</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{docName}</p>
                            <p className="text-xs text-tertiary">Physician</p>
                          </div>
                          <button onClick={() => handleMessageDoctor(docName)} className="ml-auto text-tertiary hover:text-primary"><span className="material-symbols-outlined text-xl">message</span></button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="section-card p-6">
                <h3 className="font-headline text-base font-bold text-on-surface mb-4">Notes Archive</h3>
                {userNotes.length === 0 ? (
                  <p className="text-xs text-tertiary text-center py-4">No notes archived.</p>
                ) : (
                  <div className="space-y-2">
                    {userNotes.map((note, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-tertiary text-lg">description</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{note.doctor} - Note</p>
                          <p className="text-[10px] text-tertiary">{note.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <p className="font-headline text-3xl font-extrabold text-on-surface">{userPrescriptions.length + extractedMedications.length}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Renewed</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">0</p>
              <p className="text-xs text-tertiary mt-1">This month</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Expired</p>
              <p className="font-headline text-3xl font-extrabold text-error">0</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Refills Left</p>
              <p className="font-headline text-3xl font-extrabold text-primary">0</p>
            </div>
          </div>

          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Active Prescriptions</h3>
            </div>

            <div className="space-y-4">
              {userPrescriptions.length === 0 && extractedMedications.length === 0 ? (
                <div className="text-center py-10 text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                  <p className="font-semibold text-sm">No active prescriptions logged yet.</p>
                  <p className="text-xs mt-1">Click "Add Record" above to upload a prescription PDF or image.</p>
                </div>
              ) : (
                <>
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
                            </div>
                          </div>
                        </div>
                      </div>
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
                </>
              )}
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
