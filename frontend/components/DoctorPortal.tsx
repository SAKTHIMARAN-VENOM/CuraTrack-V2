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
}

function getCleanPatientName(prof?: any, fallbackId?: string, queueIndex?: number): string {
  if (prof?.name && prof.name.trim().length > 0) {
    return prof.name;
  }
  if (prof?.email && prof.email.trim().length > 0) {
    const username = prof.email.split('@')[0].replace(/[._-]/g, ' ');
    return username
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  if (typeof queueIndex === 'number') {
    return `Patient Queue #${queueIndex + 1}`;
  }
  return fallbackId ? `Patient (${fallbackId.slice(0, 6)})` : 'Registered Patient';
}

export default function DoctorPortal() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentView, setCurrentView] = useState<'schedule' | 'dashboard' | 'directory' | 'records' | 'settings'>('schedule');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('elena');
  const [qrModalPatientId, setQrModalPatientId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Dr. David Ross');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showChatPopover, setShowChatPopover] = useState<boolean>(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState<boolean>(false);
  const [prescriptionData, setPrescriptionData] = useState({
    medication: '',
    dosage: '',
    frequency: 'Twice daily after meals',
    notes: ''
  });
  const [prescriptionsList, setPrescriptionsList] = useState<any[]>([]);

  // Active appointment room state from Supabase
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null);

  // Scheduled appointments state
  const [scheduledAppointments, setScheduledAppointments] = useState<any[]>([]);

  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(true);
  const [isPendingVerification, setIsPendingVerification] = useState<boolean>(false);

  useEffect(() => {
    async function verifyDoctorAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single();
        const isDoctorRole = profile?.role === 'doctor' || user.user_metadata?.role === 'doctor' || user.email?.toLowerCase().includes('doctor') || user.email?.toLowerCase().includes('dr.');

        if (!isDoctorRole) {
          setAccessDenied(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          return;
        }

        const name = profile?.name || user.user_metadata?.name;
        if (name) {
          setDoctorName(name.startsWith('Dr.') ? name : `Dr. ${name}`);
        }

        // Fetch verification status
        try {
          const { API_BASE } = await import('@/lib/api');
          const statusRes = await fetch(`${API_BASE}/api/onboarding/status/${user.id}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.verification_status && statusData.verification_status !== 'verified') {
              setIsPendingVerification(true);
            }
          }
        } catch (err) {
          console.warn('Could not fetch doctor verification status:', err);
        }
      } catch (e) {
        console.warn("Could not verify doctor access:", e);
      } finally {
        setVerifyingAuth(false);
      }
    }
    verifyDoctorAccess();
  }, [supabase, router]);

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

  // Fetch scheduled appointments for this doctor
  const fetchScheduledAppointments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['ringing', 'scheduled'])
        .order('scheduled_time', { ascending: true });

      if (data) {
        // Enrich with patient profile names
        const enriched = await Promise.all(
          data.map(async (appt: any) => {
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('name, email')
                .eq('id', appt.client_id)
                .single();
              return {
                ...appt,
                patient_name: getCleanPatientName(prof, appt.client_id),
                patient_email: prof?.email || '',
              };
            } catch {
              return { ...appt, patient_name: `Patient (${appt.client_id?.slice(0, 6)})`, patient_email: '' };
            }
          })
        );
        setScheduledAppointments(enriched);
      }
    } catch (err) {
      console.warn('Error fetching scheduled appointments:', err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchScheduledAppointments();

    const channel = supabase
      .channel('doctor_scheduled_appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          // Refetch on any appointment change
          fetchScheduledAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchScheduledAppointments]);

  const handleAcceptScheduled = async (appt: any) => {
    try {
      await supabase
        .from('appointments')
        .update({ status: 'active' })
        .eq('id', appt.id);

      const cleanRoomId = appt.room_id?.split('?')[0];
      router.push(`/call/${cleanRoomId}?role=doctor`);
    } catch (err) {
      console.warn('Error accepting appointment:', err);
    }
  };

  const handleDismissScheduled = async (apptId: string) => {
    try {
      await supabase
        .from('appointments')
        .update({ status: 'ended' })
        .eq('id', apptId);
      fetchScheduledAppointments();
    } catch (err) {
      console.warn('Error dismissing appointment:', err);
    }
  };

  const handleClearAllAppointments = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        await supabase
          .from('appointments')
          .update({ status: 'ended' })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }
      setScheduledAppointments([]);
      fetchScheduledAppointments();
    } catch (err) {
      console.warn('Error flushing appointments:', err);
    }
  };

  const [realPatientData, setRealPatientData] = useState<{ id: string; name: string; email?: string } | null>(null);

  useEffect(() => {
    async function loadRealPatient() {
      if (!latestAppointment?.client_id) return;
      try {
        const { data: prof } = await supabase.from('profiles').select('id, name, email').eq('id', latestAppointment.client_id).single();
        if (prof) {
          const name = getCleanPatientName(prof, prof.id, 0);
          setRealPatientData({ id: prof.id, name, email: prof.email });
        }
      } catch (err) {
        console.warn("Could not fetch real patient name:", err);
      }
    }
    loadRealPatient();
  }, [latestAppointment, supabase]);

  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);

  const loadRegisteredPatients = useCallback(async () => {
    try {
      // Fetch all user profiles from Supabase
      const { data: profs } = await supabase
        .from('profiles')
        .select('*');

      // Fetch active appointments from Supabase
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      const profsMap = new Map();
      if (profs && profs.length > 0) {
        profs.forEach(p => {
          if (p.role !== 'doctor') {
            profsMap.set(p.id, p);
          }
        });
      }

      const patientMap = new Map();

      // Add registered patient profiles
      profsMap.forEach((p, id) => {
        const patientName = getCleanPatientName(p, id);
        patientMap.set(id, {
          id: p.id,
          name: patientName,
          meta: p.email || 'Registered Patient',
          photo: null,
          time: 'Active Patient',
          type: 'General Care',
          status: 'Registered',
          vitals: { bp: '120/80', hr: '72 bpm' }
        });
      });

      // Incorporate appointment bookings with profile details
      if (appts && appts.length > 0) {
        appts.forEach((a, aIdx) => {
          if (a.client_id) {
            const prof = profsMap.get(a.client_id);
            const patientName = getCleanPatientName(prof, a.client_id, aIdx);
            const patientEmail = prof?.email || 'Active Telehealth Appointment';

            if (!patientMap.has(a.client_id)) {
              patientMap.set(a.client_id, {
                id: a.client_id,
                name: patientName,
                meta: patientEmail,
                photo: null,
                time: `09:${(aIdx * 30).toString().padStart(2, '0')} AM`,
                type: 'Telehealth Consult',
                status: 'Active',
                room_id: a.room_id,
                vitals: { bp: '120/80', hr: '72 bpm' }
              });
            } else {
              const existing = patientMap.get(a.client_id);
              if (prof?.name || prof?.email) {
                existing.name = patientName;
                existing.meta = patientEmail;
              } else if (existing.name.includes('(') || existing.name.includes('#')) {
                existing.name = `Patient Queue #${aIdx + 1}`;
              }
              existing.room_id = a.room_id;
              existing.status = 'Appointment Booked';
            }
          }
        });
      }

      const patientList = Array.from(patientMap.values());
      setRegisteredPatients(patientList);
    } catch (e) {
      console.warn('Could not fetch registered patients:', e);
    }
  }, [supabase]);

  useEffect(() => {
    loadRegisteredPatients();
  }, [loadRegisteredPatients]);

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

  const activePatientFromList = registeredPatients.find(p => p.id === selectedPatientId) || registeredPatients[0];
  const selectedPatient: PatientData = realPatientData ? {
    id: realPatientData.id,
    name: realPatientData.name,
    meta: realPatientData.email ? `Live Patient · ${realPatientData.email}` : 'Registered Patient',
    photo: null,
    vitals: { bp: '120/80', hr: '72 bpm', weight: '145 lbs', spo2: '98%' },
    allergies: [
      { name: 'No known drug allergies', severity: 'None', isError: false }
    ]
  } : (activePatientFromList ? {
    id: activePatientFromList.id,
    name: activePatientFromList.name,
    meta: activePatientFromList.meta ? `Live Patient · ${activePatientFromList.meta}` : 'Registered Patient',
    photo: activePatientFromList.photo || null,
    vitals: activePatientFromList.vitals || { bp: '120/80', hr: '72 bpm', weight: '145 lbs', spo2: '98%' },
    allergies: [
      { name: 'No known drug allergies', severity: 'None', isError: false }
    ]
  } : {
    id: 'pending-patient',
    name: 'Select a Registered Patient',
    meta: 'No registered patient selected yet',
    photo: null,
    vitals: { bp: '120/80', hr: '72 bpm', weight: '145 lbs', spo2: '98%' },
    allergies: [
      { name: 'No known drug allergies', severity: 'None', isError: false }
    ]
  });

  const modalPatient = selectedPatient;

  // Single entry point to navigate to WebRTC video room
  const handleStartConsultation = async () => {
    if (latestAppointment?.room_id) {
      const cleanRoomId = latestAppointment.room_id.split('?')[0];
      router.push(`/call/${cleanRoomId}?role=doctor`);
    } else {
      const newRoomId = `room_doc_${Date.now()}`;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('appointments').insert({
            doctor_id: user.id,
            client_id: selectedPatient.id,
            room_id: newRoomId,
            status: 'active',
            scheduled_time: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn("Appointment creation skipped:", e);
      }
      router.push(`/call/${newRoomId}?role=doctor`);
    }
  };

  if (verifyingAuth) {
    return (
      <div className="h-screen w-screen bg-surface flex flex-col items-center justify-center p-6 font-headline antialiased">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-primary">Verifying Doctor Credentials & Medical ID...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="h-screen w-screen bg-surface flex flex-col items-center justify-center p-6 text-center font-headline antialiased">
        <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center mb-6 shadow-sm">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        <h1 className="text-2xl font-black text-on-surface mb-2">Doctor Access Restricted</h1>
        <p className="text-sm text-tertiary max-w-md mb-6 leading-relaxed">
          The Doctor Portal is restricted exclusively to authorized medical professionals with a verified Doctor License ID.
        </p>
        <div className="flex items-center gap-2 text-xs font-bold text-error bg-error-container/40 px-4 py-2 rounded-xl mb-6">
          <span className="material-symbols-outlined text-base">warning</span>
          Redirecting to Patient Dashboard in 3 seconds...
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 primary-gradient text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-opacity"
        >
          Return to Patient Dashboard
        </button>
      </div>
    );
  }

  const hasActiveRoom = Boolean(latestAppointment?.room_id);

  return (
    <div className="bg-surface text-on-surface h-screen w-screen overflow-hidden flex flex-col font-body">
      {isPendingVerification && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-6 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 z-50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
            <span>Account Verification Pending • Credential review in progress by Administrator. Passport QR scanning & E-Prescriptions are restricted until verified.</span>
          </div>
          <button onClick={() => router.push('/onboarding/doctor')} className="underline text-amber-900 hover:text-amber-950">Check Status</button>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
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

          <div
            className={`nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm transition-all cursor-pointer ${
              currentView === 'directory'
                ? 'bg-[#e8f6fa] text-[#00647e] font-bold'
                : 'text-outline hover:bg-[#00647e]/5 hover:text-[#00647e]'
            }`}
            onClick={() => setCurrentView('directory')}
          >
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
            {scheduledAppointments.length > 0 && (
              <span className="ml-auto bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {scheduledAppointments.length}
              </span>
            )}
          </div>

          <div
            className={`nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm transition-all cursor-pointer ${
              currentView === 'records'
                ? 'bg-[#e8f6fa] text-[#00647e] font-bold'
                : 'text-outline hover:bg-[#00647e]/5 hover:text-[#00647e]'
            }`}
            onClick={() => setCurrentView('records')}
          >
            <span className="material-symbols-outlined">folder_shared</span>
            <span>Medical Records</span>
          </div>

          <div
            className={`nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm transition-all cursor-pointer ${
              currentView === 'settings'
                ? 'bg-[#e8f6fa] text-[#00647e] font-bold'
                : 'text-outline hover:bg-[#00647e]/5 hover:text-[#00647e]'
            }`}
            onClick={() => setCurrentView('settings')}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </div>

          <div 
            onClick={handleLogout}
            className="nav-link flex items-center gap-3 px-4 py-3 rounded-xl font-headline font-medium text-sm text-error hover:bg-error/10 transition-all cursor-pointer mt-auto"
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
            className="primary-gradient text-on-primary font-headline font-semibold text-sm py-3 rounded-xl w-full flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90 cursor-pointer"
          >
            <span className="material-symbols-outlined fill-icon text-lg">
              video_camera_front
            </span>
            {hasActiveRoom ? 'Join Active Call' : 'Start Consultation'}
          </button>
        </div>
      </nav>

      {/* ═══════════════════════ MAIN CONTENT AREA ═══════════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface relative">
        {/* Top Header Bar */}
        <header className="bg-white/80 backdrop-blur-xl flex items-center justify-between px-10 h-20 shrink-0 z-30 shadow-[0_8px_40px_-10px_rgba(25,28,29,0.06)]">
          <div>
            <h1 className="font-headline font-bold text-xl text-on-surface">
              {currentView === 'dashboard' ? 'Doctor Dashboard' : currentView === 'schedule' ? 'Clinical Schedule' : currentView === 'directory' ? 'Patient Directory' : currentView === 'records' ? 'Medical Records' : 'Settings'}
            </h1>
            <p className="text-xs text-tertiary">
              {currentView === 'dashboard' ? `${doctorName} · Overview` : currentView === 'schedule' ? (scheduledAppointments.length > 0 ? `${scheduledAppointments.length} scheduled appointment${scheduledAppointments.length > 1 ? 's' : ''} pending` : 'Today\'s appointments') : ''}
            </p>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-64 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <span className="material-symbols-outlined text-outline text-xl mr-2">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-outline-variant outline-none"
                placeholder="Search patients..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Notification Bell & Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low"
                title="Clinical Alerts"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-ping"></span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-surface-container-high p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-surface-container">
                    <h4 className="font-headline font-bold text-xs uppercase tracking-wider text-tertiary">Clinical Notifications</h4>
                    <span className="text-[10px] font-bold bg-error-container text-error px-2 py-0.5 rounded-full">2 New</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-error-container/30 border-l-4 border-error flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">priority_high</span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">Urgent: Amara Diallo</p>
                        <p className="text-[11px] text-tertiary">Prenatal Check-up requested priority review.</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary/10 border-l-4 border-primary flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">monitor_heart</span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">Vitals Ready: Marcus Chen</p>
                        <p className="text-[11px] text-tertiary">BP 135/88 recorded by triage staff.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Icon & Popover */}
            <div className="relative">
              <button 
                onClick={() => setShowChatPopover(!showChatPopover)}
                className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low"
                title="Consultation Messages"
              >
                <span className="material-symbols-outlined">chat</span>
              </button>

              {showChatPopover && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-surface-container-high p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-surface-container">
                    <h4 className="font-headline font-bold text-xs uppercase tracking-wider text-tertiary">Patient Consult Chat</h4>
                    <span className="text-[10px] font-bold bg-secondary-container text-secondary px-2 py-0.5 rounded-full">Online</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl text-xs text-tertiary text-center">
                    No active chat session. Start a telehealth call to open live consultation messaging.
                  </div>
                </div>
              )}
            </div>

            <img
              onClick={() => setCurrentView('dashboard')}
              alt={doctorName}
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
                {/* ── Scheduled Appointments Panel ── */}
                {scheduledAppointments.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="font-headline font-semibold text-lg text-on-surface">Scheduled Appointments</h2>
                      <div className="flex items-center gap-2">
                        <span className="bg-secondary text-white text-xs px-2.5 py-1 rounded-full font-bold">
                          {scheduledAppointments.length} pending
                        </span>
                        <button
                          onClick={handleClearAllAppointments}
                          className="text-[11px] font-bold text-error hover:underline px-2 py-0.5"
                          title="Flush all appointments"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '45vh' }}>
                      {scheduledAppointments.map((appt) => {
                        const schedDate = appt.scheduled_time
                          ? new Date(appt.scheduled_time)
                          : null;
                        const dateStr = schedDate
                          ? schedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                          : 'TBD';
                        const timeStr = schedDate
                          ? schedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '';

                        return (
                          <div
                            key={appt.id}
                            className="bg-surface-container-lowest rounded-2xl p-5 border border-secondary/20 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="text-[10px] text-secondary font-bold tracking-wider uppercase block mb-1">
                                  📅 Scheduled
                                </span>
                                <h3 className="font-headline font-bold text-on-surface">
                                  {appt.patient_name || 'Patient'}
                                </h3>
                                {appt.patient_email && (
                                  <p className="text-xs text-tertiary mt-0.5 truncate max-w-[180px]">{appt.patient_email}</p>
                                )}
                              </div>
                              <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                Pending
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-2 mb-3">
                              <span className="material-symbols-outlined text-secondary text-sm">schedule</span>
                              <span className="text-sm font-bold text-on-surface">{dateStr}</span>
                              {timeStr && (
                                <span className="text-sm text-tertiary">at {timeStr}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAcceptScheduled(appt)}
                                className="flex-1 primary-gradient text-on-primary text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-sm fill-icon">call</span> Accept & Join
                              </button>
                              <button
                                onClick={() => handleDismissScheduled(appt.id)}
                                className="flex-1 bg-surface-container-high hover:bg-error/10 text-on-surface hover:text-error text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">close</span> Dismiss
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <hr className="border-outline-variant/20" />
                  </>
                )}

                <div className="flex items-center justify-between">
                  <h2 className="font-headline font-semibold text-lg text-on-surface">Upcoming Patients</h2>
                  <span className="primary-gradient text-on-primary text-xs px-2.5 py-1 rounded-full font-bold">
                    {registeredPatients.length} live
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  {registeredPatients.length === 0 ? (
                    <div className="bg-surface-container-low rounded-2xl p-6 text-center text-xs text-tertiary border border-surface-container">
                      No registered patients in database yet.
                    </div>
                  ) : (
                    registeredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setRealPatientData({ id: p.id, name: p.name, email: p.meta });
                          setSelectedPatientId(p.id);
                        }}
                        className={`bg-surface-container-lowest rounded-2xl p-5 hover:bg-surface-container-low transition-all cursor-pointer border ${
                          selectedPatient?.id === p.id ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm' : 'border-outline-variant/10'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs text-primary font-bold tracking-wider uppercase mb-1 block">
                              {p.status === 'Active' || p.status === 'Appointment Booked' ? '● Active' : 'Registered'}
                            </span>
                            <h3 className="font-headline font-bold text-on-surface">{p.name}</h3>
                            <p className="text-xs text-tertiary mt-0.5 truncate max-w-[180px]">{p.meta}</p>
                          </div>
                          <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                            Database
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRealPatientData({ id: p.id, name: p.name, email: p.meta });
                              setSelectedPatientId(p.id);
                              setShowPrescriptionModal(true);
                            }}
                            className="flex-1 bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit_note</span> Prescribe
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
                    ))
                  )}
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowPrescriptionModal(true)}
                        className="bg-secondary text-white px-5 py-3 rounded-xl font-headline font-semibold text-sm flex items-center gap-2 transition-all hover:bg-secondary/90 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        Issue E-Prescription
                      </button>
                      <button
                        onClick={handleStartConsultation}
                        className="primary-gradient text-on-primary px-6 py-3 rounded-xl font-headline font-semibold text-sm flex items-center gap-2 transition-all shadow-sm hover:opacity-90 cursor-pointer"
                      >
                        <span className="material-symbols-outlined fill-icon">videocam</span>
                        {hasActiveRoom ? 'Join Active Call' : 'Start Consultation'}
                      </button>
                    </div>
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
                    <span className="text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-full">+ live</span>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">{registeredPatients.length}</p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Patients Today</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-secondary">check_circle</span>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">100%</span>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">
                    {registeredPatients.filter(p => p.status === 'Active' || p.status === 'Appointment Booked').length}
                  </p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Active Bookings</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-error">warning</span>
                    </div>
                    <span className="text-xs font-bold text-error bg-error-container px-2 py-0.5 rounded-full">Live</span>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">
                    {registeredPatients.filter(p => p.isPriority).length}
                  </p>
                  <p className="text-xs text-tertiary mt-1 font-semibold">Critical Alerts</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(25,28,29,0.05)] hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined fill-icon text-primary">history</span>
                    </div>
                  </div>
                  <p className="font-headline text-3xl font-extrabold text-on-surface">{registeredPatients.length}</p>
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
                    {registeredPatients.length === 0 ? (
                      <p className="text-xs text-tertiary p-4">No registered patient bookings yet.</p>
                    ) : (
                      registeredPatients.slice(0, 4).map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border-l-4 border-primary">
                          <div className="text-center w-14 shrink-0">
                            <p className="text-xs text-tertiary font-bold">{`09:${(idx * 30).toString().padStart(2, '0')}`}</p>
                            <p className="text-[10px] text-primary font-bold">{p.status === 'Active' ? 'ACTIVE' : 'QUEUED'}</p>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-headline font-bold text-on-surface text-sm truncate">{p.name}</p>
                            <p className="text-xs text-tertiary truncate">{p.meta}</p>
                          </div>
                          <span className="text-[10px] font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full shrink-0">
                            {p.status || 'Active'}
                          </span>
                        </div>
                      ))
                    )}
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
        {/* ─────────── PATIENT DIRECTORY VIEW ─────────── */}
        {currentView === 'directory' && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-10 transition-all duration-300">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline font-bold text-2xl text-on-surface">Patient Directory</h2>
                  <p className="text-xs text-tertiary">Registered patients from database</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    {registeredPatients.length} Real Patients Registered
                  </span>
                </div>
              </div>

              {registeredPatients.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl">group</span>
                  </div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">No Registered Patients Yet</h3>
                  <p className="text-xs text-tertiary max-w-sm mx-auto">
                    When new patients sign up or book consultations, their profile will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {registeredPatients
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.meta.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((p) => (
                      <div key={p.id} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {p.photo ? (
                                <img src={p.photo} className="w-12 h-12 rounded-xl object-cover" alt={p.name} />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h3 className="font-headline font-bold text-on-surface text-base">{p.name}</h3>
                                <p className="text-xs text-tertiary truncate max-w-[150px]">{p.meta}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-green-500/10 text-green-700 px-2 py-0.5 rounded-full">Database</span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-tertiary">Status:</span>
                              <span className="font-bold text-on-surface">{p.status}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-tertiary">Registered Email:</span>
                              <span className="font-bold text-on-surface truncate max-w-[130px]">{p.meta}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-surface-container-low">
                          <button
                            onClick={() => {
                              setRealPatientData({ id: p.id, name: p.name, email: p.meta });
                              setSelectedPatientId(p.id);
                              setCurrentView('schedule');
                            }}
                            className="flex-1 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors"
                          >
                            Review Patient
                          </button>
                          <button
                            onClick={() => {
                              setRealPatientData({ id: p.id, name: p.name, email: p.meta });
                              setSelectedPatientId(p.id);
                              setShowPrescriptionModal(true);
                            }}
                            className="py-2 px-3 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary/90 transition-colors"
                          >
                            Prescribe
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────── MEDICAL RECORDS VIEW ─────────── */}
        {currentView === 'records' && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-10 transition-all duration-300">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline font-bold text-2xl text-on-surface">Clinical Medical Records (EHR)</h2>
                  <p className="text-xs text-tertiary">Interoperable FHIR R4 health records repository & prescription ledger</p>
                </div>
                <button
                  onClick={() => {
                    const fhirBundle = {
                      resourceType: "Bundle",
                      type: "collection",
                      timestamp: new Date().toISOString(),
                      entry: registeredPatients.map(p => ({
                        resource: {
                          resourceType: "Patient",
                          id: p.id,
                          name: [{ text: p.name }],
                          telecom: [{ system: "email", value: p.meta }],
                          active: true
                        }
                      }))
                    };
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fhirBundle, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `CuraTrack_FHIR_Bundle_${Date.now()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="primary-gradient text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">download</span> Export FHIR Bundle (JSON)
                </button>
              </div>

              {/* Patient EHR Summary Explorer */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-surface-container">
                  <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">Electronic Health Record (EHR) Summary</h3>
                    <p className="text-xs text-tertiary">Select patient to view clinical chart & active medical history</p>
                  </div>
                  <button
                    onClick={() => setShowPrescriptionModal(true)}
                    className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span> Issue E-Prescription
                  </button>
                </div>

                {/* Patient Selector Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {registeredPatients.length === 0 ? (
                    <span className="text-xs text-tertiary">No registered patient charts found.</span>
                  ) : (
                    registeredPatients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setRealPatientData({ id: p.id, name: p.name, email: p.meta });
                          setSelectedPatientId(p.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                          selectedPatient?.id === p.id
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-transparent'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                </div>

                {/* Active Patient EHR Sheet */}
                <div className="bg-surface-container-low rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-lg text-on-surface">{selectedPatient.name}</h4>
                        <p className="text-xs text-tertiary">{selectedPatient.meta}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-green-500/10 text-green-700 px-3 py-1 rounded-full">
                      ● Active Chart
                    </span>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-surface-container">
                      <p className="text-[11px] font-bold text-tertiary uppercase">Blood Pressure</p>
                      <p className="font-headline text-lg font-bold text-on-surface mt-1">{selectedPatient.vitals?.bp || '120/80'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-surface-container">
                      <p className="text-[11px] font-bold text-tertiary uppercase">Heart Rate</p>
                      <p className="font-headline text-lg font-bold text-on-surface mt-1">{selectedPatient.vitals?.hr || '72 bpm'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-surface-container">
                      <p className="text-[11px] font-bold text-tertiary uppercase">Blood Oxygen</p>
                      <p className="font-headline text-lg font-bold text-on-surface mt-1">{selectedPatient.vitals?.spo2 || '98%'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-surface-container">
                      <p className="text-[11px] font-bold text-tertiary uppercase">Weight</p>
                      <p className="font-headline text-lg font-bold text-on-surface mt-1">{selectedPatient.vitals?.weight || '145 lbs'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prescription History Section */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container space-y-4">
                <h3 className="font-headline font-bold text-base text-on-surface">Prescription History ({prescriptionsList.length})</h3>
                <div className="space-y-3">
                  {prescriptionsList.length === 0 ? (
                    <div className="p-6 bg-surface-container-low rounded-2xl text-center text-xs text-tertiary border border-surface-container">
                      No e-prescriptions issued yet. Click "Issue E-Prescription" above or on any patient card to create a digital rx.
                    </div>
                  ) : (
                    prescriptionsList.map((rx, rIdx) => (
                      <div key={rIdx} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined">pill</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{rx.medication} ({rx.dosage}) — {rx.patientName}</p>
                            <p className="text-xs text-tertiary">{rx.date} · {rx.frequency}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-green-500/10 text-green-700 px-3 py-1 rounded-full">Issued</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── SETTINGS VIEW ─────────── */}
        {currentView === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-10 transition-all duration-300">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-headline font-bold text-2xl text-on-surface">Doctor Practice Settings</h2>
              
              <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container space-y-6">
                <div className="flex items-center gap-5 pb-6 border-b border-surface-container">
                  <img
                    alt={doctorName}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-primary/20 shadow-md"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV3tj75_r2NcimLJqIr5Gzc77ZCRja6X841HxFsl5mmB0oLjuoWy0e-8GTa4JltLLuzkdL9X665dXwotQzjQgSfM5Z75m8SQZ1J6ZIuWYRwdUDThE5RoiaO2bPXpxdOhem4M5CvhBwnp-zKmCzeG_bG7-X9ZoHmHGJtRI1U5gBjS0kXE4CGv9MAZeuRqU2fiMAzdwBV4Ej2YHHmUb4EVqojDdMn26AMm4fB6LR7bnCAsV2qiAJqv7blEepmcnUqaTdjLQFlckjUPM"
                  />
                  <div>
                    <h3 className="font-headline font-extrabold text-2xl text-on-surface">{doctorName}</h3>
                    <p className="text-sm text-tertiary">Chief of Surgery · Metro City Medical Center</p>
                    <span className="inline-block mt-2 text-xs font-bold text-green-700 bg-green-500/10 px-3 py-1 rounded-full">
                      Verified License: MED-00471-TX
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-headline font-bold text-sm text-tertiary uppercase tracking-wider">Clinical Preferences</h4>
                  
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <div>
                      <p className="text-sm font-bold text-on-surface">Default Consultation Duration</p>
                      <p className="text-xs text-tertiary">Set slot duration for telehealth video consults</p>
                    </div>
                    <span className="text-xs font-bold bg-surface-container px-3 py-1.5 rounded-xl text-primary">20 minutes</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <div>
                      <p className="text-sm font-bold text-on-surface">Urgent Call Auto-Accept</p>
                      <p className="text-xs text-tertiary">Automatically light up video room when urgent patient enters queue</p>
                    </div>
                    <span className="text-xs font-bold bg-green-500/10 text-green-700 px-3 py-1.5 rounded-xl">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════ E-PRESCRIPTION MODAL ═══════════════════════ */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-surface-container">
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Issue Digital E-Prescription</h3>
                <p className="text-xs text-tertiary">Patient: {selectedPatient.name}</p>
              </div>
              <button onClick={() => setShowPrescriptionModal(false)} className="text-tertiary hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!prescriptionData.medication) return;

                const effectivePatientId = (selectedPatient && selectedPatient.id && selectedPatient.id !== 'pending-patient')
                  ? selectedPatient.id
                  : 'demo-patient-001';
                const effectivePatientName = (selectedPatient && selectedPatient.name && selectedPatient.name !== 'Select Patient')
                  ? selectedPatient.name
                  : 'Akshanth N';

                const issuedAt = new Date();
                const prescriptionInstructions = prescriptionData.notes || 'Take as prescribed by physician';
                const newRx = {
                  id: `rx-${issuedAt.getTime()}`,
                  name: prescriptionData.medication,
                  medication: prescriptionData.medication,
                  dosage: prescriptionData.dosage,
                  frequency: prescriptionData.frequency,
                  notes: prescriptionInstructions,
                  instructions: prescriptionInstructions,
                  patientName: effectivePatientName,
                  patientId: effectivePatientId,
                  patient_id: effectivePatientId,
                  doctor: doctorName || 'Dr. David Ross',
                  doctorName: doctorName || 'Dr. David Ross',
                  doctor_name: doctorName || 'Dr. David Ross',
                  date: issuedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                };

                const updatedList = [newRx, ...prescriptionsList];
                setPrescriptionsList(updatedList);

                try {
                  localStorage.setItem('curatrack_prescriptions', JSON.stringify(updatedList));
                  localStorage.setItem(`curatrack_prescriptions_${effectivePatientId}`, JSON.stringify(
                    [newRx, ...prescriptionsList.filter((rx) => rx.patientId === effectivePatientId || rx.patient_id === effectivePatientId)]
                  ));
                  window.dispatchEvent(new Event('storage'));
                  window.dispatchEvent(new CustomEvent('curatrack-prescription-issued', { detail: newRx }));
                } catch (err) {
                  console.warn('Could not persist prescription locally:', err);
                }

                try {
                  const prescriptionRow = {
                    patient_id: effectivePatientId,
                    name: prescriptionData.medication,
                    medication: prescriptionData.medication,
                    dosage: prescriptionData.dosage,
                    frequency: prescriptionData.frequency,
                    doctor: doctorName || 'Dr. David Ross',
                    doctor_name: doctorName || 'Dr. David Ross',
                    instructions: prescriptionInstructions,
                    date: issuedAt.toISOString()
                  };
                  const medicationRow = {
                    patient_id: effectivePatientId,
                    name: prescriptionData.medication,
                    dosage: prescriptionData.dosage,
                    frequency: prescriptionData.frequency,
                    time: 'Morning',
                    reason: prescriptionInstructions,
                    instructions: prescriptionInstructions,
                    doctor: doctorName || 'Dr. David Ross',
                    status: 'UPCOMING',
                    source: 'doctor_prescription',
                    active: true
                  };

                  await supabase.from('prescriptions').insert(prescriptionRow);
                  await supabase.from('medications').insert(medicationRow);
                } catch (err) {
                  console.warn('Could not sync prescription into patient health records:', err);
                }

                setShowPrescriptionModal(false);
                setPrescriptionData({ medication: '', dosage: '', frequency: 'Twice daily after meals', notes: '' });
                alert(`✅ E-Prescription for ${effectivePatientName} issued successfully and added to patient health records!`);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin, Metformin"
                  value={prescriptionData.medication}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, medication: e.target.value })}
                  className="w-full bg-surface-container-low p-3.5 rounded-xl border border-surface-container outline-none text-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg"
                    value={prescriptionData.dosage}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })}
                    className="w-full bg-surface-container-low p-3.5 rounded-xl border border-surface-container outline-none text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1">Frequency</label>
                  <select
                    value={prescriptionData.frequency}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, frequency: e.target.value })}
                    className="w-full bg-surface-container-low p-3.5 rounded-xl border border-surface-container outline-none text-sm focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily after meals">Twice daily after meals</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="As needed for pain">As needed for pain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1">Clinical Notes & Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Take after food. Drink plenty of water."
                  value={prescriptionData.notes}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                  className="w-full bg-surface-container-low p-3.5 rounded-xl border border-surface-container outline-none text-sm focus:ring-2 focus:ring-primary/20"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="flex-1 py-3 bg-surface-container text-on-surface text-xs font-bold rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 primary-gradient text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Issue E-Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div className="relative bg-surface-container-low p-6 rounded-2xl border border-surface-container text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/passport/demo?token=demo&patient=${encodeURIComponent(modalPatient.name)}`
                  )}`}
                  alt="Scannable Health Passport QR Code"
                  className="w-48 h-48 mx-auto rounded-xl shadow-sm border border-white"
                />
                <p className="text-[10px] text-tertiary mt-2 font-bold uppercase tracking-wider">Scan with mobile camera for Health Passport</p>
              </div>
            </div>

            {/* Encoded Records */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Encoded Records</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="material-symbols-outlined fill-icon text-primary text-xl">medication</span>
                  <p className="text-[11px] font-bold text-on-surface mt-1">Active Rx</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="material-symbols-outlined fill-icon text-secondary text-xl">biotech</span>
                  <p className="text-[11px] font-bold text-on-surface mt-1">Lab Results</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="material-symbols-outlined fill-icon text-tertiary text-xl">description</span>
                  <p className="text-[11px] font-bold text-on-surface mt-1">EHR Notes</p>
                </div>
              </div>
            </div>

            {/* Encryption notice */}
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl mb-5">
              <span className="material-symbols-outlined fill-icon text-secondary text-base">lock</span>
              <p className="text-xs text-on-surface-variant">
                <span className="font-bold text-secondary">Dynamic encryption active</span> · Refreshes in 02:45 · All scans logged
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const fhirBundle = {
                    resourceType: "Bundle",
                    type: "collection",
                    timestamp: new Date().toISOString(),
                    entry: [{
                      resource: {
                        resourceType: "Patient",
                        id: modalPatient.id,
                        name: [{ text: modalPatient.name }],
                        telecom: [{ system: "email", value: modalPatient.meta }],
                        vitals: modalPatient.vitals || { bp: '120/80', hr: '72 bpm', spo2: '98%', weight: '145 lbs' },
                        active: true
                      }
                    }]
                  };
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fhirBundle, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `FHIR_Record_${modalPatient.name.replace(/\s+/g, '_')}_${Date.now()}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">download</span> Download
              </button>
              <button
                onClick={() => {
                  setQrModalPatientId(null);
                  setRealPatientData({ id: modalPatient.id, name: modalPatient.name, email: modalPatient.meta });
                  setSelectedPatientId(modalPatient.id);
                  setCurrentView('records');
                }}
                className="flex-1 py-3 primary-gradient text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined fill-icon text-base">folder_shared</span> Open Full Record
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
