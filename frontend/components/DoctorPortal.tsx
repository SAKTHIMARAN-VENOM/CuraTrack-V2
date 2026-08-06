'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PatientData {
  id: string;
  name: string;
  meta: string;
  photo: string | null;
  time?: string;
  type?: string;
  status?: string;
  isPriority?: boolean;
  vitals?: {
    bp: string;
    hr: string;
    weight: string;
    spo2: string;
  };
  allergies?: { name: string; severity: string; isError?: boolean }[];
}

interface Appointment {
  id: string;
  client_id: string;
  doctor_id: string;
  scheduled_time: string;
  room_id: string;
  status: string;
  created_at?: string;
}

const DEFAULT_PATIENTS: Record<string, PatientData> = {
  elena: {
    id: 'elena',
    name: 'Elena Rodriguez',
    meta: 'F · 34 yrs · ID: #MR-8492',
    photo:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDCj9o_UDGxKFcKLMIjml0dU6q3Xobb-ueTMaR832uTseMKdm-v6d8kxFrYfDtIq-1tGyMn7kMnzdqYm6Pifw17pStqf3qJtPGQCY_6PUey0M4a22u8KEldKinYEQn33tRCFRmM4YLKGp7HFDMlERNqbbUfGdMWWBHQNh95W4SdhfNX9ZwRMHiEUkGF0Te_q4KPja0C777L0QYMKF-fQ2-sA39f1oGGKYtcqk5g-Ud_DnrHxk2n4GIe2bacrYSt5XME4RHwn3RpG6k',
    time: '09:00 AM',
    type: 'Follow-up',
    status: 'Active',
    vitals: { bp: '120/80', hr: '72 bpm', weight: '145 lbs', spo2: '98%' },
    allergies: [
      { name: 'Penicillin', severity: 'Severe', isError: true },
      { name: 'Seasonal Pollen', severity: 'Mild', isError: false },
    ],
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Chen',
    meta: 'M · 58 yrs · ID: #MR-3201',
    photo: null,
    time: '09:30 AM',
    type: 'Cardiology Consult',
    status: 'Queued',
    vitals: { bp: '135/88', hr: '78 bpm', weight: '182 lbs', spo2: '97%' },
    allergies: [{ name: 'Sulfa Drugs', severity: 'Moderate', isError: true }],
  },
  sarah: {
    id: 'sarah',
    name: 'Sarah Jenkins',
    meta: 'F · 45 yrs · ID: #MR-7744',
    photo: null,
    time: '10:15 AM',
    type: 'Post-Op Review',
    status: 'Queued',
    vitals: { bp: '118/76', hr: '68 bpm', weight: '138 lbs', spo2: '99%' },
    allergies: [{ name: 'Latex', severity: 'Mild', isError: false }],
  },
  james: {
    id: 'james',
    name: 'James Okafor',
    meta: 'M · 62 yrs · ID: #MR-5519',
    photo: null,
    time: '11:00 AM',
    type: 'Diabetes Check-in',
    status: 'Scheduled',
    vitals: { bp: '128/82', hr: '74 bpm', weight: '195 lbs', spo2: '96%' },
  },
  priya: {
    id: 'priya',
    name: 'Priya Nair',
    meta: 'F · 29 yrs · ID: #MR-9031',
    photo: null,
    time: '11:45 AM',
    type: 'Neurology Referral',
    status: 'Scheduled',
    vitals: { bp: '112/72', hr: '65 bpm', weight: '124 lbs', spo2: '99%' },
  },
  robert: {
    id: 'robert',
    name: 'Robert Kim',
    meta: 'M · 51 yrs · ID: #MR-4488',
    photo: null,
    time: '01:30 PM',
    type: 'Annual Physical',
    status: 'Scheduled',
  },
  amara: {
    id: 'amara',
    name: 'Amara Diallo',
    meta: 'F · 31 yrs · ID: #MR-6620',
    photo: null,
    time: '02:15 PM',
    type: 'Prenatal Check',
    status: 'Priority',
    isPriority: true,
  },
  tom: {
    id: 'tom',
    name: 'Tom Brewer',
    meta: 'M · 44 yrs · ID: #MR-2277',
    photo: null,
    time: '03:00 PM',
    type: 'Orthopedic Review',
    status: 'Scheduled',
  },
};

