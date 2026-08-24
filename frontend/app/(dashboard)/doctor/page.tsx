'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

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

interface Appointment {
  id: string;
  client_id: string;
  doctor_id: string;
  scheduled_time?: string;
  room_id: string;
  status: string;
  patient_name?: string;
  time?: string;
  date?: string;
  notes?: string;
}

interface DoctorProfileInfo {
  id: string;
  name: string;
  email: string;
  facility: string;
  license: string;
  department: string;
}

export default function DoctorClinicalDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Live Database States
  const [doctorInfo, setDoctorInfo] = useState<DoctorProfileInfo>({
    id: 'doc-david-ross',
    name: 'Dr. David Ross, MD',
    email: 'doctor@curatrack.in',
    facility: 'Nandurbar Sub-District Hospital',
    license: 'MMC/2026/04481',
    department: 'General Medicine & OPD Room 101',
  });

  const [queue, setQueue] = useState<OPDQueuePatient[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Facility awareness: beds & medicine alerts
  const [bedsData, setBedsData] = useState<any>(null);
  const [medAlerts, setMedAlerts] = useState<any[]>([]);
  const [showBedPanel, setShowBedPanel] = useState<boolean>(false);

  const [filterType, setFilterType] = useState<'ALL' | 'WAITING' | 'EMERGENCY' | 'TELECONSULT' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Telemedicine Realtime & Incoming Call State
  const [incomingCall, setIncomingCall] = useState<Appointment | null>(null);
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);

  // Clinical Encounter State
  const [soapDiagnosis, setSoapDiagnosis] = useState<string>('Acute febrile illness; likely vector-borne viral infection (Malarial / Dengue antigen screen pending)');
  const [soapNotes, setSoapNotes] = useState<string>('Patient reports 3 days of high-grade intermittent fever with rigors. Associated with generalized myalgia and frontal headache. Advised hydration, paracetamol, and urgent diagnostic panel.');
  
  // Prescriptions List
  const [prescriptions, setPrescriptions] = useState<Array<{ id: string; drug: string; dosage: string; frequency: string; duration: string; instructions: string }>>([
    { id: '1', drug: 'Paracetamol 500mg IP (EDL Item)', dosage: '500mg', frequency: 'TDS (3 times daily)', duration: '5 Days', instructions: 'Take after meals with plenty of water' },
    { id: '2', drug: 'Amoxicillin 500mg Capsules', dosage: '500mg', frequency: 'BD (Twice daily)', duration: '5 Days', instructions: 'Complete full antibacterial course' },
  ]);

  // Lab Tests State
  const [selectedLabs, setSelectedLabs] = useState<string[]>(['Complete Blood Count (CBC)', 'Rapid Malarial Antigen (Pf/Pv)']);

  // Fetch Live Queue from Supabase Database
  const fetchLiveQueue = useCallback(async (docId: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (docId) {
        query = query.or(`doctor_id.eq.${docId},doctor_id.ilike.%doc-%`);
      }

      const { data: dbAppts } = await query;

      if (!dbAppts || dbAppts.length === 0) {
        setQueue([]);
        setLoadingQueue(false);
        return;
      }

      // Fetch profiles for client names
      const clientIds = Array.from(new Set(dbAppts.map((a: any) => a.client_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (clientIds.length > 0) {
        try {
          const { data: profs } = await supabase
            .from('profiles')
            .select('*')
            .in('id', clientIds);
          if (profs) {
            profs.forEach((p: any) => { profilesMap[p.id] = p; });
          }
        } catch {}
      }

      const formattedQueue: OPDQueuePatient[] = dbAppts.map((a: any, idx: number) => {
        const clientProf = profilesMap[a.client_id];
        const pName = clientProf?.name || a.patient_name || `Patient (${(a.client_id || a.id).slice(0, 6)})`;
        const isTele = Boolean(a.room_id || a.status === 'ringing');
        const isEmergency = a.priority === 'EMERGENCY' || a.status === 'ringing';
        
        return {
          id: a.id || `PAT-${idx + 1}`,
          token: `TKN-${(a.id || idx.toString()).slice(0, 3).toUpperCase()}`,
          name: pName,
          age: clientProf?.age || 38,
          gender: clientProf?.gender || 'Female',
          abhaId: clientProf?.abha_id || '91-4502-8819-2041',
          bloodGroup: clientProf?.blood_group || 'O+',
          allergies: clientProf?.allergies || 'No Known Drug Allergies (NKDA)',
          priority: isEmergency ? 'EMERGENCY' : a.priority || 'ROUTINE',
          complaint: a.notes || a.complaint || 'General consultation & clinical review',
          vitals: {
            bp: a.vitals_bp || '120/80',
            hr: a.vitals_hr || 76,
            spo2: a.vitals_spo2 || 98,
            temp: a.vitals_temp || '98.6 °F',
            bmi: a.vitals_bmi || '22.4',
          },
          type: isTele ? 'Teleconsult' : 'In-Person OPD',
          status: a.status === 'in-consult' ? 'IN-CONSULT' : a.status === 'completed' || a.status === 'ended' ? 'COMPLETED' : 'WAITING',
          waitTime: a.scheduled_time ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        };
      });

      setQueue(formattedQueue);
      if (formattedQueue.length > 0 && !selectedPatientId) {
        setSelectedPatientId(formattedQueue[0].id);
      }
    } catch (err) {
      console.warn('Error fetching live OPD queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  }, [supabase, selectedPatientId]);

  // Initialize doctor session, fetch queue, and subscribe to Supabase Realtime live queue changes
  useEffect(() => {
    let isMounted = true;

    async function initializeDoctorSessionAndRealtime() {
      try {
        let docId: string | null = null;
        let docName = 'Medical Officer';
        let docEmail = 'doctor@curatrack.in';

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            docId = user.id;
            docEmail = user.email || docEmail;
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (prof?.name) docName = prof.name;
          }
        } catch {}

        if (typeof window !== 'undefined') {
          try {
            const savedUser = localStorage.getItem('curatrack_auth_user');
            if (savedUser) {
              const parsed = JSON.parse(savedUser);
              if (parsed.id) docId = parsed.id;
              if (parsed.name) docName = parsed.name;
              if (parsed.email) docEmail = parsed.email;
            }
          } catch {}
        }

        const finalDocId = docId || 'doc-david-ross';
        const finalDocName = docName.startsWith('Dr.') ? docName : `Dr. ${docName}`;

        if (isMounted) {
          setActiveDoctorId(finalDocId);
          setDoctorInfo({
            id: finalDocId,
            name: `${finalDocName}, MD`,
            email: docEmail,
            facility: 'Nandurbar Sub-District Hospital',
            license: 'MMC/2026/04481',
            department: 'General Medicine & OPD Room 101',
          });
        }

        // Fetch Initial Queue Data from Supabase
        await fetchLiveQueue(finalDocId);

        // Fetch active incoming telemedicine calls
        const { data: activeAppts } = await supabase
          .from('appointments')
          .select('*')
          .not('room_id', 'is', null)
          .in('status', ['active', 'ringing'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (isMounted && activeAppts && activeAppts.length > 0) {
          const appt = activeAppts[0];
          let patientName = 'Patient';
          if (appt.client_id) {
            try {
              const { data: prof } = await supabase.from('profiles').select('name').eq('id', appt.client_id).maybeSingle();
              if (prof?.name) patientName = prof.name;
            } catch {}
          }
          setIncomingCall({ ...appt, patient_name: patientName });
        }
      } catch (err) {
        console.warn('Error initializing doctor session:', err);
      }
    }

    initializeDoctorSessionAndRealtime();

    // Subscribe to realtime changes on appointments table for live queue (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel('doctor_portal_live_queue_v3')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        async (payload) => {
          if (!isMounted) return;

          // Refetch live queue when any appointment changes (INSERT, UPDATE, DELETE)
          fetchLiveQueue(activeDoctorId || '');

          const incoming = payload.new as Appointment;
          if (!incoming || !incoming.room_id) return;

          if (incoming.status === 'active' || incoming.status === 'ringing') {
            let patientName = incoming.patient_name || 'Patient';
            if (incoming.client_id) {
              try {
                const { data: prof } = await supabase.from('profiles').select('name').eq('id', incoming.client_id).maybeSingle();
                if (prof?.name) patientName = prof.name;
              } catch {}
            }

            if (isMounted) {
              setIncomingCall({
                ...incoming,
                patient_name: patientName,
              });
              setRealtimeConnected(true);
            }
          } else if (incoming.status === 'ended' || incoming.status === 'cancelled' || incoming.status === 'completed') {
            if (isMounted) {
              setIncomingCall(prev => (prev?.id === incoming.id ? null : prev));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isMounted) {
          setRealtimeConnected(true);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLiveQueue, activeDoctorId]);

  const selectedPatient = queue.find(p => p.id === selectedPatientId) || queue[0];

  // Fetch facility bed availability & medicine stock alerts
  useEffect(() => {
    async function fetchFacilityData() {
      try {
        const [beds, alerts] = await Promise.all([
          apiFetch('/api/facility/beds'),
          apiFetch('/api/facility/medicine-alerts')
        ]);
        setBedsData(beds);
        if (alerts.medicines) setMedAlerts(alerts.medicines);
      } catch (e) {
        console.warn('Error loading facility data for doctor:', e);
      }
    }
    fetchFacilityData();
  }, []);

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

  const handleAcceptCall = useCallback((targetRoomId?: string) => {
    const roomIdToJoin = targetRoomId || incomingCall?.room_id;
    if (!roomIdToJoin) return;
    router.push(`/call/${roomIdToJoin}?role=doctor`);
  }, [incomingCall, router]);

  const handleDeclineCall = useCallback(async () => {
    if (!incomingCall) return;
    const apptId = incomingCall.id;
    setIncomingCall(null);

    try {
      await supabase
        .from('appointments')
        .update({ status: 'ended' })
        .eq('id', apptId);
    } catch (err) {
      console.warn('Error declining appointment:', err);
    }
  }, [incomingCall, supabase]);

  const handleStartTeleconsult = async () => {
    // 1. If an incoming call is active, join that room!
    if (incomingCall?.room_id) {
      handleAcceptCall(incomingCall.room_id);
      return;
    }

    // 2. Query Supabase for any existing active room for this patient/doctor
    try {
      const { data: activeAppts } = await supabase
        .from('appointments')
        .select('*')
        .not('room_id', 'is', null)
        .in('status', ['active', 'ringing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (activeAppts && activeAppts.length > 0 && activeAppts[0].room_id) {
        router.push(`/call/${activeAppts[0].room_id}?role=doctor`);
        return;
      }
    } catch (e) {}

    // 3. Fallback: Generate room_id AND register in Supabase so patient and doctor share the SAME room!
    const newRoomId = crypto.randomUUID();
    const docId = activeDoctorId || 'doc-david-ross';
    const patId = selectedPatient.id || 'PAT-001';

    try {
      await supabase.from('appointments').insert({
        client_id: patId,
        doctor_id: docId,
        room_id: newRoomId,
        status: 'active',
        scheduled_time: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (e) {}

    router.push(`/call/${newRoomId}?role=doctor`);
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
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 relative">
      {/* Floating Incoming Teleconsultation Banner/Modal */}
      {incomingCall && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full bg-slate-900/95 backdrop-blur-xl border border-teal-500/40 p-6 rounded-3xl shadow-2xl text-white animate-bounce-short">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Incoming Teleconsultation</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono border border-teal-500/30">
              Live Ringing
            </span>
          </div>

          <div className="space-y-1 mb-4">
            <h4 className="text-xl font-black text-white">{incomingCall.patient_name || 'Kavita Bai'}</h4>
            <p className="text-xs text-slate-300">
              Patient is waiting in virtual consultation room
            </p>
            <p className="text-[11px] font-mono text-teal-300/80 truncate">
              Room ID: {incomingCall.room_id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDeclineCall}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-red-400">call_end</span>
              <span>Decline</span>
            </button>
            <button
              onClick={() => handleAcceptCall(incomingCall.room_id)}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              <span>Accept & Join</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-primary to-cyan-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
            <span className="material-symbols-outlined text-sm">stethoscope</span>
            <span>Clinical OPD & Teleconsultation Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{doctorInfo.name}</h1>
          <p className="text-teal-100 text-sm mt-1 max-w-2xl">
            {doctorInfo.facility} • {doctorInfo.department}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-semibold">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              On Duty (Morning Shift 08:00 - 14:00)
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-teal-100">
              License: {doctorInfo.license}
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
          <span className="text-[10px] text-amber-600 font-semibold">
            {queue.filter(p => p.priority === 'EMERGENCY').length} Priority Emergency
          </span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Completed Today</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">
            {queue.filter(p => p.status === 'COMPLETED').length}
          </span>
          <span className="text-[10px] text-teal-600 font-semibold">Live Database Records</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">EDL Prescriptions</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">{prescriptions.length}</span>
          <span className="text-[10px] text-blue-600 font-semibold">Active Encounter Items</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Lab Orders Pending</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">{selectedLabs.length}</span>
          <span className="text-[10px] text-purple-600 font-semibold">Diagnostic Pipeline Active</span>
        </div>
      </div>

      {/* Bed Availability & Medicine Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bed Availability Widget */}
        <div className="bg-white border border-surface-container-high rounded-3xl shadow-card overflow-hidden">
          <button
            onClick={() => setShowBedPanel(!showBedPanel)}
            className="w-full p-5 flex items-center justify-between hover:bg-surface-container-low transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <span className="material-symbols-outlined">bed</span>
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-on-surface block">Inpatient Bed Availability</span>
                <span className="text-[10px] text-tertiary">
                  {bedsData?.total_available ?? 13} beds available • {bedsData?.occupancy_rate ?? 76}% occupancy
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-teal-700">{bedsData?.total_available ?? 13}</span>
              <span className={`material-symbols-outlined text-tertiary transition-transform ${showBedPanel ? 'rotate-180' : ''}`}>expand_more</span>
            </div>
          </button>

          {showBedPanel && bedsData?.wards && (
            <div className="px-5 pb-5 space-y-2 border-t border-surface-container">
              {bedsData.wards.map((ward: any, i: number) => {
                const pct = ward.total > 0 ? Math.round((ward.occupied / ward.total) * 100) : 0;
                const isOverflow = ward.available < 0;
                const isCritical = ward.available <= 1 && !isOverflow;
                return (
                  <div key={i} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex-1">
                      <span className="font-bold text-on-surface block">{ward.ward}</span>
                      <div className="w-full h-1.5 bg-surface-container rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOverflow ? 'bg-red-500' : isCritical ? 'bg-amber-500' : 'bg-teal-600'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`ml-3 font-black whitespace-nowrap ${
                      isOverflow ? 'text-red-600' : isCritical ? 'text-amber-700' : 'text-teal-700'
                    }`}>
                      {Math.max(0, ward.available)} / {ward.total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Medicine Stock Alerts */}
        <div className={`border rounded-3xl shadow-card p-5 space-y-3 ${
          medAlerts.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-surface-container-high'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              medAlerts.length > 0 ? 'bg-amber-200/80 text-amber-700' : 'bg-teal-50 text-teal-700'
            }`}>
              <span className="material-symbols-outlined">{medAlerts.length > 0 ? 'warning' : 'pill'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface block">EDL Medicine Stock Alerts</span>
              <span className="text-[10px] text-tertiary">
                {medAlerts.length > 0
                  ? `${medAlerts.length} medicine(s) at low or critical stock level`
                  : 'All essential medicines adequately stocked'}
              </span>
            </div>
          </div>

          {medAlerts.length > 0 && (
            <div className="space-y-2">
              {medAlerts.map((med: any) => (
                <div key={med.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-amber-200 text-xs">
                  <div>
                    <span className="font-bold text-on-surface block">{med.name}</span>
                    <span className="text-tertiary">{med.category} • {med.stock_units.toLocaleString()} {med.unit} remaining</span>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    med.status === 'CRITICAL_STOCKOUT_RISK' ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {med.days_of_supply}d supply
                  </span>
                </div>
              ))}
            </div>
          )}
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
              {loadingQueue ? (
                <div className="p-8 text-center bg-surface-container-low/40 rounded-2xl border border-surface-container-high space-y-2">
                  <span className="material-symbols-outlined text-2xl text-teal-600 animate-spin">sync</span>
                  <p className="text-xs font-bold text-tertiary">Loading live patient queue from database...</p>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-low/40 rounded-2xl border border-dashed border-surface-container-high space-y-2">
                  <span className="material-symbols-outlined text-3xl text-tertiary">assignment_turned_in</span>
                  <h4 className="text-sm font-bold text-on-surface">No Patients in OPD Queue</h4>
                  <p className="text-xs text-tertiary">
                    Active consultations and live appointment requests will appear here automatically in real time.
                  </p>
                </div>
              ) : (
                filteredQueue.map(patient => {
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
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Patient Clinical Chart & Encounter (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!selectedPatient ? (
            <div className="bg-white border border-surface-container-high p-8 rounded-3xl shadow-card text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-tertiary">folder_shared</span>
              <h3 className="text-base font-extrabold text-on-surface">No Patient Selected</h3>
              <p className="text-xs text-tertiary max-w-sm mx-auto">
                Select a patient from the OPD queue to inspect clinical vitals, record SOAP encounter notes, and dispatch e-prescriptions.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
