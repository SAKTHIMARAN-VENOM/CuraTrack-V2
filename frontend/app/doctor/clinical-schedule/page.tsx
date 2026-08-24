'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DoctorRosterEntry {
  id: string;
  doctorName: string;
  qualification: string;
  specialization: string;
  department: string;
  roomNumber: string;
  shift: 'Morning (08:00 - 14:00)' | 'Evening (14:00 - 20:00)' | 'Night On-Call (20:00 - 08:00)';
  status: 'ON-DUTY' | 'IN-CONSULT' | 'ON-CALL' | 'ON-LEAVE';
  patientsInQueue: number;
  phone: string;
}

const INITIAL_ROSTER: DoctorRosterEntry[] = [
  {
    id: 'DOC-MH-01',
    doctorName: 'Dr. David Ross',
    qualification: 'MBBS, MD (Medicine)',
    specialization: 'General Medicine & Cardiology',
    department: 'General OPD',
    roomNumber: 'OPD Room 101',
    shift: 'Morning (08:00 - 14:00)',
    status: 'IN-CONSULT',
    patientsInQueue: 6,
    phone: '+91 98201 11201'
  },
  {
    id: 'DOC-MH-02',
    doctorName: 'Dr. Ananya Sen',
    qualification: 'MBBS, MS (OB/GYN)',
    specialization: 'Obstetrics & Maternal Care',
    department: 'Maternal & ANC',
    roomNumber: 'OPD Room 103 (ANC)',
    shift: 'Morning (08:00 - 14:00)',
    status: 'ON-DUTY',
    patientsInQueue: 4,
    phone: '+91 98201 11202'
  },
  {
    id: 'DOC-MH-03',
    doctorName: 'Dr. Rajesh Kulkarni',
    qualification: 'MBBS, DCH',
    specialization: 'Pediatrics & Neonatology',
    department: 'Pediatrics OPD',
    roomNumber: 'OPD Room 105',
    shift: 'Evening (14:00 - 20:00)',
    status: 'ON-CALL',
    patientsInQueue: 2,
    phone: '+91 98201 11203'
  },
  {
    id: 'DOC-MH-04',
    doctorName: 'Dr. Priya Sharma',
    qualification: 'MBBS, MEM (Emergency)',
    specialization: 'Emergency & Trauma Care',
    department: 'Casualty / Trauma Bay',
    roomNumber: 'Trauma Bay 1',
    shift: 'Night On-Call (20:00 - 08:00)',
    status: 'ON-DUTY',
    patientsInQueue: 3,
    phone: '+91 98201 11204'
  },
  {
    id: 'DOC-MH-05',
    doctorName: 'Dr. Vikram Deshmukh',
    qualification: 'MBBS, MS (Ortho)',
    specialization: 'Orthopedics & Trauma',
    department: 'Surgical OPD',
    roomNumber: 'OPD Room 108',
    shift: 'Morning (08:00 - 14:00)',
    status: 'ON-DUTY',
    patientsInQueue: 5,
    phone: '+91 98201 11205'
  }
];

