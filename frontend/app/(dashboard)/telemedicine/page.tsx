'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  picture?: string;
}

interface Appointment {
  id: string;
  client_id: string;
  doctor_id: string;
  status: string;
  room_id: string;
  scheduled_time?: string;
}

interface Beneficiary {
  id: string;
  patient_id?: string;
  name: string;
  age?: number;
  gender?: string;
  category?: string;
  risk_level?: string;
  village_name?: string;
  next_due_service?: string;
  risk_factors?: string[];
  blood_group?: string;
  abha_id?: string;
}

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
];

function parseTimeSlot(slot: string): { hours: number; minutes: number } {
  const [time, ampm] = slot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function getMinDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getMaxDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export default function TelemedicinePage() {
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeAppointments, setActiveAppointments] = useState<Appointment[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>('');
  const [ashaComplaint, setAshaComplaint] = useState('');
  const [ashaPriority, setAshaPriority] = useState<'ROUTINE' | 'PRIORITY' | 'EMERGENCY'>('ROUTINE');
  const [ashaVitals, setAshaVitals] = useState({
    systolic: '130',
    diastolic: '84',
    spo2: '98',
    heartRate: '76',
    temperature: '98.6',
  });

  // Scheduling state
  const [schedulingDoctorId, setSchedulingDoctorId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState<string>(getMinDateStr());
  const [schedTime, setSchedTime] = useState<string>('');
  const [schedNotes, setSchedNotes] = useState<string>('');
  const [schedBooking, setSchedBooking] = useState(false);
  const [schedSuccess, setSchedSuccess] = useState<string | null>(null);

  // Fetch patient's own scheduled and active appointments
  const fetchPatientAppointments = useCallback(async (userId: string, doctorsList: Doctor[], userRole?: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .in('status', ['ringing', 'scheduled', 'active'])
        .order('scheduled_time', { ascending: true });

      if (userRole === 'fhw') {
        query = query.or(`asha_id.eq.${userId},client_id.eq.${userId}`);
      } else {
        query = query.eq('client_id', userId);
      }

      const { data: appts } = await query;

      if (appts) {
        const enriched = appts.map((a: any) => {
          const doc = (doctorsList || []).find((d: any) => d.id === a.doctor_id);
          return {
            ...a,
            doctor_name: doc?.name || a.doctor_name || 'Dr. David Ross',
            specialty: doc?.specialty || a.specialty || 'General Medicine & OPD Specialist',
            doctor_picture: doc?.picture || null,
          };
        });
        setPatientAppointments(enriched);
      } else {
        setPatientAppointments([]);
      }
    } catch (err) {
      console.warn('Error fetching patient appointments:', err);
    }
  }, [supabase]);

  useEffect(() => {
    async function fetchData() {
      let authUser: any = null;
      try {
        const { data } = await supabase.auth.getUser();
        authUser = data?.user;
      } catch {}

      let savedAuthUser: any = null;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('curatrack_auth_user');
          if (raw) savedAuthUser = JSON.parse(raw);
        } catch {}
      }

      const activeRole = (typeof window !== 'undefined' ? localStorage.getItem('curatrack_active_role') : null) || savedAuthUser?.role || 'patient';

      const effectiveUser = authUser || savedAuthUser || {
        id: 'pat-kavita-001',
        email: 'patient@curatrack.com',
        name: 'Kavita Bai',
        role: activeRole,
      };

      setUser(effectiveUser);

      let fetchedProfile: any = null;
      if (effectiveUser.id) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', effectiveUser.id)
            .maybeSingle();
          fetchedProfile = data;
        } catch {}
      }

      const finalProfile = fetchedProfile || {
        id: effectiveUser.id,
        name: effectiveUser.name || 'Kavita Bai',
        role: activeRole,
      };

      setProfile(finalProfile);

      // Fetch actual doctors from database profiles
      let doctorsData: Doctor[] = [];
      try {
        const { data: profDocs } = await supabase
          .from('profiles')
          .select('id, name, email, specialty, picture, gender')
          .eq('role', 'doctor');

        if (profDocs && profDocs.length > 0) {
          doctorsData = profDocs.map((d: any) => ({
            id: d.id,
            name: d.name?.startsWith('Dr.') ? d.name : `Dr. ${d.name || 'David Ross'}`,
            specialty: d.specialty || (
              d.name?.includes('Priya')
                ? 'Obstetrics & Maternal-Fetal Medicine'
                : d.name?.includes('Deshmukh')
                ? 'Pediatrics & Child Healthcare Specialist'
                : 'Cardiology & Internal Medicine Specialist'
            ),
            picture: d.picture || undefined,
          }));
        }
      } catch (err) {
        console.warn('Error fetching doctors from database profiles:', err);
      }

      // Authoritative real database doctors fallback
      const realDoctorsFallback: Doctor[] = [
        {
          id: '8a29487d-b3db-4960-adb7-f8dd938fb63b',
          name: 'Dr. David Ross',
          specialty: 'Cardiology & Internal Medicine Specialist',
          picture: undefined,
        },
        {
          id: '5fa64f24-417d-46b8-b84f-464a65793005',
          name: 'Dr. Priya Nair',
          specialty: 'Obstetrics & Maternal-Fetal Medicine',
          picture: undefined,
        },
        {
          id: 'b77f6b17-3ed0-4bf9-be82-5973a624a246',
          name: 'Dr. V. K. Deshmukh',
          specialty: 'Pediatrics & Child Healthcare Specialist',
          picture: undefined,
        }
      ];

      const finalDoctors = doctorsData.length > 0 ? doctorsData : realDoctorsFallback;
      setDoctors(finalDoctors);

      if (finalProfile?.role === 'fhw') {
        let loadedBeneficiaries: Beneficiary[] = [];
        try {
          const benData = await apiFetch('/api/fhw/beneficiaries');
          loadedBeneficiaries = benData?.beneficiaries || [];
        } catch (err) {
          console.warn('Error loading ASHA beneficiaries via API:', err);
        }

        if (loadedBeneficiaries.length === 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('*')
              .neq('role', 'doctor')
              .neq('role', 'facility_manager');

            if (profs && profs.length > 0) {
              const categories = ['Maternal ANC', 'NCD Chronic', 'Child Immunization', 'TB / Communicable'];
              const villages = ['Borvihir Pada', 'Dongargaon Pada', 'Nandurbar Block A', 'Dhanora Pada'];
              loadedBeneficiaries = profs.map((p: any, idx: number) => {
                const pName = (p.name || '').trim() || (p.email ? p.email.split('@')[0] : 'Patient');
                return {
                  id: `BEN-${String(100 + idx + 1)}`,
                  patient_id: p.id,
                  name: pName,
                  age: p.age || (24 + (idx * 5) % 45),
                  gender: p.gender || (idx % 2 === 0 ? 'Female' : 'Male'),
                  category: categories[idx % categories.length],
                  risk_level: idx % 3 === 0 ? 'HIGH' : (idx % 3 === 1 ? 'MODERATE' : 'LOW'),
                  village_name: villages[idx % villages.length],
                  next_due_service: `${categories[idx % categories.length]} Routine Check`,
                  blood_group: p.blood_group || 'O+',
                  abha_id: p.abha_id,
                };
              });
            }
          } catch {}
        }

        if (loadedBeneficiaries.length === 0) {
          try {
            const cached = localStorage.getItem('curatrack_fhw_cached_beneficiaries');
            if (cached) loadedBeneficiaries = JSON.parse(cached);
          } catch {}
        }

        setBeneficiaries(loadedBeneficiaries);
        if (loadedBeneficiaries.length > 0) {
          const firstBen = loadedBeneficiaries[0];
          setSelectedBeneficiaryId(prev => prev || firstBen.id);
          setAshaComplaint(prev => prev || firstBen.next_due_service || firstBen.risk_factors?.[0] || '');
        }
      }

      if (finalProfile?.role === 'doctor') {
        try {
          const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', effectiveUser.id)
            .eq('status', 'active');

          setActiveAppointments(appts || []);
        } catch {}
      } else {
        await fetchPatientAppointments(effectiveUser.id, finalDoctors, finalProfile?.role);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase, fetchPatientAppointments]);

  useEffect(() => {
    if (profile?.role !== 'doctor' || !user) return;

    const channel = supabase
      .channel('doctor_appointments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}`,
        },
        (payload) => {
          setActiveAppointments((prev) => {
            const incoming = payload.new as Appointment;

            if (prev.some((appt) => appt.id === incoming.id)) {
              return prev;
            }

            return [incoming, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role, supabase, user]);

  useEffect(() => {
    if (profile?.role === 'doctor' || !user) return;

    const channel = supabase
      .channel('patient_appointments_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${user.id}`,
        },
        () => {
          fetchPatientAppointments(user.id, doctors);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role, supabase, user, doctors, fetchPatientAppointments]);

  const cancelAppointment = async (apptId: string) => {
    try {
      // 1. Optimistic UI update
      setPatientAppointments(prev => prev.filter(a => a.id !== apptId));

      // 2. Mark status as ended in Supabase (bypasses RLS delete restrictions)
      await supabase
        .from('appointments')
        .update({ status: 'ended' })
        .eq('id', apptId);

      // 3. Attempt physical delete
      await supabase
        .from('appointments')
        .delete()
        .eq('id', apptId);

      if (user) {
        fetchPatientAppointments(user.id, doctors);
      }
    } catch (err) {
      console.warn('Error cancelling appointment:', err);
    }
  };

  const handleClearAllPatientAppointments = async () => {
    if (!user) return;
    try {
      // 1. Optimistic UI update
      setPatientAppointments([]);

      // 2. Mark all user appointments as ended in Supabase
      if (profile?.role === 'fhw') {
        await supabase
          .from('appointments')
          .update({ status: 'ended' })
          .or(`asha_id.eq.${user.id},client_id.eq.${user.id}`);

        await supabase
          .from('appointments')
          .delete()
          .or(`asha_id.eq.${user.id},client_id.eq.${user.id}`);
      } else {
        await supabase
          .from('appointments')
          .update({ status: 'ended' })
          .eq('client_id', user.id);

        await supabase
          .from('appointments')
          .delete()
          .eq('client_id', user.id);
      }

      setPatientAppointments([]);
    } catch (err) {
      console.warn('Error clearing patient appointments:', err);
    }
  };

  const isDoctor = profile?.role === 'doctor';
  const isFhw = profile?.role === 'fhw';
  const selectedBeneficiary = beneficiaries.find(ben => ben.id === selectedBeneficiaryId);
  const availableDoctors = doctors.length;
  const activeRequests = activeAppointments.length;
  const urgentQueue = activeAppointments.slice(0, 3);
  const heroName = isDoctor ? 'Care Command' : isFhw ? 'Assisted Care' : 'Virtual Care';

  const getInsertableAppointment = (payload: any) => {
    const knownBaseColumns = [
      'client_id',
      'doctor_id',
      'doctor_name',
      'scheduled_time',
      'room_id',
      'status',
      'date',
      'time',
      'type',
      'notes',
    ];

    const optionalColumns = [
      'patient_id',
      'patient_name',
      'beneficiary_id',
      'asha_id',
      'asha_name',
      'village_name',
      'priority',
      'complaint',
      'vitals_bp',
      'vitals_hr',
      'vitals_spo2',
      'vitals_temp',
      'vitals_bmi',
      'consult_type',
      'token',
      'doctor_name',
      'date',
      'time',
      'type',
    ];

    return async () => {
      let { error } = await supabase.from('appointments').insert(payload);
      if (!error) return null;

      if (
        optionalColumns.some(column => error?.message?.includes(column)) ||
        error?.message?.includes('schema cache') ||
        error?.message?.includes('column')
      ) {
        const minimalPayload: any = {};
        for (const col of knownBaseColumns) {
          if (payload[col] !== undefined) {
            minimalPayload[col] = payload[col];
          }
        }
        minimalPayload.notes = payload.notes || 'Appointment booked';
        const retry = await supabase.from('appointments').insert(minimalPayload);
        error = retry.error;
      }

      return error;
    };
  };

  const buildAssistedPayload = (doctorId: string, roomId: string, status: 'active' | 'ringing', scheduledTime: Date) => {
    if (!user || !selectedBeneficiary) return null;
    const doctor = doctors.find(d => d.id === doctorId);
    const bp = `${Number(ashaVitals.systolic) || 120}/${Number(ashaVitals.diastolic) || 80}`;
    const complaint = ashaComplaint.trim() || selectedBeneficiary.next_due_service || 'ASHA-assisted teleconsultation request';
    const ashaName = profile?.name || user.name || 'Sunita Tai (ASHA)';
    const patientResolvedId = selectedBeneficiary.patient_id || selectedBeneficiary.id;
    const patientResolvedName = selectedBeneficiary.name || 'Patient';

    const notes = [
      `Assisted teleconsult initiated by ${ashaName} for patient ${patientResolvedName}.`,
      `Village: ${selectedBeneficiary.village_name || 'Not recorded'}.`,
      `Chief complaint: ${complaint}.`,
      `Vitals: BP ${bp} mmHg, HR ${ashaVitals.heartRate || '76'} bpm, SpO2 ${ashaVitals.spo2 || '98'}%, Temp ${ashaVitals.temperature || '98.6'} F.`,
      `Patient category: ${selectedBeneficiary.category || 'General'}; ASHA risk: ${selectedBeneficiary.risk_level || ashaPriority}.`,
    ].join('\n');

    return {
      client_id: patientResolvedId,
      doctor_id: doctorId,
      doctor_name: doctor?.name || 'Doctor',
      scheduled_time: scheduledTime.toISOString(),
      room_id: roomId,
      status,
      date: scheduledTime.toISOString().split('T')[0],
      time: scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'video',
      consult_type: 'assisted_teleconsult',
      patient_name: patientResolvedName,
      beneficiary_id: selectedBeneficiary.id,
      asha_id: user.id,
      asha_name: ashaName,
      village_name: selectedBeneficiary.village_name || 'Catchment Area',
      priority: ashaPriority,
      complaint,
      vitals_bp: bp,
      vitals_hr: Number(ashaVitals.heartRate) || 76,
      vitals_spo2: Number(ashaVitals.spo2) || 98,
      vitals_temp: ashaVitals.temperature || '98.6',
      vitals_bmi: 'N/A',
      token: `TKN-ASHA-${String(Date.now()).slice(-4)}`,
      notes,
    };
  };

  const bookAppointment = async (doctorId: string) => {
    if (!user) return;
    if (isFhw && !selectedBeneficiary) {
      alert('Select a patient before connecting to a doctor.');
      return;
    }

    setBookingDoctorId(doctorId);

    // Reuse existing active room if already booked with doctor
    const existing = patientAppointments.find(a =>
      a.doctor_id === doctorId &&
      a.status === 'active' &&
      (!isFhw || a.beneficiary_id === selectedBeneficiary?.id || a.client_id === (selectedBeneficiary?.patient_id || selectedBeneficiary?.id))
    );
    if (existing && existing.room_id) {
      router.push(`/call/${existing.room_id}`);
      return;
    }

    const roomId = crypto.randomUUID();
    const payload: any = isFhw
      ? buildAssistedPayload(doctorId, roomId, 'ringing', new Date())
      : {
          client_id: user.id,
          doctor_id: doctorId,
          scheduled_time: new Date().toISOString(),
          room_id: roomId,
          status: 'active',
          priority: 'ROUTINE',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

    if (!payload) {
      setBookingDoctorId(null);
      return;
    }

    let error = await getInsertableAppointment(payload)();

    if (!isFhw && error && (error.message.includes('room_id') || error.message.includes('scheduled_time'))) {
      if (error.message.includes('room_id')) delete payload.room_id;
      if (error.message.includes('scheduled_time')) delete payload.scheduled_time;
      const retry = await supabase.from('appointments').insert(payload);
      error = retry.error;
    }

    if (error) {
      setBookingDoctorId(null);
      alert(`Error booking appointment: ${error.message}`);
      return;
    }

    router.push(`/call/${roomId}`);
  };

  const toggleSchedulePanel = (doctorId: string) => {
    if (schedulingDoctorId === doctorId) {
      setSchedulingDoctorId(null);
      setSchedTime('');
      setSchedNotes('');
      setSchedSuccess(null);
    } else {
      setSchedulingDoctorId(doctorId);
      setSchedDate(getMinDateStr());
      setSchedTime('');
      setSchedNotes('');
      setSchedSuccess(null);
    }
  };

  const scheduleAppointment = async (doctorId: string) => {
    if (!user || !schedDate || !schedTime) return;
    if (isFhw && !selectedBeneficiary) {
      alert('Select a patient before scheduling with a doctor.');
      return;
    }

    setSchedBooking(true);
    setSchedSuccess(null);

    try {
      const { hours, minutes } = parseTimeSlot(schedTime);
      const scheduledDate = new Date(schedDate);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const roomId = crypto.randomUUID();
      const payload: any = isFhw
        ? buildAssistedPayload(doctorId, roomId, 'active', scheduledDate)
        : {
            client_id: user.id,
            doctor_id: doctorId,
            scheduled_time: scheduledDate.toISOString(),
            room_id: roomId,
            status: 'active',
            priority: 'ROUTINE',
            doctor_name: doctors.find(d => d.id === doctorId)?.name || 'Doctor',
            date: schedDate,
            time: schedTime,
          };

      if (!payload) return;

      let error = await getInsertableAppointment(payload)();

      if (!isFhw && error && (error.message.includes('room_id') || error.message.includes('scheduled_time'))) {
        if (error.message.includes('room_id')) delete payload.room_id;
        if (error.message.includes('scheduled_time')) delete payload.scheduled_time;
        const retry = await supabase.from('appointments').insert(payload);
        error = retry.error;
      }

      if (error) {
        alert(`Scheduling error: ${error.message}`);
      } else {
        const docName = doctors.find(d => d.id === doctorId)?.name || 'Doctor';
        setSchedSuccess(`Appointment with ${docName} confirmed for ${schedDate} at ${schedTime}`);
        setSchedTime('');
        setSchedNotes('');
        if (user) {
          fetchPatientAppointments(user.id, doctors);
        }
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSchedBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="animate-pulse space-y-6">
          <div className="h-40 rounded-[2rem] bg-surface-container-low" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 rounded-3xl bg-surface-container-low" />
            <div className="h-32 rounded-3xl bg-surface-container-low" />
            <div className="h-32 rounded-3xl bg-surface-container-low" />
          </div>
          <div className="h-80 rounded-[2rem] bg-surface-container-low" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 lg:p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-12 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-28 -left-12 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="relative grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-8 items-start">
          <div className="space-y-6">
            <div>
              <h1 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface leading-none">
                {heroName} Center
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-primary/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined fill-icon">hub</span>
                </div>
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em] mb-1">
	                  {isDoctor ? 'Open Requests' : isFhw ? 'Selected Patients' : 'Available Doctors'}
                </p>
                <p className="font-headline text-3xl font-extrabold text-on-surface">
	                  {isDoctor ? activeRequests : isFhw ? beneficiaries.length : availableDoctors}
                </p>
                <p className="text-xs text-tertiary/70 mt-1">
	                  {isDoctor ? 'Patients waiting now' : isFhw ? 'Ready for assisted handoff' : 'Ready for virtual consult'}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-secondary/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined fill-icon">schedule</span>
                </div>
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em] mb-1">
                  Response Window
                </p>
                <p className="font-headline text-3xl font-extrabold text-on-surface">
                  {isDoctor ? '< 5' : '~ 15'}
                </p>
                <p className="text-xs text-tertiary/70 mt-1">Minutes for live care flow</p>
              </div>

              <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-tertiary/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined fill-icon">verified_user</span>
                </div>
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em] mb-1">Privacy Layer</p>
                <p className="font-headline text-3xl font-extrabold text-on-surface">P2P</p>
                <p className="text-xs text-tertiary/70 mt-1">Secure room-based session setup</p>
              </div>
            </div>
          </div>

          <div className="relative rounded-[2.5rem] bg-white p-8 border border-outline-variant/20 shadow-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-secondary/[0.03] group-hover:from-primary/[0.05] group-hover:to-secondary/[0.05] transition-colors" />
            <div className="relative space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-tertiary font-bold">Live Status</p>
                  <h2 className="mt-2 text-2xl font-headline font-bold text-on-surface">
                    {isDoctor ? 'Consultation Queue' : 'Express Booking'}
                  </h2>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 text-primary text-xs font-bold">
                  {isDoctor ? `${activeRequests} Active` : `${availableDoctors} Online`}
                </div>
              </div>

              <div className="space-y-4">
                {(isDoctor ? urgentQueue : doctors.slice(0, 3)).map((item, index) => {
	                  const title = isDoctor
	                    ? `Patient request #${(item as Appointment).id.slice(0, 8)}`
	                    : isFhw
	                    ? selectedBeneficiary?.name || 'Select a patient below'
	                    : (item as Doctor).name;
	                  const subtitle = isDoctor
	                    ? `Room ${(item as Appointment).room_id.slice(0, 8)}`
	                    : isFhw
	                    ? `${(item as Doctor).name} • ${selectedBeneficiary?.village_name || 'No patient selected'}`
	                    : (item as Doctor).specialty || 'General Specialist';

                  return (
                    <div
                      key={isDoctor ? (item as Appointment).id : (item as Doctor).id}
                      className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 px-5 py-4 hover:border-primary/20 hover:shadow-sm transition-all"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">
                          {isDoctor ? 'notifications_active' : 'medical_services'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-on-surface truncate">{title}</p>
                        <p className="text-sm text-tertiary truncate">{subtitle}</p>
                      </div>
                      <span className="text-xs font-bold text-tertiary/40">0{index + 1}</span>
                    </div>
                  );
                })}

                {(isDoctor ? urgentQueue.length === 0 : doctors.length === 0) && (
                  <div className="rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/30 p-6 text-sm text-tertiary text-center">
                    {isDoctor
                      ? 'No incoming requests right now. Your queue is clear.'
                      : 'No specialists are listed yet.'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-tertiary/70 bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                <span className="material-symbols-outlined text-base text-secondary">verified</span>
                Sessions launch inside a dedicated room with end-to-end security.
              </div>
            </div>
          </div>
        </div>
      </section>

      {isDoctor ? (
        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-6">
          <div className="bg-white rounded-[2rem] border border-outline-variant/20 shadow-sm p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                  Incoming Call Requests
                </h2>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-surface-container-low text-sm font-bold text-on-surface-variant">
                {activeRequests} active consultation{activeRequests === 1 ? '' : 's'}
              </div>
            </div>

            {activeAppointments.length === 0 ? (
              <div className="rounded-[1.75rem] bg-surface-container-low p-10 text-center">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-primary shadow-sm mb-4">
                  <span className="material-symbols-outlined text-3xl">video_chat</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface">Queue is clear</h3>
                <p className="text-tertiary mt-2 max-w-md mx-auto">
                  No patients are waiting at the moment. New requests will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAppointments.map((appt, index) => (
                  <div
                    key={appt.id}
                    className="group rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-lowest p-5 lg:p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                      <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined fill-icon">person_alert</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-headline text-xl font-bold text-on-surface">
                            Patient Request {index + 1}
                          </h3>
                          <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest">
                            Active
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-tertiary">
                          <span className="px-3 py-1.5 rounded-xl bg-surface-container-low">
                            Appointment ID: <span className="font-bold text-on-surface">{appt.id.slice(0, 8)}</span>
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-surface-container-low">
                            Room: <span className="font-bold text-on-surface">{appt.room_id.slice(0, 8)}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/call/${appt.room_id}`)}
                        className="shrink-0 px-6 py-3 rounded-2xl primary-gradient text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined">login</span>
                        Join Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-outline-variant/20 shadow-sm p-6">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Doctor Workflow</h3>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-low">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">notifications</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Receive request</p>
                    <p className="text-sm text-tertiary">New consultations appear in real time as soon as patients book.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-low">
                  <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">videocam</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Open room</p>
                    <p className="text-sm text-tertiary">Join the generated room and start the video consultation instantly.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-low">
                  <div className="w-11 h-11 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">health_and_safety</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Keep care moving</p>
                    <p className="text-sm text-tertiary">Use the queue view to triage active sessions without losing context.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-outline-variant/20 shadow-sm p-8 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.02] to-primary/[0.02]" />
               <div className="relative">
                <p className="text-[10px] uppercase tracking-[0.24em] text-tertiary font-bold mb-2">Queue Health</p>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-3">System Online</h3>
                <p className="text-tertiary text-sm leading-relaxed mb-6">
                  Workspace optimized for low-friction handoff. Real-time listening enabled.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-surface-container-lowest p-5 border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] text-tertiary uppercase tracking-widest font-bold">Active</p>
                    <p className="text-3xl font-headline font-extrabold text-primary mt-1">{activeRequests}</p>
                  </div>
                  <div className="rounded-3xl bg-primary text-white p-5 shadow-lg shadow-primary/20">
                    <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Status</p>
                    <p className="text-xs font-bold mt-2">Ready for fast joins</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
	      ) : (
	        <section className="space-y-8">
          {isFhw && (
            <div className="bg-white rounded-[2rem] border border-primary/20 shadow-md p-6 lg:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-800 text-[11px] font-bold rounded-full uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">support_agent</span>
                    ASHA Assisted Handoff
                  </span>
                  <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                    Select Patient Before Doctor
                  </h2>
                </div>
                {selectedBeneficiary && (
                  <div className="rounded-2xl bg-surface-container-low border border-surface-container-high px-4 py-3 text-xs min-w-[220px]">
                    <p className="font-black text-on-surface">{selectedBeneficiary.name}</p>
                    <p className="text-tertiary mt-0.5">
                      {selectedBeneficiary.village_name || 'Village not recorded'} - {selectedBeneficiary.risk_level || 'Routine'} risk
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Patient / Beneficiary</label>
                  <select
                    value={selectedBeneficiaryId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const nextBen = beneficiaries.find(ben => ben.id === nextId);
                      setSelectedBeneficiaryId(nextId);
                      setAshaComplaint(nextBen?.next_due_service || nextBen?.risk_factors?.[0] || '');
                    }}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-2xl text-sm font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  >
                    {beneficiaries.length === 0 ? (
                      <option value="">No catchment patients loaded</option>
                    ) : (
                      beneficiaries.map(ben => (
                        <option key={ben.id} value={ben.id}>
                          {ben.name} - {ben.village_name || 'Village not recorded'} - {ben.risk_level || 'Routine'} risk
                        </option>
                      ))
                    )}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Category</p>
                      <p className="mt-1 text-sm font-bold text-on-surface">{selectedBeneficiary?.category || 'Not selected'}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Patient ID</p>
                      <p className="mt-1 text-sm font-bold text-on-surface">{selectedBeneficiary?.id || 'Select patient'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-tertiary uppercase tracking-wider block mb-1.5">Complaint / ASHA Notes</label>
                    <textarea
                      value={ashaComplaint}
                      onChange={(e) => setAshaComplaint(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl text-sm font-semibold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                      placeholder="Describe why this patient needs doctor support now."
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-tertiary uppercase block mb-1">Urgency</label>
                      <select
                        value={ashaPriority}
                        onChange={(e) => setAshaPriority(e.target.value as typeof ashaPriority)}
                        className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                      >
                        <option value="PRIORITY">Priority</option>
                        <option value="ROUTINE">Routine</option>
                        <option value="EMERGENCY">Emergency</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-tertiary uppercase block mb-1">Sys BP</label>
                      <input value={ashaVitals.systolic} onChange={(e) => setAshaVitals({ ...ashaVitals, systolic: e.target.value })} className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-tertiary uppercase block mb-1">Dia BP</label>
                      <input value={ashaVitals.diastolic} onChange={(e) => setAshaVitals({ ...ashaVitals, diastolic: e.target.value })} className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-tertiary uppercase block mb-1">SpO2</label>
                      <input value={ashaVitals.spo2} onChange={(e) => setAshaVitals({ ...ashaVitals, spo2: e.target.value })} className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-tertiary uppercase block mb-1">Pulse</label>
                      <input value={ashaVitals.heartRate} onChange={(e) => setAshaVitals({ ...ashaVitals, heartRate: e.target.value })} className="w-full px-3 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
	          {/* ── Patient Scheduled & Active Consultations Section ── */}
          <div className="bg-white rounded-[2rem] border border-primary/20 shadow-md p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">event</span>
	                  {isFhw ? 'Assisted Requests' : 'Your Appointments'}
                </span>
                <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
	                  {isFhw ? 'Patient Requests Sent by ASHA' : 'Your Scheduled & Active Consultations'}
                </h2>
              </div>
              {patientAppointments.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-2xl bg-primary/10 text-primary text-sm font-extrabold">
                    {patientAppointments.length} Booked
                  </div>
                  <button
                    onClick={handleClearAllPatientAppointments}
                    className="px-4 py-2 rounded-2xl bg-error-container/20 text-error hover:bg-error-container/40 text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {patientAppointments.length === 0 ? (
              <div className="p-8 bg-surface-container-low rounded-2xl text-center border border-dashed border-outline-variant/30 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-bold text-xl">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <h4 className="font-headline font-bold text-on-surface text-base">No Active Consultations Scheduled</h4>
                <p className="text-xs text-tertiary max-w-md mx-auto">
	                  {isFhw
                      ? 'Select a patient above, then choose a doctor below to send an assisted teleconsult request.'
                      : 'Select any available specialist below to instantly launch or schedule a virtual care session.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientAppointments.map((appt) => {
                  const schedDate = appt.scheduled_time
                    ? new Date(appt.scheduled_time)
                    : null;
                  const dateStr = schedDate
                    ? schedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : 'Scheduled';
                  const timeStr = schedDate
                    ? schedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  const isCallActive = appt.status === 'active';

                  return (
                    <div
                      key={appt.id}
                      className="rounded-[1.5rem] border border-outline-variant/20 bg-surface-container-lowest p-5 flex flex-col justify-between space-y-4 hover:border-primary/30 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-surface-container-high overflow-hidden flex items-center justify-center text-primary font-bold text-xl shrink-0">
                          {appt.doctor_picture ? (
                            <img src={appt.doctor_picture} alt={appt.doctor_name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{appt.doctor_name?.charAt(0) || 'D'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isCallActive ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-secondary-container text-on-secondary-container'
                            }`}>
                              {isCallActive ? '● Active Room' : '📅 Scheduled'}
                            </span>
                          </div>
	                          <h3 className="font-headline font-bold text-lg text-on-surface truncate">{appt.doctor_name}</h3>
	                          <p className="text-xs text-primary font-semibold uppercase tracking-wider">{appt.specialty}</p>
                            {isFhw && appt.patient_name && (
                              <p className="text-xs text-tertiary mt-1 font-bold">Patient: {appt.patient_name}</p>
                            )}
	                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low text-xs text-on-surface">
                        <span className="material-symbols-outlined text-secondary text-base">schedule</span>
                        <span className="font-bold">{dateStr}</span>
                        {timeStr && <span className="text-tertiary">at {timeStr}</span>}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => router.push(`/call/${appt.room_id}`)}
                          className="flex-1 py-3 rounded-xl font-bold text-white primary-gradient hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <span className="material-symbols-outlined text-base">videocam</span>
                          Join Call Room
                        </button>
                        <button
                          onClick={() => cancelAppointment(appt.id)}
                          className="px-4 py-3 rounded-xl font-bold text-error bg-error-container/20 hover:bg-error-container/40 transition-colors text-xs"
                          title="Cancel appointment"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl lg:text-3xl font-extrabold tracking-tight text-on-surface">
	                {isFhw ? 'Choose Doctor for Selected Patient' : 'Available Specialists'}
              </h2>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low text-sm font-bold text-on-surface-variant w-fit">
              <span className="material-symbols-outlined text-base text-secondary">bolt</span>
	              {isFhw ? 'Patient handoff mode' : 'Instant video booking'}
            </div>
          </div>

          {doctors.length === 0 ? (
            <div className="rounded-[2rem] border border-outline-variant/20 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-surface-container-low flex items-center justify-center text-primary mb-4">
                <span className="material-symbols-outlined text-3xl">medical_services</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface">No specialists listed yet</h3>
              <p className="text-tertiary mt-2 max-w-md mx-auto">
                Add doctors to the database and they will appear here as bookable telemedicine providers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {doctors.map((doc, index) => {
                const isBooking = bookingDoctorId === doc.id;

                return (
                  <article
                    key={doc.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-outline-variant/20 bg-white shadow-sm hover:shadow-lg transition-all"
                  >
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/12 via-secondary/10 to-transparent" />

                    <div className="relative p-6">
                      <div className="flex items-start justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-[4.5rem] w-[4.5rem] min-w-[4.5rem] rounded-[1.5rem] bg-surface-container-high overflow-hidden flex items-center justify-center text-outline">
                            {doc.picture ? (
                              <img src={doc.picture} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-headline text-2xl font-extrabold text-primary">
                                {doc.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-headline text-xl font-bold text-on-surface truncate mb-1">
                              {doc.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                Online
                              </span>
                              <p className="text-[11px] font-bold text-primary uppercase tracking-widest truncate">
                                {doc.specialty || 'General Specialist'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-surface-container-low px-3 py-2 text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Doctor</p>
                          <p className="font-headline text-lg font-extrabold text-on-surface">
                            {String(index + 1).padStart(2, '0')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="rounded-2xl bg-surface-container-low p-4">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-tertiary mb-1">Consult Type</p>
                          <p className="text-sm font-bold text-on-surface">Video Visit</p>
                        </div>
                        <div className="rounded-2xl bg-surface-container-low p-4">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-tertiary mb-1">Wait Time</p>
                          <p className="text-sm font-bold text-on-surface">Approx. 15 min</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => bookAppointment(doc.id)}
                          disabled={isBooking}
                          className="flex-1 py-3.5 rounded-2xl font-bold text-white primary-gradient hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined">
                            {isBooking ? 'hourglass_top' : 'video_call'}
                          </span>
	                          {isBooking ? 'Sending...' : isFhw ? 'Connect Patient' : 'Instant Call'}
                        </button>

                        <button
                          onClick={() => toggleSchedulePanel(doc.id)}
                          className={`py-3.5 px-5 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                            schedulingDoctorId === doc.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined">
                            {schedulingDoctorId === doc.id ? 'close' : 'calendar_month'}
                          </span>
                          {schedulingDoctorId === doc.id ? 'Close' : 'Schedule'}
                        </button>
                      </div>

                      {/* ── Inline Scheduling Panel ── */}
                      {schedulingDoctorId === doc.id && (
                        <div className="mt-4 rounded-[1.75rem] border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-5 animate-in fade-in slide-in-from-top-2">
                          {schedSuccess && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary-container/40 border border-secondary/20">
                              <span className="material-symbols-outlined text-secondary">check_circle</span>
                              <p className="text-sm font-bold text-on-surface">{schedSuccess}</p>
                            </div>
                          )}

                          {/* Date Picker */}
                          <div>
                            <label className="text-[11px] uppercase tracking-widest font-bold text-tertiary mb-2 block">Select Date</label>
                            <input
                              type="date"
                              min={getMinDateStr()}
                              max={getMaxDateStr()}
                              value={schedDate}
                              onChange={(e) => setSchedDate(e.target.value)}
                              className="w-full rounded-xl border border-outline-variant/30 bg-white px-4 py-3 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                          </div>

                          {/* Time Slot Grid */}
                          <div>
                            <label className="text-[11px] uppercase tracking-widest font-bold text-tertiary mb-3 block">Select Time Slot</label>
                            <div className="grid grid-cols-4 gap-2">
                              {TIME_SLOTS.map((slot) => (
                                <button
                                  key={slot}
                                  onClick={() => setSchedTime(slot)}
                                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                                    schedTime === slot
                                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                      : 'bg-white border-outline-variant/20 text-on-surface hover:border-primary/30 hover:text-primary'
                                  }`}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Optional Reason */}
                          <div>
                            <label className="text-[11px] uppercase tracking-widest font-bold text-tertiary mb-2 block">Reason (Optional)</label>
                            <textarea
                              value={schedNotes}
                              onChange={(e) => setSchedNotes(e.target.value)}
                              placeholder="e.g. Follow-up on lab results"
                              rows={2}
                              className="w-full rounded-xl border border-outline-variant/30 bg-white px-4 py-3 text-sm text-on-surface placeholder:text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                            />
                          </div>

                          {/* Confirm */}
                          <button
                            onClick={() => scheduleAppointment(doc.id)}
                            disabled={!schedDate || !schedTime || schedBooking}
                            className="w-full py-3.5 rounded-2xl font-bold text-white bg-secondary hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined">
                              {schedBooking ? 'hourglass_top' : 'event_available'}
                            </span>
	                            {schedBooking ? 'Scheduling...' : isFhw ? 'Schedule Patient Handoff' : 'Confirm Scheduled Appointment'}
                          </button>

                          <p className="text-[11px] text-tertiary text-center leading-relaxed">
	                            {isFhw
                                ? 'The selected patient details will be sent to the doctor schedule in real time.'
                                : "Your appointment will be sent to the doctor's schedule and confirmed in real time."}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
