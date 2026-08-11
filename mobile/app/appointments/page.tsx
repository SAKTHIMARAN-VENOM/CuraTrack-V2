"use client";

import React, { useState, useEffect } from 'react';
import MobileFrame from '@/components/MobileFrame';
import DoctorBookingModal from '@/components/DoctorBookingModal';
import { supabase } from '@/lib/supabaseClient';

interface DoctorItem {
  id: string;
  name: string;
  specialty: string;
  waitTime: string;
  consultType: string;
  number: string;
  avatarBg: string;
  avatarText: string;
  initial: string;
}

const DEFAULT_DOCTORS: DoctorItem[] = [
  {
    id: "doc-1",
    name: "Dr. James Alexander",
    specialty: "GENERAL SPECIALIST",
    waitTime: "Approx. 15 min",
    consultType: "Video Visit",
    number: "01",
    avatarBg: "bg-[#dae2ff]",
    avatarText: "text-[#003d9b]",
    initial: "D",
  },
  {
    id: "doc-2",
    name: "Dr. Emily Chen",
    specialty: "GENERAL SPECIALIST",
    waitTime: "Approx. 15 min",
    consultType: "Video Visit",
    number: "02",
    avatarBg: "bg-[#e1e0ff]",
    avatarText: "text-[#2b29bb]",
    initial: "D",
  },
  {
    id: "doc-3",
    name: "Dr. David Ross",
    specialty: "CARDIOLOGIST",
    waitTime: "Approx. 10 min",
    consultType: "Video Visit",
    number: "03",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-900",
    initial: "D",
  },
  {
    id: "doc-4",
    name: "Dr. Sarah Jenkins",
    specialty: "NEUROLOGIST",
    waitTime: "Approx. 20 min",
    consultType: "Video Visit",
    number: "04",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-900",
    initial: "D",
  },
];

export default function AppointmentsPage() {
  const [doctorsList, setDoctorsList] = useState<DoctorItem[]>(DEFAULT_DOCTORS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bookingDoc, setBookingDoc] = useState<null | { id: string; name: string; specialty: string }>(null);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .eq('role', 'doctor');

        if (profs && profs.length > 0) {
          const fetchedDocs: DoctorItem[] = profs.map((p: any, idx: number) => ({
            id: p.id,
            name: p.name || `Dr. ${p.email?.split('@')[0] || 'Specialist'}`,
            specialty: idx % 2 === 0 ? "GENERAL SPECIALIST" : "CARDIOLOGIST",
            waitTime: "Approx. 15 min",
            consultType: "Video Visit",
            number: String(idx + 1).padStart(2, '0'),
            avatarBg: idx % 2 === 0 ? "bg-[#dae2ff]" : "bg-[#e1e0ff]",
            avatarText: idx % 2 === 0 ? "text-[#003d9b]" : "text-[#2b29bb]",
            initial: "D",
          }));

          // Merge with default doctors to guarantee full directory
          const merged = [...fetchedDocs];
          DEFAULT_DOCTORS.forEach(d => {
            if (!merged.some(m => m.name.toLowerCase() === d.name.toLowerCase())) {
              merged.push(d);
            }
          });
          setDoctorsList(merged);
        }
      } catch (err) {
        console.warn("Doctor fetch error:", err);
      }
    }
    loadDoctors();
  }, []);

  const handleBookCall = (doc: DoctorItem) => {
    setBookingDoc({ id: doc.id, name: doc.name, specialty: doc.specialty });
    setToastMessage(`✓ Instant call booked with ${doc.name}! Room ready.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <MobileFrame headerTitle="Appointments">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="bg-[#008080] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between z-50 animate-bounce">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header Title Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Available Specialists</h1>
            <p className="text-xs text-[#434654] font-medium mt-0.5">
              Choose a doctor and move directly into a secure consultation room.
            </p>
          </div>
          <span className="bg-[#e0f2fe] text-[#0284c7] font-bold text-[10px] px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm shrink-0">
            <span className="text-amber-500 font-bold">⚡</span>
            <span>Instant booking</span>
          </span>
        </div>
      </div>

      {/* Specialist Cards List */}
      <div className="flex flex-col gap-4">
        {doctorsList.map((doc, idx) => (
          <div key={doc.id || idx} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
            {/* Top Doctor Row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${doc.avatarBg} ${doc.avatarText} font-extrabold text-lg flex items-center justify-center shadow-sm`}>
                  {doc.initial}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-extrabold text-base text-[#0b1c30]">{doc.name}</h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ONLINE
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#008080] tracking-wider uppercase">
                    {doc.specialty}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">DOCTOR</span>
                <span className="text-base font-extrabold text-slate-700 leading-tight">{doc.number || String(idx + 1).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Consult Type & Wait Time Grid */}
            <div className="bg-[#f0f4f8] p-3.5 rounded-2xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">CONSULT TYPE</span>
                <span className="font-extrabold text-[#0b1c30] text-xs">{doc.consultType}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">WAIT TIME</span>
                <span className="font-extrabold text-[#0b1c30] text-xs">{doc.waitTime}</span>
              </div>
            </div>

            {/* Secure Session Info */}
            <div className="bg-[#f0f4f8] p-3.5 rounded-2xl flex items-start gap-3 border border-slate-200/50">
              <div className="w-8 h-8 rounded-full bg-white text-[#008080] flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-base">shield</span>
              </div>
              <div className="text-left">
                <h4 className="font-bold text-xs text-[#0b1c30] mb-0.5">Secure Session</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">
                  One tap starts a protected consultation session and opens the call room immediately.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleBookCall(doc)}
              className="w-full py-3.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow-md hover:bg-[#006666] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">add_box</span>
              <span>Book Instant Call</span>
            </button>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {bookingDoc && (
        <DoctorBookingModal
          isOpen={!!bookingDoc}
          onClose={() => setBookingDoc(null)}
          doctorName={bookingDoc.name}
          specialty={bookingDoc.specialty}
          fee="₹299"
          doctorId={bookingDoc.id}
        />
      )}
    </MobileFrame>
  );
}
