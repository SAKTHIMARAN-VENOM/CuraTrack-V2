import React, { useState, useEffect } from 'react';

// 7. Appointments Screen Component (Matching Available Specialists Telemedicine View)
export function AppointmentsScreen({ 
  appointments, 
  onNavigate, 
  onCancelAppointment, 
  onRescheduleAppointment,
  onBook 
}) {
  const [activeTab, setActiveTab] = useState('Specialists'); // 'Specialists' | 'MyBookings'
  
  // Available Specialists mock data matching reference template
  const specialists = [
    {
      id: 'doc-01',
      num: '01',
      name: 'Dr. James Alexander',
      initial: 'D',
      specialty: 'GENERAL SPECIALIST',
      consultType: 'Video Visit',
      waitTime: 'Approx. 15 min',
      avatarBg: 'bg-[#dae2ff] text-[#003d9b]'
    },
    {
      id: 'doc-02',
      num: '02',
      name: 'Dr. Emily Chen',
      initial: 'D',
      specialty: 'GENERAL SPECIALIST',
      consultType: 'Video Visit',
      waitTime: 'Approx. 15 min',
      avatarBg: 'bg-[#e1e0ff] text-[#2b29bb]'
    },
    {
      id: 'doc-03',
      num: '03',
      name: 'Dr. David Ross',
      initial: 'D',
      specialty: 'GENERAL SPECIALIST',
      consultType: 'Video Visit',
      waitTime: 'Approx. 15 min',
      avatarBg: 'bg-emerald-100 text-[#006c49]'
    }
  ];

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

  const handleBookInstantCall = (doctor) => {
    const newApt = {
      id: `apt-${Date.now()}`,
      doctor: doctor.name,
      specialty: 'General Practice Telehealth',
      hospital: 'CuraTrack Virtual Clinic',
      date: new Date().toISOString().split('T')[0],
      time: 'Instant Call (15m)',
      status: 'Upcoming',
      type: 'Video Telehealth Call',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
    };
    if (onBook) onBook(newApt);
    setToastMessage(`✓ Instant call booked with ${doctor.name}! Consultation room ready.`);
    setTimeout(() => setToastMessage(''), 4000);
  };

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

  return (
    <div className="flex-1 p-5 bg-[#f4f7fb] flex flex-col gap-4 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#005f73] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 z-50">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Available Specialists</h1>
            <p className="text-xs text-[#434654] font-medium mt-0.5">
              Choose a doctor and move directly into a secure consultation room.
            </p>
          </div>
          <span className="bg-[#e0f2fe] text-[#0284c7] font-bold text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm shrink-0">
            <span className="text-amber-500 font-bold">⚡</span>
            <span>Instant video booking</span>
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-[#e5eeff] p-1 rounded-2xl border border-[#c3c6d6]/40 mt-2">
          <button
            onClick={() => setActiveTab('Specialists')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'Specialists' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
            }`}
          >
            Available Doctors ({specialists.length})
          </button>
          <button
            onClick={() => setActiveTab('MyBookings')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'MyBookings' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
            }`}
          >
            My Booked Visits ({appointments.length})
          </button>
        </div>
      </div>

      {/* 1. AVAILABLE SPECIALISTS TAB (Reference Layout) */}
      {activeTab === 'Specialists' && (
        <div className="flex flex-col gap-4">
          {specialists.map((doc) => (
            <div 
              key={doc.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              {/* Doctor Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${doc.avatarBg} font-extrabold text-lg flex items-center justify-center shadow-sm`}>
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
                  <span className="text-base font-extrabold text-slate-700 leading-tight">{doc.num}</span>
                </div>
              </div>

              {/* Consult Type & Wait Time Box */}
              <div className="bg-[#f0f4f8] p-3.5 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    CONSULT TYPE
                  </span>
                  <span className="font-extrabold text-[#0b1c30] text-xs">{doc.consultType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    WAIT TIME
                  </span>
                  <span className="font-extrabold text-[#0b1c30] text-xs">{doc.waitTime}</span>
                </div>
              </div>

              {/* Secure Session Notice Box */}
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

              {/* Book Instant Call Action Button */}
              <button
                onClick={() => handleBookInstantCall(doc)}
                className="w-full py-3.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow-md hover:bg-[#006666] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add_box</span>
                <span>Book Instant Call</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. MY BOOKED VISITS TAB */}
      {activeTab === 'MyBookings' && (
        <div className="flex flex-col gap-3">
          {appointments.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-[#c3c6d6]/40 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-[#737685]">event_busy</span>
              <p className="text-sm font-bold text-[#0b1c30]">No scheduled appointments</p>
              <button
                onClick={() => setActiveTab('Specialists')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#008080] text-white text-xs font-bold"
              >
                Book Instant Telemedicine Call
              </button>
            </div>
          ) : (
            appointments.map((apt) => (
              <div key={apt.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src={apt.avatar}
                    alt={apt.doctor}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-500/20"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] text-[10px] font-extrabold mb-1">
                      {apt.type}
                    </span>
                    <h3 className="font-bold text-sm text-[#0b1c30] truncate">{apt.doctor}</h3>
                    <p className="text-xs text-[#434654] font-medium">{apt.specialty}</p>
                    <p className="text-xs text-[#737685]">{apt.hospital}</p>
                  </div>
                </div>

                <div className="bg-[#f0f4f8] p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-[#008080]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    <span>{apt.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                      className="flex-1 py-2 rounded-xl bg-[#008080] text-white font-bold text-xs hover:bg-[#006666] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1"
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
      )}

      {/* Reschedule Appointment Modal */}
      {rescheduleApt && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5 text-[#008080]">
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
            <div className="bg-[#f0f4f8] p-3 rounded-2xl border border-slate-200 flex items-center gap-3 mb-3">
              <img 
                src={rescheduleApt.avatar} 
                alt={rescheduleApt.doctor} 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-teal-500/20"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#008080]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Time Slot</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#008080]"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#008080]"
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
                  className="flex-1 py-2.5 rounded-xl bg-[#008080] text-white text-xs font-bold shadow hover:bg-[#006666] active:scale-95 transition-all"
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
