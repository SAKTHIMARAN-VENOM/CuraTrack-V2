'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
}

export default function TelemedicinePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeAppointments, setActiveAppointments] = useState<Appointment[]>([]);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      const { data: fetchedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setProfile(fetchedProfile);

      const { data: doctorsData } = await supabase.from('doctors').select('*');
      setDoctors(doctorsData || []);

      if (fetchedProfile?.role === 'doctor') {
        const { data: appts } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', authUser.id)
          .eq('status', 'active');

        setActiveAppointments(appts || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [router, supabase]);

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

  const isDoctor = profile?.role === 'doctor';
  const availableDoctors = doctors.length;
  const activeRequests = activeAppointments.length;
  const urgentQueue = activeAppointments.slice(0, 3);
  const heroName = isDoctor ? 'Care Command' : 'Virtual Care';

  const bookAppointment = async (doctorId: string) => {
    if (!user) return;

    setBookingDoctorId(doctorId);

    const roomId = crypto.randomUUID();
    const { error } = await supabase.from('appointments').insert({
      client_id: user.id,
      doctor_id: doctorId,
      scheduled_time: new Date().toISOString(),
      room_id: roomId,
      status: 'active',
    });

    if (error) {
      setBookingDoctorId(null);
      alert(`Error booking appointment: ${error.message}`);
      return;
    }

    router.push(`/call/${roomId}`);
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
    <div className="flex-1 p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 lg:p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-12 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-28 -left-12 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="relative grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-8 items-start">
          <div className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-full uppercase tracking-[0.22em]">
                <span className="material-symbols-outlined text-sm">video_chat</span>
                Telemedicine
              </span>
              <h1 className="mt-4 font-headline text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-none">
                {heroName} Center
              </h1>
              <p className="mt-3 max-w-2xl text-base lg:text-lg text-tertiary leading-relaxed">
                {isDoctor
                  ? 'Review incoming consultations, jump into active rooms, and keep response times calm and predictable.'
                  : 'Connect with a specialist in minutes through secure video consultations designed to feel clear, calm, and trustworthy.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-primary/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined fill-icon">hub</span>
                </div>
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em] mb-1">
                  {isDoctor ? 'Open Requests' : 'Available Doctors'}
                </p>
                <p className="font-headline text-3xl font-extrabold text-on-surface">
                  {isDoctor ? activeRequests : availableDoctors}
                </p>
                <p className="text-xs text-tertiary/70 mt-1">
                  {isDoctor ? 'Patients waiting now' : 'Ready for virtual consult'}
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
                    : (item as Doctor).name;
                  const subtitle = isDoctor
                    ? `Room ${(item as Appointment).room_id.slice(0, 8)}`
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
                <p className="text-tertiary mt-1">
                  Join an active room the moment a patient reaches out.
                </p>
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
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl lg:text-3xl font-extrabold tracking-tight text-on-surface">
                Available Specialists
              </h2>
              <p className="text-tertiary mt-1">
                Choose a doctor and move directly into a secure consultation room.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low text-sm font-bold text-on-surface-variant w-fit">
              <span className="material-symbols-outlined text-base text-secondary">bolt</span>
              Instant video booking
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

                      <div className="rounded-[2rem] bg-surface-container-low p-6 mb-8 border border-outline-variant/10">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-secondary">encrypted</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">Secure Session</p>
                            <p className="text-xs text-tertiary leading-relaxed">
                              One tap starts a protected consultation session and opens the call room immediately.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => bookAppointment(doc.id)}
                        disabled={isBooking}
                        className="w-full py-3.5 rounded-2xl font-bold text-white primary-gradient hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">
                          {isBooking ? 'hourglass_top' : 'video_call'}
                        </span>
                        {isBooking ? 'Booking...' : 'Book Instant Call'}
                      </button>
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
