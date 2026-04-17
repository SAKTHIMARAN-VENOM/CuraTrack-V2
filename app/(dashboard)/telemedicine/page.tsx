'use client';

import { useEffect, useState } from 'react';
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
  const supabase = createClient();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeAppointments, setActiveAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profile);

      // Fetch doctors
      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('*');
      setDoctors(doctorsData || []);

      // Fetch active appointments (if doctor)
      if (profile?.role === 'doctor') {
        const { data: appts } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', user.id)
          .eq('status', 'active');
        setActiveAppointments(appts || []);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  // Realtime subscription for doctors to see incoming calls
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
          setActiveAppointments((prev) => [...prev, payload.new as Appointment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, user]);

  const bookAppointment = async (doctorId: string) => {
    const roomId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: user.id,
        doctor_id: doctorId,
        scheduled_time: new Date().toISOString(),
        room_id: roomId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      alert('Error booking appointment: ' + error.message);
      return;
    }

    router.push(`/call/${roomId}`);
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Telemedicine Center</h1>

      {profile?.role === 'doctor' ? (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-secondary">Incoming Call Requests</h2>
          {activeAppointments.length === 0 ? (
            <div className="bg-surface-container-low p-8 rounded-2xl text-center text-outline">
              No active call requests at the moment.
            </div>
          ) : (
            <div className="grid gap-4">
              {activeAppointments.map((appt) => (
                <div key={appt.id} className="bg-white border p-6 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold">Patient Request</p>
                    <p className="text-sm text-tertiary">ID: {appt.id.slice(0, 8)}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/call/${appt.room_id}`)}
                    className="primary-gradient text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    Join Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">Available Specialists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high overflow-hidden">
                    {doc.picture ? (
                      <img src={doc.picture} alt={doc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-outline">
                        {doc.name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{doc.name}</h3>
                    <p className="text-sm text-primary uppercase font-bold tracking-widest leading-none">Specialist</p>
                  </div>
                </div>
                <button
                  onClick={() => bookAppointment(doc.id)}
                  className="w-full bg-surface-container-highest text-on-surface py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all group"
                >
                  Book Instant Call
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">video_call</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
