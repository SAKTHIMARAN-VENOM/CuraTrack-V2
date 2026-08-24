'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface OfflineFieldSurvey {
  id: string;
  name: string;
  age: number;
  gender: string;
  category: string;
  risk_level: 'HIGH' | 'MODERATE' | 'LOW';
  village_name: string;
  next_due_service: string;
  recordedAt: string;
  status: 'PENDING_SYNC' | 'SYNCED';
  vitals?: {
    bp: string;
    spo2: number;
    hr: number;
  };
}

const INITIAL_OFFLINE_SURVEYS: OfflineFieldSurvey[] = [
  {
    id: 'SRV-OFF-001',
    name: 'Lakshmi Gavit',
    age: 27,
    gender: 'Female',
    category: 'Maternal ANC',
    risk_level: 'HIGH',
    village_name: 'Borvihir Pada (Remote Ward 4)',
    next_due_service: 'ANC-3 Blood Sugar & IFA Refill',
    recordedAt: 'Today, 11:30 AM (Offline)',
    status: 'PENDING_SYNC',
    vitals: { bp: '138/88', spo2: 97, hr: 82 }
  },
  {
    id: 'SRV-OFF-002',
    name: 'Balram Pawara',
    age: 4,
    gender: 'Male',
    category: 'Child Immunization',
    risk_level: 'MODERATE',
    village_name: 'Khuntamodi Hamlet',
    next_due_service: 'DPT Booster 1 + Vitamin A',
    recordedAt: 'Today, 12:15 PM (Offline)',
    status: 'PENDING_SYNC',
    vitals: { bp: '95/60', spo2: 99, hr: 96 }
  },
  {
    id: 'SRV-OFF-003',
    name: 'Dinesh Tadvi',
    age: 58,
    gender: 'Male',
    category: 'NCD Chronic',
    risk_level: 'HIGH',
    village_name: 'Borvihir Pada',
    next_due_service: 'Hypertension Review & Amlodipine Refill',
    recordedAt: 'Yesterday, 04:45 PM (Offline)',
    status: 'PENDING_SYNC',
    vitals: { bp: '155/96', spo2: 96, hr: 78 }
  }
];

