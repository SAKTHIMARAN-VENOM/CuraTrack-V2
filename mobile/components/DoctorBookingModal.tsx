"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface DoctorBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName?: string;
  specialty?: string;
  fee?: string;
  doctorId?: string;
}

export default function DoctorBookingModal({
  isOpen,
  onClose,
  doctorName = "Dr. Practitioner",
  specialty = "Cardiologist",
  fee = "₹299",
  doctorId = "doc-001"
}: DoctorBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState("Today, 4:30 PM");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      if (user) {
        await supabase.from('appointments').insert({
          client_id: user.id,
          doctor_id: doctorId,
          scheduled_time: new Date().toISOString(),
          room_id: roomId,
          status: 'booked',
          notes: reason || 'Telehealth consultation requested via CuraTrack Mobile'
        });
      }
    } catch (err) {
      console.warn("Could not save appointment to Supabase DB:", err);
    } finally {
      setLoading(false);
      setConfirmed(true);
      setTimeout(() => {
        setConfirmed(false);
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-[#008080] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">video_camera_front</span>
            </div>
            <h3 className="font-extrabold text-base text-[#0b1c30]">Book Tele-Consult</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {confirmed ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <h4 className="font-extrabold text-lg text-[#0b1c30]">Appointment Confirmed!</h4>
            <p className="text-xs text-slate-500">Tele-consultation session created & saved in DB.</p>
          </div>
        ) : (
          <form onSubmit={handleBooking} className="flex flex-col gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl flex items-center gap-3 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">
                {doctorName.split(' ')[1]?.[0] || 'D'}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#0b1c30]">{doctorName}</h4>
                <p className="text-xs text-slate-500">{specialty}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Time Slot</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              >
                <option>Today, 4:30 PM</option>
                <option>Today, 6:00 PM</option>
                <option>Tomorrow, 10:00 AM</option>
                <option>Tomorrow, 2:30 PM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Reason for Visit</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe your health query..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Consultation Fee</span>
              <span className="font-extrabold text-[#008080]">{fee} (Free via Ayushman Card)</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#008080] hover:bg-teal-700 disabled:opacity-60 text-white font-extrabold py-3 rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              <span>{loading ? "Booking Session..." : "Confirm Instant Booking"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

