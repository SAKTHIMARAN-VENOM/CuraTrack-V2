'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

interface TriageAlert {
  id: string;
  patient_id: string;
  patient_name?: string;
  age?: number | string;
  gender?: string;
  abha_id?: string;
  symptoms?: string[];
  symptom_description?: string;
  red_flags?: string[];
  severity?: number;
  duration_days?: number;
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
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

export default function DoctorTriageDashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [doctorInfo, setDoctorInfo] = useState<{ id: string; name: string }>({
    id: 'doc-david-ross',
    name: 'Dr. David Ross, MD'
  });

  const [alerts, setAlerts] = useState<TriageAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VISIT_EMERGENCY' | 'ONLINE_CONSULTATION' | 'ROUTINE' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlert, setSelectedAlert] = useState<TriageAlert | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Fetch Doctor Info
  useEffect(() => {
    async function loadDoctor() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('name, role').eq('id', user.id).maybeSingle();
          if (prof?.name) setDoctorInfo({ id: user.id, name: prof.name });
        }
      } catch {}
    }
    loadDoctor();
  }, [supabase]);

  // 2. Fetch Triage Alerts from Supabase + Backend API
  const fetchTriageAlerts = useCallback(async () => {
    setLoading(true);
    try {
      // First try Supabase table `self_triage`
      const { data: dbAlerts, error } = await supabase
        .from('self_triage')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbAlerts && dbAlerts.length > 0) {
        setAlerts(dbAlerts as TriageAlert[]);
        setLoading(false);
        return;
      }

      // Fallback to FastAPI backend endpoint
      const apiRes = await apiFetch('/api/triage/self-assessments');
      if (apiRes.assessments) {
        setAlerts(apiRes.assessments);
      }
    } catch (e) {
      console.warn('Error fetching doctor triage alerts:', e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTriageAlerts();
  }, [fetchTriageAlerts]);

  // 3. Supabase Real-time Subscription for Live Incoming Patient Triage Alerts
  useEffect(() => {
    const channel = supabase
      .channel('doctor_triage_alerts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'self_triage' },
        () => {
          fetchTriageAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchTriageAlerts]);

  // Status updates
  const handleUpdateStatus = async (alertId: string, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    setUpdatingId(alertId);
    try {
      const nowIso = new Date().toISOString();
      // Try Supabase update
      try {
        await supabase
          .from('self_triage')
          .update({
            status: newStatus,
            acknowledged_by: doctorInfo.name,
            acknowledged_at: newStatus === 'ACKNOWLEDGED' ? nowIso : undefined,
            resolved_at: newStatus === 'RESOLVED' ? nowIso : undefined
          })
          .eq('id', alertId);
      } catch {}

      // Backend API sync
      try {
        await apiFetch(`/api/triage/self-assessments/${alertId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: newStatus,
            acknowledged_by: doctorInfo.name
          })
        });
      } catch {}

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? {
                ...a,
                status: newStatus,
                acknowledged_by: doctorInfo.name,
                acknowledged_at: newStatus === 'ACKNOWLEDGED' ? nowIso : a.acknowledged_at,
                resolved_at: newStatus === 'RESOLVED' ? nowIso : a.resolved_at
              }
            : a
        )
      );

      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update alert status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics counts
  const emergencyCount = useMemo(() => alerts.filter(a => a.urgency === 'RED' && a.status !== 'RESOLVED').length, [alerts]);
  const onlineConsultCount = useMemo(() => alerts.filter(a => (a.urgency === 'YELLOW' || a.teleconsult_recommended) && a.status !== 'RESOLVED').length, [alerts]);
  const routineCount = useMemo(() => alerts.filter(a => a.urgency === 'GREEN' && a.status !== 'RESOLVED').length, [alerts]);

  // Filtered list
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(a => {
        // Tab filtering
        if (activeTab === 'VISIT_EMERGENCY') return a.urgency === 'RED' && a.status !== 'RESOLVED';
        if (activeTab === 'ONLINE_CONSULTATION') return (a.urgency === 'YELLOW' || a.teleconsult_recommended) && a.status !== 'RESOLVED';
        if (activeTab === 'ROUTINE') return a.urgency === 'GREEN' && a.status !== 'RESOLVED';
        if (activeTab === 'RESOLVED') return a.status === 'RESOLVED';
        return a.status !== 'RESOLVED'; // ALL active
      })
      .filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (a.patient_name || '').toLowerCase().includes(q) ||
          (a.id || '').toLowerCase().includes(q) ||
          (a.symptom_description || '').toLowerCase().includes(q) ||
          (a.symptoms || []).some(s => s.toLowerCase().includes(q))
        );
      });
  }, [alerts, activeTab, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 border border-white/15">
              <span className="material-symbols-outlined text-sm">assignment_late</span>
              <span>Clinical Triage Dispatch &amp; Patient Routing</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Doctor Triage Priority &amp; Consult Queue</h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Live intake of incoming patient emergency self-assessments and village danger reports. Classify immediate hospital visits vs. digital teleconsultations in real time.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchTriageAlerts}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all border border-white/15"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Refresh Feed</span>
            </button>
            <Link
              href="/telemedicine"
              className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">video_chat</span>
              <span>Telemed Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Red Emergency Count */}
        <div
          onClick={() => setActiveTab('VISIT_EMERGENCY')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'VISIT_EMERGENCY'
              ? 'bg-red-600 text-white border-red-600 shadow-lg ring-2 ring-red-400'
              : 'bg-white border-red-200 hover:border-red-400 hover:bg-red-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${activeTab === 'VISIT_EMERGENCY' ? 'text-red-100' : 'text-red-700'}`}>
              🚨 In-Person Visit Needed
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'VISIT_EMERGENCY' ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
              <span className="material-symbols-outlined text-lg animate-pulse">crisis_alert</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-black">{emergencyCount}</h3>
            <span className={`text-xs ${activeTab === 'VISIT_EMERGENCY' ? 'text-red-100' : 'text-tertiary'}`}>critical alerts</span>
          </div>
        </div>

        {/* Yellow Online Consult Count */}
        <div
          onClick={() => setActiveTab('ONLINE_CONSULTATION')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'ONLINE_CONSULTATION'
              ? 'bg-amber-600 text-white border-amber-600 shadow-lg ring-2 ring-amber-400'
              : 'bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${activeTab === 'ONLINE_CONSULTATION' ? 'text-amber-100' : 'text-amber-700'}`}>
              💻 Online Teleconsult
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'ONLINE_CONSULTATION' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
              <span className="material-symbols-outlined text-lg">video_camera_front</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-black">{onlineConsultCount}</h3>
            <span className={`text-xs ${activeTab === 'ONLINE_CONSULTATION' ? 'text-amber-100' : 'text-tertiary'}`}>within 24h</span>
          </div>
        </div>

        {/* Green Routine Count */}
        <div
          onClick={() => setActiveTab('ROUTINE')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'ROUTINE'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg ring-2 ring-emerald-400'
              : 'bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${activeTab === 'ROUTINE' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              📋 Home / ASHA Monitoring
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'ROUTINE' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
              <span className="material-symbols-outlined text-lg">home_health</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-black">{routineCount}</h3>
            <span className={`text-xs ${activeTab === 'ROUTINE' ? 'text-emerald-100' : 'text-tertiary'}`}>stable cases</span>
          </div>
        </div>

        {/* Resolved Count */}
        <div
          onClick={() => setActiveTab('RESOLVED')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'RESOLVED'
              ? 'bg-slate-700 text-white border-slate-700 shadow-lg ring-2 ring-slate-400'
              : 'bg-white border-surface-container-high hover:border-surface-container hover:bg-surface-container-low shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${activeTab === 'RESOLVED' ? 'text-slate-200' : 'text-tertiary'}`}>
              ✓ Resolved / Handled
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === 'RESOLVED' ? 'bg-white/20' : 'bg-surface-container text-tertiary'}`}>
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-3xl font-black">{alerts.filter(a => a.status === 'RESOLVED').length}</h3>
            <span className={`text-xs ${activeTab === 'RESOLVED' ? 'text-slate-200' : 'text-tertiary'}`}>completed</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-surface-container-high w-full md:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'ALL'
                ? 'bg-white text-on-surface shadow-sm'
                : 'text-tertiary hover:text-on-surface'
            }`}
          >
            All Active ({emergencyCount + onlineConsultCount + routineCount})
          </button>
          <button
            onClick={() => setActiveTab('VISIT_EMERGENCY')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'VISIT_EMERGENCY'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span>Must Visit ({emergencyCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('ONLINE_CONSULTATION')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'ONLINE_CONSULTATION'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span>Online Teleconsult ({onlineConsultCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('ROUTINE')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'ROUTINE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Routine ({routineCount})
          </button>
          <button
            onClick={() => setActiveTab('RESOLVED')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'RESOLVED'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-tertiary hover:text-on-surface'
            }`}
          >
            Resolved
          </button>
        </div>

        {/* Search */}
        <div className="w-full md:w-72 flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-surface-container-high shadow-xs">
          <span className="material-symbols-outlined text-tertiary text-lg">search</span>
          <input
            type="text"
            placeholder="Search patient, symptoms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold bg-transparent outline-none text-on-surface placeholder:text-tertiary"
          />
        </div>
      </div>

      {/* Main Alerts Feed Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin text-xl">sync</span>
          <span>Loading real-time triage intake stream...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-surface-container-high space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">task_alt</span>
          </div>
          <h3 className="font-extrabold text-base text-on-surface">No Pending Alerts In This Category</h3>
          <p className="text-xs text-tertiary max-w-md mx-auto">
            All patient self-assessments in this queue have been triaged, acknowledged, or resolved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlerts.map(alert => {
            const isRed = alert.urgency === 'RED';
            const isYellow = alert.urgency === 'YELLOW';
            const isEmergencyVisit = isRed || alert.consult_action === 'VISIT_EMERGENCY';

            return (
              <div
                key={alert.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between gap-4 bg-white shadow-sm hover:shadow-md ${
                  isRed
                    ? 'border-red-300 ring-1 ring-red-500/30 hover:border-red-500'
                    : isYellow
                    ? 'border-amber-300 ring-1 ring-amber-500/30 hover:border-amber-500'
                    : 'border-surface-container-high hover:border-primary'
                }`}
              >
                {/* Card Top: Urgency Badge & Time */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isRed ? 'bg-red-100 text-red-800' :
                      isYellow ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isRed ? 'bg-red-600 animate-ping' : isYellow ? 'bg-amber-600' : 'bg-emerald-600'}`} />
                      <span>{alert.urgency} TIER</span>
                    </span>

                    <span className="text-[11px] font-mono text-tertiary">
                      {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                    </span>
                  </div>

                  {/* Consultation Pathway Indicator */}
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    isEmergencyVisit
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-teal-50 text-teal-900 border border-teal-200'
                  }`}>
                    <span className="material-symbols-outlined text-base">
                      {isEmergencyVisit ? 'local_hospital' : 'video_chat'}
                    </span>
                    <span>
                      {isEmergencyVisit ? '🚨 MUST VISIT HOSPITAL / OPD' : '💻 ONLINE TELECONSULT CANDIDATE'}
                    </span>
                  </div>

                  {/* Patient Info Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-base text-on-surface">
                        {alert.patient_name || 'Anonymous Patient'}
                      </h4>
                      <p className="text-xs text-tertiary">
                        {alert.age ? `${alert.age} yrs` : 'Age N/A'} • {alert.gender || 'Unspecified'}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container text-tertiary">
                      {alert.id}
                    </span>
                  </div>

                  {/* Red Flags / Danger Signs */}
                  {alert.red_flags && alert.red_flags.length > 0 && (
                    <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 space-y-1">
                      <span className="text-[10px] font-black text-red-800 uppercase tracking-wider block">
                        Danger Flags:
                      </span>
                      {alert.red_flags.map((rf, idx) => (
                        <p key={idx} className="text-xs font-bold text-red-900 leading-tight">
                          ⚠️ {rf}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Presenting Symptoms */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-tertiary">Reported Symptoms:</span>
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {alert.symptom_description || (alert.symptoms || []).join(', ') || 'No narrative provided'}
                    </p>
                  </div>

                  {/* Recorded Vitals Pill Bar (if any) */}
                  {alert.vitals && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                      {alert.vitals.spo2 && (
                        <div className={`p-1.5 rounded-lg text-[11px] font-bold ${Number(alert.vitals.spo2) < 92 ? 'bg-red-100 text-red-900' : 'bg-surface-container text-slate-800'}`}>
                          <span className="block text-[9px] uppercase text-tertiary">SpO2</span>
                          <span>{alert.vitals.spo2}%</span>
                        </div>
                      )}
                      {alert.vitals.heart_rate && (
                        <div className="p-1.5 rounded-lg text-[11px] font-bold bg-surface-container text-slate-800">
                          <span className="block text-[9px] uppercase text-tertiary">HR</span>
                          <span>{alert.vitals.heart_rate} bpm</span>
                        </div>
                      )}
                      {alert.vitals.systolic_bp && (
                        <div className={`p-1.5 rounded-lg text-[11px] font-bold ${Number(alert.vitals.systolic_bp) > 140 ? 'bg-amber-100 text-amber-900' : 'bg-surface-container text-slate-800'}`}>
                          <span className="block text-[9px] uppercase text-tertiary">BP</span>
                          <span>{alert.vitals.systolic_bp} sys</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-surface-container-high space-y-2">
                  <div className="flex gap-2">
                    {/* Teleconsult or In-person trigger */}
                    {isEmergencyVisit ? (
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">local_hospital</span>
                        <span>Emergency Order</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/telemedicine?patientId=${alert.patient_id}&patientName=${encodeURIComponent(alert.patient_name || 'Patient')}`)}
                        className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">video_chat</span>
                        <span>Launch Consult</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="px-3 py-2.5 bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-all"
                    >
                      Details
                    </button>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center justify-between text-[11px] text-tertiary pt-1">
                    <span>Status: <strong>{alert.status}</strong></span>
                    {alert.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'ACKNOWLEDGED')}
                        disabled={updatingId === alert.id}
                        className="text-primary hover:underline font-bold"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                        disabled={updatingId === alert.id}
                        className="text-emerald-700 hover:underline font-bold"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALERT DETAILS DRAWER / MODAL                                              */}
      {/* ========================================================================= */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-surface-container-high">
            <div className="p-6 border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
                  selectedAlert.urgency === 'RED' ? 'bg-red-100 text-red-800' :
                  selectedAlert.urgency === 'YELLOW' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedAlert.urgency} TIER ALERT
                </span>
                <h3 className="font-black text-lg text-on-surface">{selectedAlert.patient_name}</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Consultation Decision Banner */}
              <div className={`p-4 rounded-2xl border ${
                selectedAlert.urgency === 'RED' ? 'bg-red-50 border-red-200 text-red-950' : 'bg-teal-50 border-teal-200 text-teal-950'
              }`}>
                <p className="font-extrabold text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    {selectedAlert.urgency === 'RED' ? 'warning' : 'info'}
                  </span>
                  <span>Clinical Pathway Recommendation:</span>
                </p>
                <p className="mt-1 font-semibold">
                  {selectedAlert.urgency === 'RED'
                    ? 'Patient requires IMMEDIATE IN-PERSON emergency evaluation & bed triage.'
                    : 'Patient is eligible for assisted ONLINE VIDEO TELECONSULTATION.'}
                </p>
                <p className="mt-2 text-tertiary">Facility: <strong>{selectedAlert.recommended_facility}</strong></p>
              </div>

              {/* Red flags */}
              {selectedAlert.red_flags && selectedAlert.red_flags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-red-700 uppercase tracking-wider text-[11px]">Emergency Red Flags Triggered:</h4>
                  <div className="space-y-1">
                    {selectedAlert.red_flags.map((f, i) => (
                      <p key={i} className="p-2 bg-red-100/70 text-red-900 rounded-xl font-bold">⚠️ {f}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptoms */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-on-surface uppercase tracking-wider text-[11px]">Reported Symptoms &amp; Narrative:</h4>
                <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container">
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {selectedAlert.symptom_description || (selectedAlert.symptoms || []).join(', ') || 'None provided'}
                  </p>
                  {selectedAlert.symptoms && selectedAlert.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedAlert.symptoms.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white rounded-md text-[10px] font-bold text-slate-700 border">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Immediate Actions */}
              {selectedAlert.immediate_actions && selectedAlert.immediate_actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-on-surface uppercase tracking-wider text-[11px]">Protocol Immediate Actions:</h4>
                  <ul className="space-y-1.5">
                    {selectedAlert.immediate_actions.map((act, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-surface-container flex justify-between gap-3">
              <button
                onClick={() => {
                  handleUpdateStatus(selectedAlert.id, selectedAlert.status === 'PENDING' ? 'ACKNOWLEDGED' : 'RESOLVED');
                  setSelectedAlert(null);
                }}
                className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container font-bold text-xs rounded-xl"
              >
                {selectedAlert.status === 'PENDING' ? 'Mark Acknowledged' : 'Mark Resolved'}
              </button>

              <button
                onClick={() => {
                  setSelectedAlert(null);
                  router.push(`/telemedicine?patientId=${selectedAlert.patient_id}&patientName=${encodeURIComponent(selectedAlert.patient_name || 'Patient')}`);
                }}
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">video_chat</span>
                <span>Open in Teleconsultation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
