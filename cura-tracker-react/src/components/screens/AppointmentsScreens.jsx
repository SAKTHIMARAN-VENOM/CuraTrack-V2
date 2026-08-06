import React, { useState, useEffect } from 'react';

// 7. Appointments Screen Component
export function AppointmentsScreen({ 
  appointments, 
  onNavigate, 
  onCancelAppointment, 
  onRescheduleAppointment 
}) {
  const [tab, setTab] = useState('Upcoming');
  
  // Reschedule Modal state
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 AM');
  const [reason, setReason] = useState('Schedule Conflict');
  const [toastMessage, setToastMessage] = useState('');

  // Lock background scroll when reschedule modal is active
  useEffect(() => {
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      if (rescheduleApt) {
        scrollContainer.scrollTop = 0;
        scrollContainer.style.overflow = 'hidden';
      } else {
        scrollContainer.style.overflow = 'auto';
      }
    }
    return () => {
      if (scrollContainer) scrollContainer.style.overflow = 'auto';
    };
  }, [rescheduleApt]);

  const handleOpenReschedule = (apt) => {
    setRescheduleApt(apt);
    setNewDate(apt.date || '2026-08-28');
    setNewTime(apt.time || '10:00 AM');
    setReason('Schedule Conflict');
  };

  const handleSaveReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleApt || !newDate || !newTime) return;
    
    if (onRescheduleAppointment) {
      onRescheduleAppointment(rescheduleApt.id, newDate, newTime);
    }
    
    setToastMessage(`✓ Appointment rescheduled to ${newDate} at ${newTime}`);
    setTimeout(() => setToastMessage(''), 3500);
    setRescheduleApt(null);
  };

  const filteredAppointments = appointments.filter(a => a.status === tab);

  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#003d9b] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1c30]">Appointments</h2>
          <p className="text-xs text-[#434654]">Manage doctor consultations & telemedicine visits</p>
        </div>
        <button
          onClick={() => onNavigate('book_appointment')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003d9b] text-white font-bold text-xs shadow hover:bg-[#0052cc] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Book Visit</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-[#e5eeff] p-1 rounded-2xl border border-[#c3c6d6]/40">
        <button
          onClick={() => setTab('Upcoming')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'Upcoming' ? 'bg-white text-[#003d9b] shadow-sm' : 'text-[#434654]'
          }`}
        >
          Upcoming ({appointments.filter(a => a.status === 'Upcoming').length})
        </button>
        <button
          onClick={() => setTab('Completed')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'Completed' ? 'bg-white text-[#003d9b] shadow-sm' : 'text-[#434654]'
          }`}
        >
          Completed ({appointments.filter(a => a.status === 'Completed').length})
        </button>
      </div>

      {/* Appointment Cards List */}
      <div className="flex flex-col gap-3">
        {filteredAppointments.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#c3c6d6]/40 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-[#737685]">event_busy</span>
            <p className="text-sm font-bold text-[#0b1c30]">No {tab.toLowerCase()} appointments</p>
            <button
              onClick={() => onNavigate('book_appointment')}
              className="mt-2 px-4 py-2 rounded-xl bg-[#003d9b] text-white text-xs font-bold"
            >
              Book New Appointment
            </button>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div key={apt.id} className="bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <img
                  src={apt.avatar}
                  alt={apt.doctor}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/20"
                />
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#dae2ff] text-[#003d9b] text-[10px] font-extrabold mb-1">
                    {apt.type}
                  </span>
                  <h3 className="font-bold text-sm text-[#0b1c30] truncate">{apt.doctor}</h3>
                  <p className="text-xs text-[#434654] font-medium">{apt.specialty}</p>
                  <p className="text-xs text-[#737685]">{apt.hospital}</p>
                </div>
              </div>

              <div className="bg-[#f8f9ff] p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#003d9b] font-semibold">
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>{apt.date}</span>
                </div>
                <div className="flex items-center gap-2 text-[#003d9b] font-semibold">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <span>{apt.time}</span>
                </div>
              </div>

              {apt.status === 'Upcoming' && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onCancelAppointment(apt.id)}
                    className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs hover:bg-red-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleOpenReschedule(apt)}
                    className="flex-1 py-2 rounded-xl bg-[#003d9b] text-white font-bold text-xs hover:bg-[#0052cc] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit_calendar</span>
                    <span>Reschedule</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reschedule Appointment Modal */}
      {rescheduleApt && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5 text-[#003d9b]">
                <span className="material-symbols-outlined text-xl">edit_calendar</span>
                <h3 className="font-bold text-sm text-[#0b1c30]">Reschedule Visit</h3>
              </div>
              <button 
                onClick={() => setRescheduleApt(null)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Doctor Info Card */}
            <div className="bg-[#f8f9ff] p-3 rounded-2xl border border-slate-200 flex items-center gap-3 mb-3">
              <img 
                src={rescheduleApt.avatar} 
                alt={rescheduleApt.doctor} 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-[#0b1c30] truncate">{rescheduleApt.doctor}</h4>
                <p className="text-[10px] text-slate-500">{rescheduleApt.specialty}</p>
              </div>
            </div>

            {/* Reschedule Form */}
            <form onSubmit={handleSaveReschedule} className="flex flex-col gap-3 text-xs">
              
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select New Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Time Slot</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                >
                  <option value="09:00 AM">09:00 AM (Morning Slot)</option>
                  <option value="10:30 AM">10:30 AM (Morning Slot)</option>
                  <option value="01:30 PM">01:30 PM (Afternoon Slot)</option>
                  <option value="04:00 PM">04:00 PM (Evening Slot)</option>
                  <option value="06:30 PM">06:30 PM (Evening Slot)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                >
                  <option value="Schedule Conflict">Schedule Conflict</option>
                  <option value="Feeling Unwell">Feeling Unwell</option>
                  <option value="Doctor Request">Doctor Request</option>
                  <option value="Personal Emergency">Personal Emergency</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#003d9b] text-white text-xs font-bold shadow hover:bg-[#0052cc] active:scale-95 transition-all"
                >
                  Confirm & Save
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}


// 8. Book Appointment Screen Component
export function BookAppointmentScreen({ onBook, onNavigate }) {
  const [specialty, setSpecialty] = useState('Cardiologist');
  const [doctor, setDoctor] = useState('Dr. Aris Thorne');
  const [date, setDate] = useState('2026-08-25');
  const [time, setTime] = useState('10:00 AM');
  const [type, setType] = useState('In-Person Consultation');

  const handleSubmit = (e) => {
    e.preventDefault();
    const newApt = {
      id: `apt-${Date.now()}`,
      doctor,
      specialty,
      hospital: 'City Central Health Plaza',
      date,
      time,
      status: 'Upcoming',
      type,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
    };
    onBook(newApt);
    onNavigate('appointments');
  };

  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#0b1c30]">Schedule Appointment</h2>
        <p className="text-xs text-[#434654]">Select specialist doctor, preferred date and time slot</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Select Medical Specialty</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b]"
          >
            <option value="Cardiologist">Cardiology (Heart Health)</option>
            <option value="Dermatologist">Dermatology (Skin Care)</option>
            <option value="General Physician">General Practice / Primary Care</option>
            <option value="Neurologist">Neurology</option>
            <option value="Orthopedics">Orthopedics (Bone & Joints)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Select Specialist Doctor</label>
          <select
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30] focus:outline-none focus:border-[#003d9b]"
          >
            <option value="Dr. Aris Thorne">Dr. Aris Thorne (Cardiology - Senior Consultant)</option>
            <option value="Dr. Elena Rostova">Dr. Elena Rostova (Dermatology)</option>
            <option value="Dr. Marcus Vance">Dr. Marcus Vance (General Medicine)</option>
            <option value="Dr. Sarah Lin">Dr. Sarah Lin (Pulmonology)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Consultation Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('In-Person Consultation')}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                type === 'In-Person Consultation' ? 'bg-[#dae2ff] text-[#003d9b] border-[#003d9b]' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              In-Person Clinic
            </button>
            <button
              type="button"
              onClick={() => setType('Video Telehealth Call')}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                type === 'Video Telehealth Call' ? 'bg-[#dae2ff] text-[#003d9b] border-[#003d9b]' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Video Telehealth
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Time Slot</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-3 bg-white border border-[#c3c6d6] rounded-xl text-sm font-medium text-[#0b1c30]"
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="02:30 PM">02:30 PM</option>
              <option value="04:15 PM">04:15 PM</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-base shadow-md hover:bg-[#0052cc] active:scale-95 transition-all mt-4"
        >
          Confirm & Book Appointment
        </button>
      </form>
    </div>
  );
}