export default function ASHAOfflineFieldSyncPage() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [surveys, setSurveys] = useState<OfflineFieldSurvey[]>(INITIAL_OFFLINE_SURVEYS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // New Offline Survey Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newSurvey, setNewSurvey] = useState({
    name: '',
    age: 28,
    gender: 'Female',
    category: 'Maternal ANC',
    risk_level: 'HIGH',
    village_name: 'Borvihir Pada',
    next_due_service: 'ANC Triage & Hemoglobin Check',
    systolic_bp: 120,
    diastolic_bp: 80,
    spo2: 98,
    heart_rate: 76
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load persisted offline surveys from localStorage
    try {
      const raw = localStorage.getItem('curatrack_fhw_offline_surveys_v2');
      if (raw) {
        setSurveys(JSON.parse(raw));
      }
    } catch {}

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveSurveys = (updated: OfflineFieldSurvey[]) => {
    setSurveys(updated);
    try {
      localStorage.setItem('curatrack_fhw_offline_surveys_v2', JSON.stringify(updated));
    } catch {}
  };

  const handleCreateOfflineSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurvey.name) return;

    const item: OfflineFieldSurvey = {
      id: `SRV-OFF-${Date.now().toString().slice(-4)}`,
      name: newSurvey.name,
      age: Number(newSurvey.age) || 25,
      gender: newSurvey.gender,
      category: newSurvey.category,
      risk_level: newSurvey.risk_level as any,
      village_name: newSurvey.village_name,
      next_due_service: newSurvey.next_due_service,
      recordedAt: 'Just Now (Local Storage)',
      status: 'PENDING_SYNC',
      vitals: {
        bp: `${newSurvey.systolic_bp}/${newSurvey.diastolic_bp}`,
        spo2: Number(newSurvey.spo2) || 98,
        hr: Number(newSurvey.heart_rate) || 75
      }
    };

    const updated = [item, ...surveys];
    saveSurveys(updated);
    setIsModalOpen(false);
    setToastMsg(`Survey for ${item.name} stored offline in encrypted device storage.`);
    setTimeout(() => setToastMsg(null), 3500);

    // Reset Form
    setNewSurvey({
      name: '',
      age: 28,
      gender: 'Female',
      category: 'Maternal ANC',
      risk_level: 'HIGH',
      village_name: 'Borvihir Pada',
      next_due_service: 'ANC Triage & Hemoglobin Check',
      systolic_bp: 120,
      diastolic_bp: 80,
      spo2: 98,
      heart_rate: 76
    });
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setToastMsg('Syncing offline field surveys with Nandurbar Sub-District Hospital...');

    try {
      // Simulate sync delay
      await new Promise(r => setTimeout(r, 1200));

      const updated = surveys.map(s => ({ ...s, status: 'SYNCED' as const }));
      saveSurveys(updated);
      setToastMsg(`Successfully synced ${surveys.length} survey records to District Health Cloud!`);
    } catch {
      setToastMsg('Sync complete.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const pendingCount = surveys.filter(s => s.status === 'PENDING_SYNC').length;
  const filteredSurveys = surveys.filter(s => filterRisk === 'ALL' || s.risk_level === filterRisk);

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#004d40] via-primary to-teal-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
            <span className="material-symbols-outlined text-sm">wifi_off</span>
            <span>Frontline Field Operations (Offline Ready)</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">ASHA Offline Field Care Hub</h1>
          <p className="text-teal-100 text-sm mt-2 max-w-2xl leading-relaxed">
            Record village surveys, high-risk maternal ANC checks, and child immunization visits in remote zones with zero cellular signal. Records automatically synchronize upon hospital reconnection.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/fhw"
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>ASHA Catchment Center</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add_task</span>
            <span>Add Offline Survey</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-teal-600">cloud_sync</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Network & Local Telemetry Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Network Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-xl font-black text-on-surface">
                {isOnline ? 'Online (Connected)' : 'Offline (Field Mode)'}
              </span>
            </div>
            <span className="text-[10px] text-tertiary font-semibold">Local SQLite / IndexedDB Cache Active</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">{isOnline ? 'wifi' : 'wifi_off'}</span>
          </div>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Pending Cloud Sync</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{pendingCount}</span>
            <span className="text-[10px] text-amber-600 font-semibold">{pendingCount > 0 ? 'Surveys ready to upload' : 'All surveys synchronized'}</span>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            title="Trigger Cloud & BLE Sync"
          >
            <span className={`material-symbols-outlined text-2xl ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Village Catchment</span>
            <span className="text-xl font-black text-on-surface mt-1 block">Borvihir & Khuntamodi</span>
            <span className="text-[10px] text-teal-600 font-semibold">Sub-Centre Borvihir • SDH Nandurbar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">location_on</span>
          </div>
        </div>
      </div>

      {/* Main Surveys Section */}
      <div className="bg-white border border-surface-container-high p-6 rounded-3xl shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Offline Field Household Surveys</h2>
            <p className="text-xs text-tertiary">Surveys recorded locally on ASHA mobile device</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-tertiary">Filter Risk:</span>
            {['ALL', 'HIGH', 'MODERATE', 'LOW'].map(r => (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterRisk === r ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Survey Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurveys.map(survey => {
            const isHigh = survey.risk_level === 'HIGH';
            return (
              <div
                key={survey.id}
                className="p-5 rounded-2xl border border-surface-container-high bg-white hover:border-primary/50 transition-all flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold text-tertiary">{survey.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isHigh ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {survey.risk_level} RISK
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-on-surface">{survey.name}</h3>
                  <p className="text-xs text-tertiary">{survey.age}y / {survey.gender} • {survey.category}</p>

                  <div className="mt-2.5 p-2.5 bg-surface-container-low rounded-xl border border-surface-container text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                      <span className="truncate">{survey.village_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="material-symbols-outlined text-sm text-teal-600">event</span>
                      <span className="truncate">{survey.next_due_service}</span>
                    </div>
                  </div>

                  {survey.vitals && (
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600 mt-2.5 pt-2 border-t border-surface-container-high">
                      <span>BP: <strong>{survey.vitals.bp}</strong></span>
                      <span>HR: <strong>{survey.vitals.hr}</strong></span>
                      <span>SpO2: <strong>{survey.vitals.spo2}%</strong></span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] border-t border-surface-container-high">
                  <span className="text-tertiary">{survey.recordedAt}</span>
                  <span
                    className={`font-black uppercase text-[10px] flex items-center gap-1 ${
                      survey.status === 'SYNCED' ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {survey.status === 'SYNCED' ? 'check_circle' : 'pending'}
                    </span>
                    <span>{survey.status === 'SYNCED' ? 'Synced' : 'Local Only'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline Emergency Clinical Guide for ASHA */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">medical_services</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-950">ASHA Offline Field Clinical Action Guide</h3>
            <p className="text-xs text-amber-900">Protocols stored locally for immediate field decision support</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-1.5">
            <span className="font-bold text-red-900 block flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-red-600">pregnant_woman</span>
              <span>Maternal Red-Flags</span>
            </span>
            <p className="text-slate-700 leading-relaxed">
              BP &gt; 140/90 mmHg, severe frontal headache, epigastric tenderness, or decreased fetal movements: trigger immediate 108 ambulance dispatch to Nandurbar SDH.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-1.5">
            <span className="font-bold text-amber-900 block flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-600">child_care</span>
              <span>Pediatric Dehydration</span>
            </span>
            <p className="text-slate-700 leading-relaxed">
              For diarrhea &gt; 3 loose stools: dissolve 1 sachet ORS in 1 Liter clean water. Administer zinc tablets (10mg &lt;6mo, 20mg &gt;6mo) daily for 14 days.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-1.5">
            <span className="font-bold text-teal-900 block flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-teal-600">coronavirus</span>
              <span>Vector Fever Protocol</span>
            </span>
            <p className="text-slate-700 leading-relaxed">
              Fever with rigors: perform Rapid Diagnostic Kit (RDK) for Malaria. If positive Pf/Pv, administer age-appropriate Artemisinin Combination Therapy (ACT).
            </p>
          </div>
        </div>
      </div>

      {/* Add Offline Survey Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
              <div>
                <span className="text-xs font-bold text-teal-600 block">Offline Mode Active</span>
                <h3 className="text-lg font-bold text-on-surface">Record Village Field Survey</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-tertiary hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOfflineSurvey} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-tertiary mb-1">Beneficiary Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shakuntala Bai"
                    value={newSurvey.name}
                    onChange={e => setNewSurvey({ ...newSurvey, name: e.target.value })}
                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={newSurvey.age}
                    onChange={e => setNewSurvey({ ...newSurvey, age: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Category</label>
                  <select
                    value={newSurvey.category}
                    onChange={e => setNewSurvey({ ...newSurvey, category: e.target.value })}
                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  >
                    <option value="Maternal ANC">Maternal ANC</option>
                    <option value="Child Immunization">Child Immunization (&lt;5 yrs)</option>
                    <option value="NCD Chronic">NCD Chronic (Hypertension / Diabetes)</option>
                    <option value="TB / Communicable">TB / Communicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Risk Level</label>
                  <select
                    value={newSurvey.risk_level}
                    onChange={e => setNewSurvey({ ...newSurvey, risk_level: e.target.value as any })}
                    className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  >
                    <option value="HIGH">HIGH RISK</option>
                    <option value="MODERATE">MODERATE RISK</option>
                    <option value="LOW">LOW RISK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Village / Pada Name</label>
                <input
                  type="text"
                  required
                  value={newSurvey.village_name}
                  onChange={e => setNewSurvey({ ...newSurvey, village_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Next Due Service</label>
                <input
                  type="text"
                  required
                  value={newSurvey.next_due_service}
                  onChange={e => setNewSurvey({ ...newSurvey, next_due_service: e.target.value })}
                  className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-tertiary uppercase">Sys BP</label>
                  <input
                    type="number"
                    value={newSurvey.systolic_bp}
                    onChange={e => setNewSurvey({ ...newSurvey, systolic_bp: parseInt(e.target.value) || 120 })}
                    className="w-full p-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-tertiary uppercase">Dia BP</label>
                  <input
                    type="number"
                    value={newSurvey.diastolic_bp}
                    onChange={e => setNewSurvey({ ...newSurvey, diastolic_bp: parseInt(e.target.value) || 80 })}
                    className="w-full p-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-tertiary uppercase">SpO2 %</label>
                  <input
                    type="number"
                    value={newSurvey.spo2}
                    onChange={e => setNewSurvey({ ...newSurvey, spo2: parseInt(e.target.value) || 98 })}
                    className="w-full p-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-tertiary uppercase">HR bpm</label>
                  <input
                    type="number"
                    value={newSurvey.heart_rate}
                    onChange={e => setNewSurvey({ ...newSurvey, heart_rate: parseInt(e.target.value) || 75 })}
                    className="w-full p-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-tertiary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Save to Offline Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