export default function ClinicalSchedulePage() {
  const [roster, setRoster] = useState<DoctorRosterEntry[]>(INITIAL_ROSTER);
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Duty Entry Form
  const [newEntry, setNewEntry] = useState<Partial<DoctorRosterEntry>>({
    doctorName: '',
    qualification: 'MBBS, MD',
    specialization: 'General Medicine',
    department: 'General OPD',
    roomNumber: 'OPD Room 102',
    shift: 'Morning (08:00 - 14:00)',
    status: 'ON-DUTY',
    patientsInQueue: 0,
    phone: '+91 98000 00000'
  });

  // Load persisted roster from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('curatrack_doctor_roster');
      if (saved) {
        setRoster(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveRoster = (updated: DoctorRosterEntry[]) => {
    setRoster(updated);
    try {
      localStorage.setItem('curatrack_doctor_roster', JSON.stringify(updated));
    } catch {}
  };

  const handleToggleStatus = (id: string) => {
    const statusCycle: Record<DoctorRosterEntry['status'], DoctorRosterEntry['status']> = {
      'ON-DUTY': 'IN-CONSULT',
      'IN-CONSULT': 'ON-CALL',
      'ON-CALL': 'ON-LEAVE',
      'ON-LEAVE': 'ON-DUTY'
    };

    const updated = roster.map(doc => {
      if (doc.id === id) {
        const nextStatus = statusCycle[doc.status];
        return { ...doc, status: nextStatus };
      }
      return doc;
    });

    saveRoster(updated);
    setToastMsg('Doctor duty status updated.');
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleAddDoctorDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.doctorName) return;

    const entry: DoctorRosterEntry = {
      id: `DOC-MH-${Date.now().toString().slice(-3)}`,
      doctorName: newEntry.doctorName,
      qualification: newEntry.qualification || 'MBBS',
      specialization: newEntry.specialization || 'General Medicine',
      department: newEntry.department || 'General OPD',
      roomNumber: newEntry.roomNumber || 'OPD Room 102',
      shift: newEntry.shift || 'Morning (08:00 - 14:00)',
      status: (newEntry.status as any) || 'ON-DUTY',
      patientsInQueue: Number(newEntry.patientsInQueue) || 0,
      phone: newEntry.phone || '+91 98000 00000'
    };

    const updated = [entry, ...roster];
    saveRoster(updated);
    setIsAddModalOpen(false);
    setNewEntry({
      doctorName: '',
      qualification: 'MBBS, MD',
      specialization: 'General Medicine',
      department: 'General OPD',
      roomNumber: 'OPD Room 102',
      shift: 'Morning (08:00 - 14:00)',
      status: 'ON-DUTY',
      patientsInQueue: 0,
      phone: '+91 98000 00000'
    });
    setToastMsg(`Doctor ${entry.doctorName} assigned to roster.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredRoster = roster.filter(d => {
    if (filterDept !== 'ALL' && d.department !== filterDept) return false;
    if (filterShift !== 'ALL' && !d.shift.startsWith(filterShift)) return false;
    return true;
  });

  const onDutyCount = roster.filter(d => d.status === 'ON-DUTY' || d.status === 'IN-CONSULT').length;
  const onCallCount = roster.filter(d => d.status === 'ON-CALL').length;
  const totalQueue = roster.reduce((acc, curr) => acc + curr.patientsInQueue, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-primary to-teal-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-blue-200 mb-3">
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            <span>Hospital Operations & Clinical Staffing</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Facility Doctor Duty Roster</h1>
          <p className="text-blue-100 text-sm mt-2 max-w-2xl leading-relaxed">
            Real-time OPD consultation schedule, on-duty clinical officers, room allocations, and emergency on-call staffing roster.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/facility"
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Facility Operations</span>
          </Link>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Assign Doctor Shift</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-teal-600">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">On-Duty Doctors</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{onDutyCount}</span>
            <span className="text-[10px] text-teal-600 font-semibold">Active OPD consultations</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">stethoscope</span>
          </div>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Emergency On-Call</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{onCallCount}</span>
            <span className="text-[10px] text-amber-600 font-semibold">Standby specialists</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">phone_in_talk</span>
          </div>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Total Live OPD Queue</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{totalQueue}</span>
            <span className="text-[10px] text-blue-600 font-semibold">Patients awaiting consult</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Active OPD Rooms</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">5</span>
            <span className="text-[10px] text-purple-600 font-semibold">Rooms 101, 103, 105, 108 & Trauma</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">meeting_room</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'General OPD', 'Maternal & ANC', 'Pediatrics OPD', 'Casualty / Trauma Bay', 'Surgical OPD'].map((dept) => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterDept === dept
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-tertiary">Shift:</span>
          {['ALL', 'Morning', 'Evening', 'Night'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterShift(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                filterShift === s
                  ? 'bg-on-surface text-white'
                  : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Roster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoster.map((doc) => {
          const statusBadge = 
            doc.status === 'IN-CONSULT' ? 'bg-purple-100 text-purple-800 border-purple-200' :
            doc.status === 'ON-DUTY' ? 'bg-teal-100 text-teal-800 border-teal-200' :
            doc.status === 'ON-CALL' ? 'bg-amber-100 text-amber-800 border-amber-200' :
            'bg-slate-100 text-slate-700 border-slate-200';

          return (
            <div key={doc.id} className="bg-white rounded-3xl border border-surface-container-high p-6 shadow-card hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-tertiary font-bold">{doc.id}</span>
                    <h3 className="text-base font-extrabold text-on-surface">{doc.doctorName}</h3>
                    <p className="text-xs text-primary font-bold">{doc.qualification}</p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(doc.id)}
                    title="Click to cycle status"
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer ${statusBadge}`}
                  >
                    {doc.status}
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <span className="material-symbols-outlined text-base text-tertiary">medical_services</span>
                    <span>{doc.specialization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <span className="material-symbols-outlined text-base text-tertiary">meeting_room</span>
                    <span>{doc.roomNumber} ({doc.department})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <span className="material-symbols-outlined text-base text-tertiary">schedule</span>
                    <span>{doc.shift}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <span className="material-symbols-outlined text-base text-tertiary">phone</span>
                    <span>{doc.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-container-high flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-800">{doc.patientsInQueue} Waiting in Queue</span>
                </div>
                <Link
                  href="/doctor"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>OPD Desk</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Shift Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-surface-container-high space-y-6">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <h2 className="text-lg font-bold text-on-surface">Assign Doctor Shift & Room</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-tertiary hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddDoctorDuty} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-tertiary uppercase mb-1">Doctor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Smita Patil"
                  value={newEntry.doctorName}
                  onChange={e => setNewEntry({ ...newEntry, doctorName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase mb-1">Qualification</label>
                  <input
                    type="text"
                    value={newEntry.qualification}
                    onChange={e => setNewEntry({ ...newEntry, qualification: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    value={newEntry.specialization}
                    onChange={e => setNewEntry({ ...newEntry, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase mb-1">Department</label>
                  <select
                    value={newEntry.department}
                    onChange={e => setNewEntry({ ...newEntry, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                  >
                    <option value="General OPD">General OPD</option>
                    <option value="Maternal & ANC">Maternal & ANC</option>
                    <option value="Pediatrics OPD">Pediatrics OPD</option>
                    <option value="Casualty / Trauma Bay">Casualty / Trauma Bay</option>
                    <option value="Surgical OPD">Surgical OPD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase mb-1">Room Allocation</label>
                  <input
                    type="text"
                    value={newEntry.roomNumber}
                    onChange={e => setNewEntry({ ...newEntry, roomNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-tertiary uppercase mb-1">Duty Shift</label>
                <select
                  value={newEntry.shift}
                  onChange={e => setNewEntry({ ...newEntry, shift: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                >
                  <option value="Morning (08:00 - 14:00)">Morning (08:00 - 14:00)</option>
                  <option value="Evening (14:00 - 20:00)">Evening (14:00 - 20:00)</option>
                  <option value="Night On-Call (20:00 - 08:00)">Night On-Call (20:00 - 08:00)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-surface-container-low text-tertiary font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

