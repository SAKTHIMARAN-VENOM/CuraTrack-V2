import React, { useState, useEffect } from 'react';

export function MedicationsScreen({ medications, onToggleMedication, onAddMedication }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('09:00 AM');
  const [category, setCategory] = useState('General Rx');

  useEffect(() => {
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      if (showModal) {
        scrollContainer.scrollTop = 0;
        scrollContainer.style.overflow = 'hidden';
      } else {
        scrollContainer.style.overflow = 'auto';
      }
    }
    return () => {
      if (scrollContainer) scrollContainer.style.overflow = 'auto';
    };
  }, [showModal]);



  const handleAdd = (e) => {
    e.preventDefault();
    if (!name) return;
    onAddMedication({
      id: `med-${Date.now()}`,
      name,
      dosage: dosage || '1 tablet',
      instructions: 'Take with water',
      time,
      taken: false,
      category,
      color: '#003d9b'
    });
    setName('');
    setDosage('');
    setShowModal(false);
  };

  const takenCount = medications.filter(m => m.taken).length;
  const progressPercent = medications.length > 0 ? Math.round((takenCount / medications.length) * 100) : 0;

  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1c30]">Daily Medications</h2>
          <p className="text-xs text-[#434654]">Track your active prescriptions & pill schedule</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#006c49] text-white font-bold text-xs shadow hover:bg-emerald-800 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Add Med</span>
        </button>
      </div>

      {/* Daily Adherence Tracker Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#0b1c30]">Today's Dose Adherence</span>
          <span className="font-extrabold text-[#006c49]">{takenCount} of {medications.length} taken ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#006c49] h-full rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Medication List */}
      <div className="flex flex-col gap-3">
        {medications.map((med) => (
          <div 
            key={med.id} 
            className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
              med.taken 
                ? 'bg-emerald-50/60 border-emerald-200 opacity-80' 
                : 'bg-white border-[#c3c6d6]/50 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: med.color || '#0052cc' }}
              >
                <span className="material-symbols-outlined text-2xl">pill</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-sm text-[#0b1c30] ${med.taken ? 'line-through text-slate-500' : ''}`}>
                    {med.name}
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {med.dosage}
                  </span>
                </div>
                <p className="text-xs text-[#434654] font-medium">{med.instructions}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-[#003d9b]">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>{med.time}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onToggleMedication(med.id)}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                med.taken 
                  ? 'bg-[#006c49] text-white shadow' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title={med.taken ? "Mark as Pending" : "Mark as Taken"}
            >
              <span className="material-symbols-outlined text-xl">
                {med.taken ? 'check' : 'circle'}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Add Medication Modal */}
      {showModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200">

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#0b1c30]">Add New Prescription</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Medication Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paracetamol"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-[#0b1c30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Dosage</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 500 mg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-[#0b1c30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Reminder Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-[#0b1c30]"
                >
                  <option value="08:00 AM">08:00 AM (Morning)</option>
                  <option value="01:00 PM">01:00 PM (Afternoon)</option>
                  <option value="08:00 PM">08:00 PM (Evening)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#006c49] text-white text-xs font-bold shadow"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