export default function DoctorPortal() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentView, setCurrentView] = useState<'schedule' | 'dashboard'>('schedule');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('elena');
  const [qrModalPatientId, setQrModalPatientId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Dr. Adrian Thorne');

  // Active appointment room state from Supabase
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    async function loadDoctor() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
          const name = profile?.name || user.user_metadata?.name;
          if (name) {
            setDoctorName(name.startsWith('Dr.') ? name : `Dr. ${name}`);
          }
        }
      } catch (e) {
        console.warn("Could not load doctor profile:", e);
      }
    }
    loadDoctor();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      await supabase.auth.signOut();
    } catch (e) {}
    router.push('/login');
  };

  // Fetch latest appointment with a valid room_id from Supabase
  const fetchLatestRoom = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .not('room_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatestAppointment(data[0]);
      }
    } catch (err) {
      console.warn('Error fetching latest appointment room:', err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLatestRoom();

    // Subscribe to realtime changes on appointments table
    const channel = supabase
      .channel('doctor_portal_realtime_appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          const incoming = payload.new as Appointment;
          if (incoming && incoming.room_id) {
            setLatestAppointment(incoming);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLatestRoom]);

  // Handle escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQrModalPatientId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedPatient = DEFAULT_PATIENTS[selectedPatientId] || DEFAULT_PATIENTS['elena'];
  const modalPatient = qrModalPatientId ? DEFAULT_PATIENTS[qrModalPatientId] || selectedPatient : null;

  // Single entry point to navigate to existing WebRTC room
  const handleStartConsultation = () => {
    if (latestAppointment?.room_id) {
      router.push(`/call/${latestAppointment.room_id}?role=doctor`);
    }
  };

  const hasActiveRoom = Boolean(latestAppointment?.room_id);

  return (
    <div className="bg-surface text-on-surface h-screen w-screen overflow-hidden flex font-body">
      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <nav className="bg-slate-50 rounded-r-[1.5rem] h-screen sticky left-0 flex flex-col w-72 p-6 gap-4 shrink-0 z-40 shadow-[4px_0_40px_-10px_rgba(25,28,29,0.06)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl primary-gradient flex items-center justify-center">
            <span className="material-symbols-outlined fill-icon text-white text-xl">health_and_safety</span>
          </div>
          <div>
            <span className="font-headline font-black text-xl text-cyan-800 tracking-tight">CuraTrack</span>
            <p className="text-[10px] text-tertiary uppercase tracking-widest">Empathetic Precision</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <div
            className={`nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#e8f6fa] text-[#00647e] font-bold'
                : 'text-outline hover:bg-[#00647e]/5 hover:text-[#00647e]'
            }`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Overview</span>
          </div>

          <div className="nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm text-outline hover:bg-[#00647e]/5 hover:text-[#00647e] transition-all cursor-pointer">
            <span className="material-symbols-outlined">group</span>
            <span>Patient Directory</span>
          </div>

          <div
            className={`nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm transition-all cursor-pointer ${
              currentView === 'schedule'
                ? 'bg-[#e8f6fa] text-[#00647e] font-bold'
                : 'text-outline hover:bg-[#00647e]/5 hover:text-[#00647e]'
            }`}
            onClick={() => setCurrentView('schedule')}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Clinical Schedule</span>
          </div>

          <div className="nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm text-outline hover:bg-[#00647e]/5 hover:text-[#00647e] transition-all cursor-pointer">
            <span className="material-symbols-outlined">folder_shared</span>
            <span>Medical Records</span>
          </div>

          <div 
            onClick={handleLogout}
            className="nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm text-error hover:bg-error/10 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {/* Doctor Profile Card */}
          <div
            className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl cursor-pointer hover:bg-surface-container transition-colors group"
            onClick={() => setCurrentView('dashboard')}
            title="View Dashboard"
          >
            <div className="relative">
              <img
                alt={doctorName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV3tj75_r2NcimLJqIr5Gzc77ZCRja6X841HxFsl5mmB0oLjuoWy0e-8GTa4JltLLuzkdL9X665dXwotQzjQgSfM5Z75m8SQZ1J6ZIuWYRwdUDThE5RoiaO2bPXpxdOhem4M5CvhBwnp-zKmCzeG_bG7-X9ZoHmHGJtRI1U5gBjS0kXE4CGv9MAZeuRqU2fiMAzdwBV4Ej2YHHmUb4EVqojDdMn26AMm4fB6LR7bnCAsV2qiAJqv7blEepmcnUqaTdjLQFlckjUPM"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-white"></span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-headline font-bold text-sm text-on-surface block truncate">{doctorName}</span>
              <span className="text-xs text-tertiary">Chief of Surgery</span>
            </div>
            <span className="material-symbols-outlined text-tertiary text-base opacity-0 group-hover:opacity-100 transition-opacity">
              arrow_forward_ios
            </span>
          </div>

          {/* Start Consultation Button */}
          <button
            onClick={handleStartConsultation}
            disabled={!hasActiveRoom}
            className={`primary-gradient text-on-primary font-headline font-semibold text-sm py-3 rounded-xl w-full flex items-center justify-center gap-2 transition-all shadow-sm ${
              hasActiveRoom
                ? 'hover:opacity-90 cursor-pointer'
                : 'opacity-50 cursor-not-allowed grayscale'
            }`}
          >
            <span className="material-symbols-outlined fill-icon text-lg">
              {hasActiveRoom ? 'video_camera_front' : 'hourglass_empty'}
            </span>
            {hasActiveRoom ? 'Start Consultation' : 'Waiting for patient...'}
          </button>
        </div>
      </nav>

      {/* ═══════════════════════ MAIN CONTENT AREA ═══════════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface relative">
        {/* Top Header Bar */}
        <header className="bg-white/80 backdrop-blur-xl flex items-center justify-between px-10 h-20 shrink-0 z-30 shadow-[0_8px_40px_-10px_rgba(25,28,29,0.06)]">
          <div>
            <h1 className="font-headline font-bold text-xl text-on-surface">
              {currentView === 'dashboard' ? 'Doctor Dashboard' : 'Clinical Schedule'}
            </h1>
            <p className="text-xs text-tertiary">
              {currentView === 'dashboard' ? 'Dr. Adrian Thorne · Overview' : 'Today, Oct 24'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-64 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <span className="material-symbols-outlined text-outline text-xl mr-2">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-outline-variant outline-none"
                placeholder="Search patients..."
                type="text"
              />
            </div>
            <button className="relative text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined">chat</span>
            </button>
            <img
              onClick={() => setCurrentView('dashboard')}
              alt="Dr. Adrian Thorne"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 cursor-pointer hover:ring-primary transition-all"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV3tj75_r2NcimLJqIr5Gzc77ZCRja6X841HxFsl5mmB0oLjuoWy0e-8GTa4JltLLuzkdL9X665dXwotQzjQgSfM5Z75m8SQZ1J6ZIuWYRwdUDThE5RoiaO2bPXpxdOhem4M5CvhBwnp-zKmCzeG_bG7-X9ZoHmHGJtRI1U5gBjS0kXE4CGv9MAZeuRqU2fiMAzdwBV4Ej2YHHmUb4EVqojDdMn26AMm4fB6LR7bnCAsV2qiAJqv7blEepmcnUqaTdjLQFlckjUPM"
              title="View Dashboard"
            />
          </div>
        </header>

        {/* ─────────── SCHEDULE VIEW ─────────── */}
        {currentView === 'schedule' && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-10 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex gap-8 h-full">
              {/* Left: Patient Queue */}
              <div className="w-80 shrink-0 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline font-semibold text-lg text-on-surface">Upcoming Patients</h2>
                  <span className="primary-gradient text-on-primary text-xs px-2.5 py-1 rounded-full font-bold">
                    8 in queue
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  {/* Active / Current Patient (Elena Rodriguez) */}
                  <div
                    className={`bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.07)] relative overflow-hidden cursor-pointer transition-all border ${
                      selectedPatientId === 'elena' ? 'border-primary/40 ring-1 ring-primary/20' : 'border-outline-variant/10'
                    }`}
                    onClick={() => setSelectedPatientId('elena')}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-primary"></div>
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div>
                        <span className="text-xs text-primary font-bold tracking-wider uppercase mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block"></span> 09:00 AM · Active
                        </span>
                        <h3 className="font-headline font-bold text-on-surface">Elena Rodriguez</h3>
                        <p className="text-xs text-tertiary mt-0.5">Follow-up · F, 34</p>
                      </div>
                      <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        Follow-up
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalPatientId('elena');
                        }}
                        className="flex-1 bg-surface-container-high text-on-surface text-xs font-bold py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_2</span> View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartConsultation();
                        }}
                        disabled={!hasActiveRoom}
                        className={`flex-1 primary-gradient text-on-primary text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-opacity ${
                          hasActiveRoom ? 'hover:opacity-90 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm fill-icon">call</span> Join
                      </button>
                    </div>
                  </div>

                  {/* Queued Patients List */}
                  {[
                    { id: 'marcus', name: 'Marcus Chen', time: '09:30 AM', desc: 'Cardiology Consult · M, 58', badge: 'Queued' },
                    { id: 'sarah', name: 'Sarah Jenkins', time: '10:15 AM', desc: 'Post-Op Review · F, 45', badge: 'Queued' },
                    { id: 'james', name: 'James Okafor', time: '11:00 AM', desc: 'Diabetes Check-in · M, 62' },
                    { id: 'priya', name: 'Priya Nair', time: '11:45 AM', desc: 'Neurology Referral · F, 29' },
                    { id: 'robert', name: 'Robert Kim', time: '01:30 PM', desc: 'Annual Physical · M, 51' },
                    { id: 'amara', name: 'Amara Diallo', time: '02:15 PM', desc: 'Prenatal Check · F, 31', isPriority: true },
                    { id: 'tom', name: 'Tom Brewer', time: '03:00 PM', desc: 'Orthopedic Review · M, 44' },
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`bg-surface-container-low rounded-2xl p-5 hover:bg-surface-container-lowest transition-all cursor-pointer hover:shadow-[0_4px_20px_-4px_rgba(25,28,29,0.06)] border ${
                        selectedPatientId === p.id ? 'border-primary/40 bg-surface-container-lowest shadow-sm' : 'border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-xs text-tertiary mb-1 block">{p.time}</span>
                          <h3 className="font-headline font-semibold text-on-surface">{p.name}</h3>
                          <p className="text-xs text-tertiary mt-0.5">{p.desc}</p>
                        </div>
                        {p.badge && (
                          <span className="bg-surface-container-high text-on-surface-variant text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {p.badge}
                          </span>
                        )}
                        {p.isPriority && (
                          <span className="bg-error-container text-on-error-container text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Priority
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalPatientId(p.id);
                        }}
                        className="mt-3 w-full bg-surface-container text-on-surface-variant text-xs font-bold py-2 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_2</span> View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Active Patient Panel */}
              <div className="flex-1 bg-surface-container-lowest rounded-3xl shadow-[0_8px_40px_-10px_rgba(25,28,29,0.08)] overflow-hidden flex flex-col">
                <div className="bg-surface-container-low p-8 pb-14 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-5">
                      {selectedPatient.photo ? (
                        <img
                          alt={selectedPatient.name}
                          className="w-20 h-20 rounded-2xl border-4 border-surface-container-lowest shadow-sm object-cover"
                          src={selectedPatient.photo}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl border-4 border-surface-container-lowest shadow-sm bg-surface-container flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined fill-icon text-3xl">person</span>
                        </div>
                      )}
                      <div>
                        <h2 className="font-headline font-bold text-3xl text-on-surface tracking-tight">
                          {selectedPatient.name}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-tertiary">
                          <span>{selectedPatient.meta}</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined fill-icon text-sm text-secondary">
                              verified_user
                            </span>
                            Insured
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleStartConsultation}
                      disabled={!hasActiveRoom}
                      className={`primary-gradient text-on-primary px-6 py-3 rounded-xl font-headline font-semibold flex items-center gap-2 transition-all shadow-sm ${
                        hasActiveRoom ? 'hover:opacity-90 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <span className="material-symbols-outlined fill-icon">videocam</span>
                      {hasActiveRoom ? 'Initiate Telehealth' : 'Waiting for patient...'}
                    </button>
                  </div>
                </div>

                <div className="p-8 -mt-8 z-10 flex-1 overflow-y-auto space-y-6">
                  {/* Room Status Alert / Room Info */}
                  {hasActiveRoom ? (
                    <div className="bg-secondary-container/50 border border-secondary/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary text-2xl">sensors</span>
                        <div>
                          <p className="text-xs font-bold text-secondary uppercase tracking-widest">Active Consultation Ready</p>
                          <p className="text-sm font-semibold text-on-surface">Room ID: <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs font-mono">{latestAppointment?.room_id}</code></p>
                        </div>
                      </div>
                      <button
                        onClick={handleStartConsultation}
                        className="primary-gradient text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        Join Room Now
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-amber-600">hourglass_top</span>
                      <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">No active consultation available</p>
                        <p className="text-xs text-amber-800">Waiting for a patient to book an instant call from the Telemedicine portal.</p>
                      </div>
                    </div>
                  )}

                  {/* QR Access Banner */}
                  <div className="bg-primary-fixed/30 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm">
                        <span className="material-symbols-outlined text-3xl text-primary fill-icon">qr_code_2</span>
                      </div>
                      <div>
                        <h3 className="font-headline font-semibold text-primary">Comprehensive Medical History</h3>
                        <p className="text-sm text-on-surface-variant mt-0.5 max-w-md">
                          Scan QR code or click 'Access Records' to view full interoperable health history and lab results.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setQrModalPatientId(selectedPatient.id)}
                      className="bg-surface-container-lowest text-primary border border-outline-variant/30 px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all shadow-sm whitespace-nowrap"
                    >
                      Access Records
                    </button>
                  </div>

                  {/* Vitals & Allergies */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-surface-container-low rounded-2xl p-6">
                      <h4 className="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-tertiary text-base">monitor_heart</span> Latest Vitals (Oct 10)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-tertiary block mb-1">BP</span>
                          <span className="font-headline font-bold text-xl text-on-surface">
                            {selectedPatient.vitals?.bp || '120/80'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-tertiary block mb-1">Heart Rate</span>
                          <span className="font-headline font-bold text-xl text-on-surface">
                            {selectedPatient.vitals?.hr || '72 bpm'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-tertiary block mb-1">Weight</span>
                          <span className="font-headline font-bold text-xl text-on-surface">
                            {selectedPatient.vitals?.weight || '145 lbs'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-tertiary block mb-1">SpO₂</span>
                          <span className="font-headline font-bold text-xl text-on-surface">
                            {selectedPatient.vitals?.spo2 || '98%'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-low rounded-2xl p-6">
                      <h4 className="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-error text-base">warning</span> Allergies & Alerts
                      </h4>
                      <ul className="flex flex-col gap-3">
                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                          selectedPatient.allergies.map((a, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${a.isError ? 'bg-error' : 'bg-secondary'}`}></span>
                              <span className="text-sm text-on-surface">
                                {a.name} – <span className="text-tertiary">{a.severity}</span>
                              </span>
                            </li>
                          ))
                        ) : (
                          <>
                            <li className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-error"></span>
                              <span className="text-sm text-on-surface">
                                Penicillin – <span className="text-tertiary">Severe</span>
                              </span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-secondary"></span>
                              <span className="text-sm text-on-surface">
                                Seasonal Pollen – <span className="text-tertiary">Mild</span>
                              </span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── DOCTOR DASHBOARD VIEW ─────────── */}
        {currentView === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-10 transition-all duration-300">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Doctor Hero */}
              <div className="primary-gradient rounded-3xl p-8 flex items-center gap-8 relative overflow-hidden shadow-[0_12px_40px_-8px_rgba(0,100,126,0.3)]">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined fill-icon text-[20rem] leading-none">
                    health_and_safety
                  </span>
                </div>
                <div className="relative z-10">
                  <img
                    alt="Dr. Adrian Thorne"
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white/30 shadow-xl"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV3tj75_r2NcimLJqIr5Gzc77ZCRja6X841HxFsl5mmB0oLjuoWy0e-8GTa4JltLLuzkdL9X665dXwotQzjQgSfM5Z75m8SQZ1J6ZIuWYRwdUDThE5RoiaO2bPXpxdOhem4M5CvhBwnp-zKmCzeG_bG7-X9ZoHmHGJtRI1U5gBjS0kXE4CGv9MAZeuRqU2fiMAzdwBV4Ej2YHHmUb4EVqojDdMn26AMm4fB6LR7bnCAsV2qiAJqv7blEepmcnUqaTdjLQFlckjUPM"
                  />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-1">Good Morning</p>
                  <h2 className="font-headline font-extrabold text-4xl text-white tracking-tight">{doctorName}</h2>
                  <p className="text-white/80 mt-1">Chief of Surgery · Metro City Medical Center</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                      <span className="text-white text-sm font-bold">On Duty</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full">
                      <span className="material-symbols-outlined fill-icon text-white text-sm">badge</span>
                      <span className="text-white text-sm font-bold">Lic: MED-00471-TX</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 text-right shrink-0">
                  <p className="text-white/70 text-sm">Today's Date</p>
                  <p className="font-headline font-bold text-white text-2xl">Oct 24, 2025</p>
                  <button
                    onClick={() => setCurrentView('schedule')}
                    className="mt-4 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ml-auto"
                  >
                    <span className="material-symbols-outlined text-base">calendar_month</span> View Schedule
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-primary">group</span>
                    </div>
                    <span className="text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-full">+2 today</span>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">8</p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Patients Today</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-secondary">check_circle</span>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">92%</span>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">3</p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Completed Today</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-error">warning</span>
                    </div>
                    <span className="text-xs font-bold text-error bg-error-container px-2 py-0.5 rounded-full">Urgent</span>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">2</p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Critical Alerts</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-primary">history</span>
                    </div>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">127</p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Patients This Month</p>
                </div>
              </div>

              {/* Middle Row: Today Schedule + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule compact */}
                <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)]">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-headline font-bold text-lg text-on-surface">Today's Schedule</h3>
                    <button
                      onClick={() => setCurrentView('schedule')}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      View All <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border-l-4 border-primary">
                      <div className="text-center w-14 shrink-0">
                        <p className="text-xs text-tertiary font-bold">09:00</p>
                        <p className="text-[10px] text-primary font-bold">ACTIVE</p>
                      </div>
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCj9o_UDGxKFcKLMIjml0dU6q3Xobb-ueTMaR832uTseMKdm-v6d8kxFrYfDtIq-1tGyMn7kMnzdqYm6Pifw17pStqf3qJtPGQCY_6PUey0M4a22u8KEldKinYEQn33tRCFRmM4YLKGp7HFDMlERNqbbUfGdMWWBHQNh95W4SdhfNX9ZwRMHiEUkGF0Te_q4KPja0C777L0QYMKF-fQ2-sA39f1oGGKYtcqk5g-Ud_DnrHxk2n4GIe2bacrYSt5XME4RHwn3RpG6k"
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        alt="Elena"
                      />
                      <div className="flex-1">
                        <p className="font-headline font-bold text-on-surface text-sm">Elena Rodriguez</p>
                        <p className="text-xs text-tertiary">Follow-up · F, 34</p>
                      </div>
                      <span className="text-[10px] font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                        Follow-up
                      </span>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
                      <div className="text-center w-14 shrink-0">
                        <p className="text-xs text-tertiary font-bold">09:30</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-tertiary fill-icon text-sm">person</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-headline font-bold text-on-surface text-sm">Marcus Chen</p>
                        <p className="text-xs text-tertiary">Cardiology Consult · M, 58</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
                      <div className="text-center w-14 shrink-0">
                        <p className="text-xs text-tertiary font-bold">10:15</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-tertiary fill-icon text-sm">person</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-headline font-bold text-on-surface text-sm">Sarah Jenkins</p>
                        <p className="text-xs text-tertiary">Post-Op Review · F, 45</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-error-container/30 rounded-xl border-l-4 border-error">
                      <div className="text-center w-14 shrink-0">
                        <p className="text-xs text-tertiary font-bold">02:15</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-error-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-error fill-icon text-sm">priority_high</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-headline font-bold text-on-surface text-sm">Amara Diallo</p>
                        <p className="text-xs text-tertiary">Prenatal Check · Priority</p>
                      </div>
                      <span className="text-[10px] font-bold bg-error-container text-error px-2 py-0.5 rounded-full">
                        Urgent
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions + Alerts */}
                <div className="flex flex-col gap-5">
                  <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)]">
                    <h3 className="font-headline font-bold text-base text-on-surface mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setCurrentView('schedule')}
                        className="w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">Today's Queue</p>
                          <p className="text-xs text-tertiary">8 patients waiting</p>
                        </div>
                      </button>

                      <button
                        onClick={handleStartConsultation}
                        disabled={!hasActiveRoom}
                        className={`w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-xl transition-colors text-left ${
                          hasActiveRoom ? 'hover:bg-surface-container cursor-pointer' : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-secondary text-lg">video_chat</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">Start Telehealth</p>
                          <p className="text-xs text-tertiary">
                            {hasActiveRoom ? 'Instant consultation ready' : 'Waiting for patient...'}
                          </p>
                        </div>
                      </button>

                      <button className="w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors text-left">
                        <div className="w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-error text-lg">assignment</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">Pending Notes</p>
                          <p className="text-xs text-tertiary">4 to complete</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Critical Alerts */}
                  <div className="bg-error-container/40 rounded-2xl p-5 shadow-[0_4px_24px_-4px_rgba(186,26,26,0.08)]">
                    <h3 className="font-headline font-bold text-base text-on-surface mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined fill-icon text-error text-lg">
                        notification_important
                      </span>{' '}
                      Critical Alerts
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-white/60 rounded-xl">
                        <p className="text-xs font-bold text-error">LAB RESULT FLAGGED</p>
                        <p className="text-sm font-semibold text-on-surface mt-0.5">Elena R. · LDL elevated</p>
                        <p className="text-xs text-tertiary">Received 08:42 AM</p>
                      </div>
                      <div className="p-3 bg-white/60 rounded-xl">
                        <p className="text-xs font-bold text-error">PRIORITY APPOINTMENT</p>
                        <p className="text-sm font-semibold text-on-surface mt-0.5">Amara D. · Prenatal emergency</p>
                        <p className="text-xs text-tertiary">02:15 PM today</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)]">
                  <h4 className="font-headline font-semibold text-sm text-on-surface mb-1">Patient Satisfaction</h4>
                  <p className="font-headline text-4xl font-extrabold text-primary mt-2">
                    4.9<span className="text-lg text-tertiary">/5</span>
                  </p>
                  <p className="text-xs text-tertiary mt-1">Based on 340 reviews</p>
                  <div className="flex gap-0.5 mt-3">
                    <span className="material-symbols-outlined fill-icon text-yellow-400 text-lg">star</span>
                    <span className="material-symbols-outlined fill-icon text-yellow-400 text-lg">star</span>
                    <span className="material-symbols-outlined fill-icon text-yellow-400 text-lg">star</span>
                    <span className="material-symbols-outlined fill-icon text-yellow-400 text-lg">star</span>
                    <span className="material-symbols-outlined fill-icon text-yellow-400 text-lg">star</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)]">
                  <h4 className="font-headline font-semibold text-sm text-on-surface mb-4">Avg. Consult Time</h4>
                  <div className="flex items-end gap-1 h-16">
                    <div className="flex-1 bg-primary/20 rounded-t-lg" style={{ height: '60%' }}></div>
                    <div className="flex-1 bg-primary/30 rounded-t-lg" style={{ height: '75%' }}></div>
                    <div className="flex-1 bg-primary rounded-t-lg" style={{ height: '90%' }}></div>
                    <div className="flex-1 bg-primary/50 rounded-t-lg" style={{ height: '65%' }}></div>
                    <div className="flex-1 bg-primary/70 rounded-t-lg" style={{ height: '80%' }}></div>
                  </div>
                  <p className="font-headline text-2xl font-extrabold text-on-surface mt-3">
                    18 <span className="text-sm font-normal text-tertiary">min avg</span>
                  </p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)]">
                  <h4 className="font-headline font-semibold text-sm text-on-surface mb-4">Specialties Active</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface font-semibold">Surgery</span>
                      <span className="text-primary font-bold">Primary</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface font-semibold">Cardiology</span>
                      <span className="text-tertiary">Consulting</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface font-semibold">Oncology</span>
                      <span className="text-tertiary">Consulting</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary-fixed/40 rounded-xl text-center">
                    <p className="text-xs font-bold text-primary">24 yrs experience</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════ QR MODAL ═══════════════════════ */}
      {qrModalPatientId && modalPatient && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-fadeIn"
          onClick={() => setQrModalPatientId(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-[520px] w-[92%] shadow-2xl transition-all transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center overflow-hidden">
                  {modalPatient.photo ? (
                    <img src={modalPatient.photo} className="w-full h-full object-cover" alt={modalPatient.name} />
                  ) : (
                    <span className="material-symbols-outlined fill-icon text-tertiary text-2xl">person</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-0.5">Patient Health ID</p>
                  <h3 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
                    {modalPatient.name}
                  </h3>
                  <p className="text-sm text-tertiary mt-0.5">{modalPatient.meta}</p>
                </div>
              </div>
              <button
                onClick={() => setQrModalPatientId(null)}
                className="text-tertiary hover:text-on-surface transition-colors p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="relative bg-surface-container-low p-6 rounded-2xl">
                <svg width="200" height="200" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
                  <rect x="0" y="0" width="7" height="7" fill="#191c1d" rx="0.5" />
                  <rect x="1" y="1" width="5" height="5" fill="#f8f9fa" />
                  <rect x="2" y="2" width="3" height="3" fill="#00647e" />

                  <rect x="14" y="0" width="7" height="7" fill="#191c1d" rx="0.5" />
                  <rect x="15" y="1" width="5" height="5" fill="#f8f9fa" />
                  <rect x="16" y="2" width="3" height="3" fill="#00647e" />

                  <rect x="0" y="14" width="7" height="7" fill="#191c1d" rx="0.5" />
                  <rect x="1" y="15" width="5" height="5" fill="#f8f9fa" />
                  <rect x="2" y="16" width="3" height="3" fill="#00647e" />

                  <rect x="8" y="0" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="0" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="0" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="1" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="1" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="1" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="2" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="2" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="2" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="3" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="3" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="4" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="4" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="4" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="5" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="5" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="6" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="6" fill="#191c1d" width="1" height="1" />
                  <rect x="0" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="2" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="4" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="6" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="14" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="16" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="18" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="20" y="8" fill="#191c1d" width="1" height="1" />
                  <rect x="1" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="3" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="5" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="15" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="17" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="19" y="9" fill="#191c1d" width="1" height="1" />
                  <rect x="0" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="2" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="6" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="16" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="20" y="10" fill="#191c1d" width="1" height="1" />
                  <rect x="1" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="3" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="5" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="17" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="19" y="11" fill="#191c1d" width="1" height="1" />
                  <rect x="0" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="4" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="6" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="14" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="18" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="20" y="12" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="15" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="15" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="15" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="16" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="16" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="17" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="17" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="17" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="18" fill="#191c1d" width="1" height="1" />
                  <rect x="10" y="18" fill="#191c1d" width="1" height="1" />
                  <rect x="9" y="19" fill="#191c1d" width="1" height="1" />
                  <rect x="11" y="19" fill="#191c1d" width="1" height="1" />
                  <rect x="13" y="19" fill="#191c1d" width="1" height="1" />
                  <rect x="8" y="20" fill="#191c1d" width="1" height="1" />
                  <rect x="12" y="20" fill="#191c1d" width="1" height="1" />
                  <rect x="14" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="16" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="18" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="20" y="14" fill="#191c1d" width="1" height="1" />
                  <rect x="15" y="15" fill="#191c1d" width="1" height="1" />
                  <rect x="17" y="15" fill="#191c1d" width="1" height="1" />
                  <rect x="19" y="15" fill="#191c1d" width="1" height="1" />
                  <rect x="14" y="16" fill="#191c1d" width="1" height="1" />
                  <rect x="18" y="16" fill="#191c1d" width="1" height="1" />
                  <rect x="20" y="16" fill="#191c1d" width="1" height="1" />
                  <rect x="15" y="17" fill="#191c1d" width="1" height="1" />
                  <rect x="17" y="17" fill="#191c1d" width="1" height="1" />
                  <rect x="14" y="18" fill="#191c1d" width="1" height="1" />
                  <rect x="16" y="18" fill="#191c1d" width="1" height="1" />
                  <rect x="20" y="18" fill="#191c1d" width="1" height="1" />
                  <rect x="15" y="19" fill="#191c1d" width="1" height="1" />
                  <rect x="19" y="19" fill="#191c1d" width="1" height="1" />
                  <rect x="14" y="20" fill="#191c1d" width="1" height="1" />
                  <rect x="16" y="20" fill="#191c1d" width="1" height="1" />
                  <rect x="18" y="20" fill="#191c1d" width="1" height="1" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white rounded-lg p-1 shadow-sm">
                    <div className="w-7 h-7 rounded primary-gradient flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-white text-sm">health_and_safety</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Encoded Records */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Encoded Records</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="material-symbols-outlined fill-icon text-primary text-xl">medication</span>
                  <p className="text-[11px] font-bold text-on-surface mt-1">4 Active Rx</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="material-symbols-outlined fill-icon text-secondary text-xl">biotech</span>
                  <p className="text-[11px] font-bold text-on-surface mt-1">Lab Results</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="material-symbols-outlined fill-icon text-tertiary text-xl">description</span>
                  <p className="text-[11px] font-bold text-on-surface mt-1">5 Notes</p>
                </div>
              </div>
            </div>

            {/* Encryption notice */}
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl mb-5">
              <span className="material-symbols-outlined fill-icon text-secondary text-base">lock</span>
              <p className="text-xs text-on-surface-variant">
                <span className="font-bold text-secondary">Dynamic encryption active</span> · Refreshes in 02:45 · All scans are logged
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">download</span> Download
              </button>
              <button className="flex-1 py-3 primary-gradient text-on-primary font-bold text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined fill-icon text-base">folder_shared</span> Open Full Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
