'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Stethoscope, 
  Brain, 
  Baby, 
  Bone, 
  Activity, 
  Star, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Building2, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  specialtyCategory: string;
  rating: number;
  reviews: number;
  avatarUrl: string;
  experience: string;
  location: string;
}

const specialties = [
  { id: 'cardiology', name: 'Cardiology', icon: Stethoscope },
  { id: 'general', name: 'General Medicine', icon: Activity },
  { id: 'neurology', name: 'Neurology', icon: Brain },
  { id: 'pediatrics', name: 'Pediatrics', icon: Baby },
  { id: 'orthopedics', name: 'Orthopedics', icon: Bone },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'
];

export default function BookAppointmentPage() {
  const router = useRouter();
  const { addAppointment } = useApp();

  const [doctorsList, setDoctorsList] = useState<DoctorInfo[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('general');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [consultType, setConsultType] = useState<'In-person' | 'Video Consultation'>('Video Consultation');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [notes, setNotes] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Fetch registered doctors from database
  useEffect(() => {
    async function loadDoctors() {
      setIsLoadingDoctors(true);
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .eq('role', 'doctor');

        const { data: docProfiles } = await supabase
          .from('doctor_profile')
          .select('*');

        if (profiles && profiles.length > 0) {
          const mapped: DoctorInfo[] = profiles.map((p) => {
            const meta = docProfiles?.find(dp => dp.doctor_id === p.id);
            return {
              id: p.id,
              name: p.name || 'Dr. Medical Officer',
              specialty: meta?.specialization || 'General Medicine Specialist',
              specialtyCategory: (meta?.specialization?.toLowerCase().includes('cardio') ? 'cardiology' : 'general'),
              rating: 4.9,
              reviews: 48,
              avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
              experience: meta?.experience_years ? `${meta.experience_years} yrs exp.` : 'Senior Physician',
              location: meta?.hospital_name || 'Primary Health Centre',
            };
          });
          setDoctorsList(mapped);
          setSelectedDoctorId(mapped[0]?.id || '');
        } else {
          // Default medical officer if database has no custom doctors yet
          const fallback: DoctorInfo[] = [
            {
              id: 'doc-primary',
              name: 'Dr. David Ross (Medical Officer)',
              specialty: 'Clinical Medical Officer',
              specialtyCategory: 'general',
              rating: 4.9,
              reviews: 120,
              avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
              experience: '12 yrs clinical exp.',
              location: 'Sub-District Hospital नंदुरबार',
            },
            {
              id: 'doc-cardio',
              name: 'Dr. Priya Deshmukh',
              specialty: 'Cardiology Specialist',
              specialtyCategory: 'cardiology',
              rating: 4.8,
              reviews: 84,
              avatarUrl: 'https://images.unsplash.com/photo-1594824813594-55be6179427b?w=150&auto=format&fit=crop&q=80',
              experience: '9 yrs exp.',
              location: 'District Hospital Telemedicine Unit',
            }
          ];
          setDoctorsList(fallback);
          setSelectedDoctorId(fallback[0].id);
        }
      } catch (err) {
        console.warn('Error loading doctors from DB:', err);
      } finally {
        setIsLoadingDoctors(false);
      }
    }
    loadDoctors();
  }, []);

  const currentDoctor = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0] || {
    id: 'doc-default',
    name: 'Dr. Medical Officer',
    specialty: 'General Practitioner',
    specialtyCategory: 'general',
    rating: 4.9,
    reviews: 50,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    experience: 'Clinical Physician',
    location: 'District Telehealth Center',
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAppointment({
      doctorName: currentDoctor.name,
      specialty: currentDoctor.specialty,
      date: selectedDate,
      time: selectedTime,
      location: consultType === 'Video Consultation' ? 'Online Telehealth Portal' : currentDoctor.location,
      status: 'upcoming',
      avatarUrl: currentDoctor.avatarUrl,
      type: consultType,
      notes: notes || 'Consultation scheduled via CuraTrack Mobile.',
    });

    setIsSuccessModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Book Appointment" showBack={true} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        <form onSubmit={handleBooking} className="flex flex-col gap-6">
          {/* 1. Consultation Type Picker */}
          <section className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Consultation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConsultType('In-person')}
                className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  consultType === 'In-person'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${consultType === 'In-person' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-on-surface">In-Person Visit</h4>
                  <p className="text-[11px] text-on-surface-variant">At Primary Facility</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConsultType('Video Consultation')}
                className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  consultType === 'Video Consultation'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${consultType === 'Video Consultation' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-on-surface">Video Call (WebRTC)</h4>
                  <p className="text-[11px] text-on-surface-variant">Instant Live Video</p>
                </div>
              </button>
            </div>
          </section>

          {/* 2. Specialty Selector */}
          <section className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Select Clinical Department
            </label>
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar py-1">
              {specialties.map((spec) => {
                const Icon = spec.icon;
                const isSelected = selectedSpecialty === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setSelectedSpecialty(spec.id)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{spec.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Doctors List from Database */}
          <section className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>3. Available Verified Doctors</span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>NMC Verified</span>
              </span>
            </label>

            {isLoadingDoctors ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100">
                <p className="text-xs text-slate-400">Loading verified doctors roster...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doctorsList.map((doc) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-4 rounded-3xl border text-left flex items-start gap-3.5 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-slate-100 shrink-0">
                        <img
                          src={doc.avatarUrl}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-on-surface truncate">{doc.name}</h4>
                          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {doc.rating}
                          </span>
                        </div>
                        <p className="text-xs text-primary font-medium">{doc.specialty}</p>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">{doc.location} • {doc.experience}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Date & Time Selection */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-surface-container-high dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              4. Consultation Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Select Date</span>
                </label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      setSelectedDate(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs sm:text-sm text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Select Time Slot</span>
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs sm:text-sm text-on-surface outline-none cursor-pointer"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Clinical Reason / Chief Symptoms
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your symptoms or reason for visit..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs sm:text-sm text-on-surface outline-none"
              />
            </div>
          </section>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-2xl shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
          >
            <span>Confirm & Book Consultation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </main>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-bold text-on-surface">Appointment Booked!</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your appointment with <strong>{currentDoctor.name}</strong> has been saved directly to your clinical records for <strong>{selectedDate} at {selectedTime}</strong>.
            </p>

            <button
              onClick={() => {
                setIsSuccessModalOpen(false);
                router.push('/appointments');
              }}
              className="w-full py-3 bg-primary text-white font-bold text-xs rounded-xl shadow-md"
            >
              View My Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
