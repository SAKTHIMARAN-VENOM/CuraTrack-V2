'use client';

import React, { useState } from 'react';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { checkDrugInteractions } from '@/lib/api';
import { 
  Pill, 
  Sun, 
  Sunset, 
  Moon, 
  Plus, 
  AlertCircle, 
  Check, 
  Clock, 
  RotateCcw, 
  Sparkles,
  Calendar,
  CheckCircle2,
  X
} from 'lucide-react';

export default function MedicationsPage() {
  const { medications, toggleMedication, addMedication, medicationAdherence } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refillToast, setRefillToast] = useState(false);
  const [interactionWarnings, setInteractionWarnings] = useState<Array<{ drug_a: string; drug_b: string; severity: string; description: string }>>([]);

  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    timing: '08:00 AM',
    timeSlot: 'morning' as const,
    instructions: 'Take after meal',
    totalPills: 30,
    remainingPills: 30,
  });

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name) return;

    // Check drug interactions with existing medications
    const existingNames = medications.map(m => m.name);
    const allMeds = [...existingNames, newMed.name];
    
    if (allMeds.length >= 2) {
      try {
        const result = await checkDrugInteractions(allMeds);
        if (result.pairs && result.pairs.length > 0) {
          const dangerous = result.pairs.filter(p => p.interaction_found);
          if (dangerous.length > 0) {
            setInteractionWarnings(dangerous);
            // Still add the medication but show warnings
          }
        }
      } catch (e) {
        console.warn('Drug interaction check failed:', e);
      }
    }

    addMedication({
      ...newMed,
      taken: false,
    });
    setIsAddModalOpen(false);
    setNewMed({
      name: '',
      dosage: '',
      timing: '08:00 AM',
      timeSlot: 'morning',
      instructions: 'Take after meal',
      totalPills: 30,
      remainingPills: 30,
    });
  };

  const sections = [
    { key: 'morning', label: 'Morning (8:00 AM)', icon: Sun, color: 'text-amber-500' },
    { key: 'afternoon', label: 'Afternoon (1:00 PM)', icon: Sun, color: 'text-orange-500' },
    { key: 'evening', label: 'Evening (8:00 PM)', icon: Sunset, color: 'text-indigo-500' },
    { key: 'night', label: 'Night / As Needed', icon: Moon, color: 'text-blue-500' },
  ];

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Medication Tracker" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Header & Adherence Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">Medication Tracker</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Today&apos;s Active Prescriptions</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-full border-4 border-slate-100 dark:border-slate-800 relative flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary transition-all duration-500"
                  style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 ${100 - medicationAdherence}%)` }}
                />
                <span className="text-[10px] font-bold text-primary">{medicationAdherence}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Adherence</span>
                <span className="text-xs font-bold text-on-surface">
                  {medications.filter((m) => m.taken).length} of {medications.length} taken
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Med</span>
            </button>
          </div>
        </div>

        {/* Refill Reminder Alert */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-error/10 text-error rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface">Pharmacy Refill Alert</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                <strong>Atorvastatin (20mg)</strong> is down to 4 doses remaining.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setRefillToast(true);
              setTimeout(() => setRefillToast(false), 3000);
            }}
            className="self-end sm:self-auto bg-error text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-sm"
          >
            Request Refill
          </button>
        </div>

        {refillToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Refill request sent to Walgreens Pharmacy #4402!</span>
          </div>
        )}

        {/* Drug Interaction Warnings */}
        {interactionWarnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold">Drug Interaction Warnings</span>
              <button onClick={() => setInteractionWarnings([])} className="ml-auto text-amber-600 text-[10px] font-bold hover:underline">Dismiss</button>
            </div>
            {interactionWarnings.map((w, i) => (
              <div key={i} className="text-xs text-amber-700 dark:text-amber-300 pl-6">
                <strong>{w.drug_a}</strong> × <strong>{w.drug_b}</strong>: {w.description} <span className={`font-bold ${w.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`}>({w.severity})</span>
              </div>
            ))}
          </div>
        )}

        {/* Schedules */}
        <div className="space-y-6">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const medsInSection = medications.filter((m) => m.timeSlot === sec.key);
            if (medsInSection.length === 0) return null;

            return (
              <section key={sec.key} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Icon className={`w-4 h-4 ${sec.color}`} />
                  <h3 className="text-sm font-bold text-on-surface">{sec.label}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {medsInSection.map((med) => (
                    <div
                      key={med.id}
                      onClick={() => toggleMedication(med.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-card ${
                        med.taken
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          med.taken
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary/10 text-primary dark:text-primary-fixed'
                        }`}>
                          <Pill className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-bold ${med.taken ? 'line-through text-slate-500' : 'text-on-surface'}`}>
                              {med.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {med.dosage}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {med.instructions}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>{med.remainingPills} pills left</span>
                            <span>•</span>
                            <span className="text-primary font-medium">{med.timing}</span>
                          </div>
                        </div>
                      </div>

                      {/* Checkbox Trigger */}
                      <button
                        type="button"
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          med.taken
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                        }`}
                      >
                        {med.taken && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Add Medication Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  <span>Add Prescription</span>
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMed} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Medication Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin"
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500mg"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Time Slot
                    </label>
                    <select
                      value={newMed.timeSlot}
                      onChange={(e) => setNewMed({ ...newMed, timeSlot: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    >
                      <option value="morning">Morning (8:00 AM)</option>
                      <option value="afternoon">Afternoon (1:00 PM)</option>
                      <option value="evening">Evening (8:00 PM)</option>
                      <option value="night">Night / As Needed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Take with a glass of water after food"
                    value={newMed.instructions}
                    onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-sm"
                  >
                    Add Medication
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
