'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
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

const specialties = [
  { id: 'cardiology', name: 'Cardiology', icon: Stethoscope },
  { id: 'neurology', name: 'Neurology', icon: Brain },
  { id: 'pediatrics', name: 'Pediatrics', icon: Baby },
  { id: 'orthopedics', name: 'Orthopedics', icon: Bone },
];

const doctors = [
  {
    id: 'doc-1',
    name: 'Dr. Robert Chen',
    specialty: 'Senior Cardiologist',
    specialtyCategory: 'cardiology',
    rating: 4.9,
    reviews: 120,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    experience: '14 years exp.',
    location: 'Metropolitan Heart Center',
  },
  {
    id: 'doc-2',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Interventional Cardiologist',
    specialtyCategory: 'cardiology',
    rating: 4.8,
    reviews: 85,
    avatarUrl: 'https://images.unsplash.com/photo-1594824813594-55be6179427b?w=150&auto=format&fit=crop&q=80',
    experience: '9 years exp.',
    location: 'Downtown Cardiology Annex',
  },
  {
    id: 'doc-3',
    name: 'Dr. Marcus Vance',
    specialty: 'Lead Neurologist',
    specialtyCategory: 'neurology',
    rating: 4.9,
    reviews: 142,
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    experience: '18 years exp.',
    location: 'Brain & Spine Institute',
  },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'
];

export default function BookAppointmentPage() {
  const router = useRouter();
  const { addAppointment } = useApp();

  const [selectedSpecialty, setSelectedSpecialty] = useState('cardiology');
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0].id);
  const [consultType, setConsultType] = useState<'In-person' | 'Video Consultation'>('In-person');
  const [selectedDate, setSelectedDate] = useState('Aug 24, 2026');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [notes, setNotes] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    addAppointment({
      doctorName: currentDoctor.name,
      specialty: currentDoctor.specialty,
      date: selectedDate,
      time: selectedTime,
      location: consultType === 'Video Consultation' ? 'Online Telehealth Portal' : currentDoctor.location,
      status: 'upcoming',
      avatarUrl: currentDoctor.avatarUrl,
      type: consultType,
      notes: notes || 'Standard consultation requested.',
    });

    setIsSuccessModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Book Appointment" showBack={true} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-2">
          Schedule Consultation
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mb-6">
          Connect with leading specialists in clinical diagnostics & preventative medicine.
        </p>

        <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Selections */}
          <div className="md:col-span-8 space-y-6">
            {/* Specialty Selection */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800">
              <h2 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                <span>Select Medical Specialty</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {specialties.map((spec) => {
                  const Icon = spec.icon;
                  const isSelected = selectedSpecialty === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setSelectedSpecialty(spec.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary dark:text-primary-fixed ring-2 ring-primary/20 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800/40 text-on-surface-variant hover:border-primary/50'
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-1.5" />
                      <span className="text-xs">{spec.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Doctor Picker */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800">
              <h2 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span>Choose Specialist Doctor</span>
              </h2>
              <div className="space-y-3">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                          : 'border-slate-200 dark:border-slate-800 bg-surface dark:bg-slate-800/30 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary/30 shrink-0">
                          <img src={doc.avatarUrl} alt={doc.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-on-surface">{doc.name}</h3>
                          <p className="text-xs text-primary font-medium">{doc.specialty}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {doc.rating} ({doc.reviews})
                            </span>
                            <span>•</span>
                            <span>{doc.experience}</span>
                          </div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Visit Type & Date/Time */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Visit Type & Timing</span>
              </h2>

              {/* In Person vs Video */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConsultType('In-person')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    consultType === 'In-person'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface dark:bg-slate-800 text-on-surface-variant border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>In-Person Visit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConsultType('Video Consultation')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    consultType === 'Video Consultation'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface dark:bg-slate-800 text-on-surface-variant border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Video Call</span>
                </button>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Select Available Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedTime === slot
                          ? 'bg-secondary-container text-on-secondary-container ring-2 ring-primary'
                          : 'bg-surface dark:bg-slate-800/80 text-on-surface border border-slate-200 dark:border-slate-700 hover:border-primary/40'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Summary & Confirmation */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 sticky top-20">
              <h3 className="text-sm font-bold text-on-surface mb-3">Booking Summary</h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface dark:bg-slate-800/60 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Doctor</span>
                  <p className="font-bold text-on-surface">{currentDoctor.name}</p>
                  <p className="text-primary">{currentDoctor.specialty}</p>
                </div>

                <div className="p-3 bg-surface dark:bg-slate-800/60 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Schedule</span>
                  <p className="font-bold text-on-surface">{selectedDate}</p>
                  <p className="text-slate-500">{selectedTime} • {consultType}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                    Symptoms or Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe symptoms, recent pain, or specific concerns..."
                    className="w-full bg-surface dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Confirm & Book</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Success Modal */}
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-3xl p-6 shadow-2xl text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-extrabold text-on-surface">Appointment Confirmed!</h3>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                Your consultation with <span className="font-bold text-on-surface">{currentDoctor.name}</span> is scheduled for{' '}
                <span className="font-bold text-primary">{selectedDate}</span> at <span className="font-bold text-primary">{selectedTime}</span>.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => router.push('/appointments')}
                  className="w-full py-3 bg-primary text-white font-bold text-xs rounded-xl shadow-sm hover:bg-primary/90 transition-colors"
                >
                  View in Appointments
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
