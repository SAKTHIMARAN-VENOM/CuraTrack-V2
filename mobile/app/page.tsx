'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { 
  Footprints, 
  Heart, 
  Moon, 
  CalendarPlus,
  CalendarCheck,
  ChevronRight,
  ArrowUpRight,
  Video,
  Pill,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  ShieldCheck
} from 'lucide-react';

export default function HomeDashboardPage() {
  const { user, appointments, medications, toggleMedication, medicationAdherence } = useApp();
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);

  const nextAppointment = appointments.find((a) => a.status === 'upcoming') || {
    doctorName: 'Dr. James Alexander',
    specialty: 'General Specialist • Video Consultation',
    time: 'Today at 02:30 PM (In 15 mins)',
  };

  // Timer for active call
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col pb-28 bg-[#f8fafc] dark:bg-[#091422]">
      <TopAppBar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* User Greeting Section */}
        <div className="flex items-start justify-between gap-2 pt-1 pb-0.5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Hello, {user.name ? user.name.split(' ')[0] : 'Sara'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Here is your daily health & care overview
            </p>
          </div>

          <span className="bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold tracking-wider px-3 py-1.5 rounded-full uppercase shrink-0">
            LIVE SYNCED
          </span>
        </div>

        {/* 1. Compact Vitals Row (Steps, Heart Rate, Sleep Time) with Arrow to /vitals */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Real-Time Vitals
            </span>
            <Link
              href="/vitals"
              className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Steps Card */}
            <Link
              href="/vitals"
              className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 flex items-center justify-center">
                  <Footprints className="w-4 h-4" />
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-amber-500 group-hover:text-white transition-colors flex items-center justify-center text-slate-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                  Steps
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-tight block">
                  0
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Goal 10k</span>
              </div>
            </Link>

            {/* Heart Rate Card */}
            <Link
              href="/vitals"
              className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 dark:bg-red-950/40 flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-red-500 group-hover:text-white transition-colors flex items-center justify-center text-slate-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                  Heart
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    72
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">BPM</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Normal</span>
              </div>
            </Link>

            {/* Sleep Time Card */}
            <Link
              href="/vitals"
              className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 flex items-center justify-center">
                  <Moon className="w-4 h-4 fill-indigo-600 text-indigo-600" />
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-500 group-hover:text-white transition-colors flex items-center justify-center text-slate-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                  Sleep
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-tight block">
                  7h 30m
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold">Optimal</span>
              </div>
            </Link>
          </div>
        </section>

        {/* 2. Upcoming Medications (Immediately after Vitals) */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100/80 dark:border-slate-800 shadow-sm space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="p-1.5 bg-[#E6F2F2] text-[#006666] dark:bg-[#006666]/30 dark:text-[#E6F2F2] rounded-xl">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Upcoming Medications</h3>
                <span className="text-[10px] text-slate-400 font-medium">Daily prescription regimen</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-[#E6F2F2] text-[#006666] dark:bg-[#006666]/40 dark:text-[#E6F2F2] px-2.5 py-0.5 rounded-full">
                {medicationAdherence}% Adherence
              </span>
              <Link
                href="/medications"
                className="text-xs font-bold text-[#008080] hover:text-[#006666] dark:text-teal-300 hover:underline"
              >
                All
              </Link>
            </div>
          </div>

          {/* Medications List */}
          <div className="space-y-2 pt-1">
            {medications.slice(0, 3).map((med) => (
              <div
                key={med.id}
                onClick={() => toggleMedication(med.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  med.taken
                    ? 'bg-[#E6F2F2] dark:bg-[#006666]/20 border-[#008080]/30 dark:border-[#008080]/40'
                    : 'bg-[#E6F2F2]/50 hover:bg-[#E6F2F2]/80 dark:bg-slate-800/60 border-[#008080]/15 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      med.taken
                        ? 'bg-[#008080] text-white'
                        : 'border-2 border-[#008080]/40 dark:border-[#008080]/60 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${
                        med.taken ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {med.name}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {med.dosage}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {med.timing} • {med.instructions}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                  med.taken
                    ? 'bg-[#008080] text-white'
                    : 'bg-[#E6F2F2] text-[#006666] border border-[#008080]/20 dark:bg-slate-700 dark:text-slate-200'
                }`}>
                  {med.taken ? 'Taken' : 'Due'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Unified Compartment: Doctor Visit & Telehealth */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100/80 dark:border-slate-800 shadow-sm space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#006666] dark:text-[#E6F2F2]">
              <CalendarCheck className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wide uppercase">
                Doctor Visit & Telehealth
              </span>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-bold text-[#008080] hover:text-[#006666] dark:text-teal-300 hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Doctor Details Box */}
          <div className="p-3.5 bg-[#E6F2F2] dark:bg-slate-800/80 rounded-2xl border border-[#008080]/20 dark:border-slate-700/60 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#006666] text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm">
              D
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {nextAppointment.doctorName || 'Dr. James Alexander'}
                </h4>
                <span className="bg-[#008080]/15 text-[#006666] dark:bg-[#008080]/30 dark:text-[#E6F2F2] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {nextAppointment.specialty || 'General Specialist • Video Consultation'}
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#006666] dark:text-teal-300 mt-1">
                <Clock className="w-3 h-3" />
                <span>{nextAppointment.time || 'Today at 02:30 PM (In 15 mins)'}</span>
              </div>
            </div>
          </div>

          {/* Compartment Actions: Instant Call & Book Visit */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Instant Video Call Button */}
            <button
              type="button"
              onClick={() => setIsCallActive(true)}
              className="bg-[#008080] hover:bg-[#006666] text-white font-bold text-xs py-3 px-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group"
            >
              <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                <Video className="w-3.5 h-3.5" />
              </div>
              <span>Instant Call</span>
            </button>

            {/* Book Visit Button */}
            <Link
              href="/appointments/book"
              className="bg-[#006666] hover:bg-[#005252] text-white font-bold text-xs py-3 px-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group text-center"
            >
              <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                <CalendarPlus className="w-3.5 h-3.5" />
              </div>
              <span>Book Visit</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 5. Live Instant Telehealth Video Call Modal */}
      {isCallActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 text-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
            {/* Video Preview Header */}
            <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80"
                alt="Doctor on Call"
                className="w-full h-full object-cover"
              />

              {/* Call Status Badge */}
              <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Live Call • {formatCallTime(callDuration)}</span>
              </div>

              {/* Self View Floating Box */}
              <div className="absolute bottom-3 right-3 w-20 h-28 rounded-xl bg-slate-800 border-2 border-white/20 overflow-hidden shadow-lg">
                {!isVideoOff ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900">
                    <VideoOff className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Info */}
            <div className="p-4 text-center border-b border-slate-800">
              <h3 className="font-bold text-base text-white">{nextAppointment.doctorName}</h3>
              <p className="text-xs text-teal-300 mt-0.5">{nextAppointment.specialty}</p>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Encrypted HD Medical Stream</span>
              </div>
            </div>

            {/* Call Controls */}
            <div className="p-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCallActive(false)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                title="End Consultation"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
