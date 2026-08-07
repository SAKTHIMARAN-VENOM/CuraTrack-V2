"use client";

import React, { useState, useEffect } from 'react';
import MobileFrame from '@/components/MobileFrame';
import DoctorBookingModal from '@/components/DoctorBookingModal';
import { supabase } from '@/lib/supabaseClient';

interface DoctorItem {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: string;
  fee: string;
  available: string;
  img: string;
}

const DEFAULT_DOCTORS: DoctorItem[] = [
  {
    id: "doc-001",
    name: "Dr. Rajesh Sharma",
    specialty: "Cardiologist",
    experience: "14 Yrs Exp",
    rating: "4.9 ⭐",
    fee: "₹399",
    available: "Available Today, 4:30 PM",
    img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-002",
    name: "Dr. Ananya Roy",
    specialty: "General Physician",
    experience: "9 Yrs Exp",
    rating: "4.8 ⭐",
    fee: "₹299",
    available: "Available Today, 6:00 PM",
    img: "https://images.unsplash.com/photo-1594824813566-78a9c3d4957e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-003",
    name: "Dr. Vikram Patel",
    specialty: "Neurologist",
    experience: "18 Yrs Exp",
    rating: "5.0 ⭐",
    fee: "₹599",
    available: "Available Tomorrow, 10:00 AM",
    img: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-004",
    name: "Dr. Sunita Rao",
    specialty: "Pediatrician",
    experience: "11 Yrs Exp",
    rating: "4.9 ⭐",
    fee: "₹349",
    available: "Available Tomorrow, 11:30 AM",
    img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
  },
];

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [bookingDoc, setBookingDoc] = useState<null | { id: string; name: string; specialty: string; fee: string }>(null);
  const [doctorsList, setDoctorsList] = useState<DoctorItem[]>(DEFAULT_DOCTORS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRealDoctors() {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .eq('role', 'doctor');

        if (profiles && profiles.length > 0) {
          const loaded: DoctorItem[] = profiles.map((p, idx) => ({
            id: p.id,
            name: p.name || `Dr. ${p.email?.split('@')[0] || 'Medical Specialist'}`,
            specialty: idx % 2 === 0 ? "General Physician" : "Cardiologist",
            experience: `${10 + idx} Yrs Exp`,
            rating: "4.9 ⭐",
            fee: "₹299",
            available: "Available Today",
            img: idx % 2 === 0
              ? "https://images.unsplash.com/photo-1594824813566-78a9c3d4957e?w=150&auto=format&fit=crop&q=80"
              : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
          }));

          // Merge loaded DB doctors with defaults
          const existingIds = new Set(loaded.map(d => d.id));
          const combined = [...loaded, ...DEFAULT_DOCTORS.filter(d => !existingIds.has(d.id))];
          setDoctorsList(combined);
        }
      } catch (err) {
        console.warn("Could not fetch real doctor profiles from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRealDoctors();
  }, []);

  const filteredDoctors = doctorsList.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) || doc.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty = selectedSpecialty === "All" || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <MobileFrame headerTitle="Tele-Consult">
      {/* Title & Filter */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30]">Available Specialists</h1>
          <p className="text-xs text-[#434654] font-medium">Instant video consultations & Ayushman claimable</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Search doctors or specialties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080] shadow-sm"
          />
        </div>

        {/* Specialty Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
          {["All", "Cardiologist", "General Physician", "Neurologist", "Pediatrician"].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSpecialty(s)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                selectedSpecialty === s
                  ? "bg-[#008080] text-white shadow-sm"
                  : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors List */}
      <div className="flex flex-col gap-3">
        {filteredDoctors.map((doc, idx) => (
          <div key={doc.id || idx} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <img
                src={doc.img}
                alt={doc.name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#0b1c30]">{doc.name}</h3>
                  <span className="text-xs font-extrabold text-amber-500">{doc.rating}</span>
                </div>
                <p className="text-xs font-bold text-[#008080]">{doc.specialty}</p>
                <p className="text-[11px] text-slate-400 font-medium">{doc.experience}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">Slot Status</span>
                <span className="font-extrabold text-emerald-600">{doc.available}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#0b1c30]">{doc.fee}</span>
                <button
                  onClick={() => setBookingDoc({ id: doc.id, name: doc.name, specialty: doc.specialty, fee: doc.fee })}
                  className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl transition-colors shadow flex items-center gap-1 text-xs"
                >
                  <span className="material-symbols-outlined text-base">video_call</span>
                  <span>Book</span>
                </button>
              </div>
            </div>
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
          fee={bookingDoc.fee}
          doctorId={bookingDoc.id}
        />
      )}
    </MobileFrame>
  );
}

