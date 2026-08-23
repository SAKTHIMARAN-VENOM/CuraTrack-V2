'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarDays,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';

export default function AppointmentsPage() {
  const { appointments, cancelAppointment } = useApp();
  const [filterTab, setFilterTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('upcoming');
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const currentMonthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate real 7-day strip from today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    const num = d.getDate();
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hasApt = appointments.some(a => a.date && a.date.includes(formattedDate));
    return { day: dayStr, num, hasApt, fullDate: formattedDate };
  });

  const filteredAppointments = appointments.filter((apt) => {
    if (filterTab === 'all') return true;
    return apt.status === filterTab;
  });

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Appointments" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Header Title & Book Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">Appointments</h1>
            <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
              Manage your clinical schedule and consultations
            </p>
          </div>

          <Link
            href="/appointments/book"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Book New</span>
          </Link>
        </div>

        {/* Horizontal Interactive Calendar strip */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-card border border-surface-container-high dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-on-surface">{currentMonthYear}</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-2 sm:gap-3 py-1">
            {days.map((d, index) => {
              const isSelected = selectedDay === d.num;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDay(d.num)}
                  className={`flex-shrink-0 w-14 sm:w-16 py-3 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-md scale-105 ring-2 ring-primary/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{d.day}</span>
                  <span className="text-base sm:text-lg font-extrabold mt-0.5">{d.num}</span>
                  {d.hasApt && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-primary'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          {(['upcoming', 'past', 'cancelled', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterTab === tab
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Appointment Cards List */}
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-on-surface">No {filterTab} appointments</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                You can easily book a new consultation with our certified doctors.
              </p>
              <Link
                href="/appointments/book"
                className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-xl mt-4 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </Link>
            </div>
          ) : (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-card border border-surface-container-high dark:border-slate-800 flex flex-col sm:flex-row gap-4 sm:items-center justify-between transition-all hover:border-primary/40 relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  apt.status === 'upcoming' ? 'bg-primary' : apt.status === 'past' ? 'bg-slate-400' : 'bg-error'
                }`} />

                {/* Left: Date badge + Doctor Info */}
                <div className="flex items-start sm:items-center gap-3.5 pl-2">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 ring-2 ring-primary/20">
                    <img
                      src={apt.avatarUrl}
                      alt={apt.doctorName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-on-surface">{apt.doctorName}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        apt.type === 'Video Consultation'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-primary/10 text-primary dark:text-primary-fixed'
                      }`}>
                        {apt.type}
                      </span>
                    </div>
                    <p className="text-xs text-primary font-medium mt-0.5">{apt.specialty}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-on-surface-variant">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.date} • {apt.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[180px]">{apt.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 pl-2 sm:pl-0 sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-4">
                  {apt.status === 'upcoming' && (
                    <>
                      {apt.type === 'Video Consultation' ? (
                        <button
                          onClick={() => alert(`Starting video call with ${apt.doctorName}`)}
                          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-transform active:scale-95"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Call</span>
                        </button>
                      ) : (
                        <Link
                          href={`/records?doctor=${encodeURIComponent(apt.doctorName)}`}
                          className="flex items-center gap-1.5 bg-surface-container-high dark:bg-slate-800 text-on-surface px-3 py-2 rounded-xl text-xs font-semibold hover:bg-surface-container-highest"
                        >
                          <span>Details</span>
                        </Link>
                      )}

                      <button
                        onClick={() => cancelAppointment(apt.id)}
                        className="p-2 text-slate-400 hover:text-error hover:bg-error-container/30 rounded-xl transition-colors text-xs"
                        title="Cancel appointment"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {apt.status === 'past' && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </span>
                  )}

                  {apt.status === 'cancelled' && (
                    <span className="text-xs font-semibold text-error flex items-center gap-1 bg-error-container/40 px-2.5 py-1 rounded-lg">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelled</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
