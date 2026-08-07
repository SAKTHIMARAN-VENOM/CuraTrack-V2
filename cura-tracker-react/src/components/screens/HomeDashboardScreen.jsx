import React from 'react';

export function HomeDashboardScreen({ 
  userProfile, 
  vitals, 
  appointments, 
  medications, 
  onNavigate 
}) {
  const upcomingAppointment = appointments.find(a => a.status === 'Upcoming');
  const pendingMedication = medications.find(m => !m.taken);

  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-5">
      
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">
            Hello, {userProfile?.name?.split(' ')[0] || 'Sarah'} 👋
          </h1>
          <p className="text-xs text-[#434654] font-medium">Here is your daily health summary</p>
        </div>
        <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-[#003d9b]/20 shadow-sm select-none">
          <img src={userProfile?.avatar} alt={userProfile?.name} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Emergency SOS Banner Callout */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-3xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
            <span className="material-symbols-outlined text-2xl text-white animate-pulse">sos</span>
          </div>
          <div>
            <h3 className="font-bold text-sm leading-snug">Emergency SOS</h3>
            <p className="text-[11px] text-red-100">Tap to alert medical dispatch & emergency contacts</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('emergency_sos')}
          className="px-3.5 py-2 rounded-xl bg-white text-red-700 font-extrabold text-xs shadow hover:bg-red-50 active:scale-95 transition-all"
        >
          TRIGGER
        </button>
      </div>

      {/* Bento Vitals Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0b1c30]">Health Vitals</h2>
          <button 
            onClick={() => onNavigate('health_reports')}
            className="text-xs font-bold text-[#003d9b] hover:underline"
          >
            View Trends ➔
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          
          {/* Steps (Spans 2 columns) */}
          <div className="col-span-2 bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#006c49]">
                <span className="material-symbols-outlined fill text-xl">directions_walk</span>
                <span className="text-xs font-bold text-[#0b1c30]">Daily Steps</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                64% Goal Achieved
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals?.steps?.toLocaleString() || '6,420'}</span>
                <span className="text-xs text-[#434654] font-medium ml-1">/ 10,000 steps</span>
              </div>
              <span className="text-xs text-[#434654] font-medium">3,580 remaining</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-[#006c49] h-full rounded-full w-[64%]"></div>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <span className="material-symbols-outlined fill text-xl">favorite</span>
              <span className="text-xs font-bold text-[#0b1c30]">Heart Rate</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals?.heartRate || 72}</span>
              <span className="text-xs text-[#434654] font-medium ml-1">bpm</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">Normal Resting</span>
          </div>

          {/* SpO2 */}
          <div className="bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-sky-600">
              <span className="material-symbols-outlined text-xl">pulmonology</span>
              <span className="text-xs font-bold text-[#0b1c30]">Oxygen (SpO2)</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-[#0b1c30]">{vitals?.spo2 || 98}%</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">Excellent Level</span>
          </div>

        </div>
      </div>

      {/* Quick Action Grid */}
      <div>
        <h2 className="text-sm font-bold text-[#0b1c30] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <button 
            onClick={() => onNavigate('appointments')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-[#c3c6d6]/40 shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#dae2ff] text-[#003d9b] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Book Visit</span>
          </button>

          <button 
            onClick={() => onNavigate('medications')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-[#c3c6d6]/40 shadow-sm hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">medication</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Rx Meds</span>
          </button>

          <button 
            onClick={() => onNavigate('medical_records')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-[#c3c6d6]/40 shadow-sm hover:bg-purple-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e1e0ff] text-[#2b29bb] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">folder_shared</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Records</span>
          </button>

          <button 
            onClick={() => onNavigate('benefits_schemes')}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-[#c3c6d6]/40 shadow-sm hover:bg-teal-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] text-[#008080] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <span className="text-[11px] font-bold text-[#0b1c30] leading-tight">Schemes</span>
          </button>
        </div>
      </div>

      {/* Next Upcoming Appointment Widget */}
      {upcomingAppointment && (
        <div className="bg-white rounded-3xl p-4 border border-[#c3c6d6]/50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#003d9b] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-base">calendar_clock</span>
              Upcoming Appointment
            </span>
            <button onClick={() => onNavigate('appointments')} className="text-xs font-bold text-[#003d9b] hover:underline">
              View All
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            <img 
              src={upcomingAppointment.avatar} 
              alt={upcomingAppointment.doctor} 
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/20"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-[#0b1c30] truncate">{upcomingAppointment.doctor}</h3>
              <p className="text-xs text-[#434654]">{upcomingAppointment.specialty}</p>
              <p className="text-xs text-[#003d9b] font-semibold mt-0.5">
                {upcomingAppointment.date} at {upcomingAppointment.time}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Medication Reminder Widget */}
      {pendingMedication && (
        <div className="bg-[#6cf8bb]/15 border border-[#006c49]/30 rounded-3xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006c49] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">pill</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#006c49]">Medication Alert</h4>
              <p className="text-xs font-bold text-[#0b1c30]">{pendingMedication.name} ({pendingMedication.dosage})</p>
              <p className="text-[11px] text-[#434654]">{pendingMedication.time} • {pendingMedication.instructions}</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('medications')}
            className="px-3 py-1.5 rounded-xl bg-[#006c49] text-white font-bold text-xs hover:bg-emerald-800 transition-all"
          >
            Take Now
          </button>
        </div>
      )}

    </div>
  );
}
