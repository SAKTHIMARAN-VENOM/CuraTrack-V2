import React, { useState } from 'react';
import { API_BASE } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface ReviewMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: {
    name: string;
    dosage: string;
    frequency: string;
    time: string;
    reason: string;
    confidence: number;
  };
  onConfirm: (updatedMed: any) => void;
}

export default function ReviewMedicationModal({ isOpen, onClose, medication, onConfirm }: ReviewMedicationModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({ ...medication });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !medication) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
        patient_id: "demo-patient-001",
        medications: [formData],
        lab_results: [],
        doctor_notes: { summary: "", confidence: 0.0 }
    };

    try {
      const response = await fetch(`${API_BASE}/api/confirm-ingestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(t('reviewMed.failedSave', 'Failed to save medication record'));
      }

      onConfirm(formData);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/20 shadow-xl rounded-3xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{t('reviewMed.title', 'Review Medication')}</h2>
            <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                {t('reviewMed.aiConfidence', 'AI Confidence')}: {Math.round(medication.confidence * 100)}%
            </p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface-variant cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tertiary uppercase tracking-wider ml-1">{t('reviewMed.medName', 'Medication Name')}</label>
            <input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('reviewMed.medNamePlaceholder', 'e.g. Lisinopril')}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-tertiary uppercase tracking-wider ml-1">{t('reviewMed.dosage', 'Dosage')}</label>
              <input 
                name="dosage"
                value={formData.dosage}
                onChange={handleChange}
                placeholder={t('reviewMed.dosagePlaceholder', 'e.g. 10mg')}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-tertiary uppercase tracking-wider ml-1">{t('reviewMed.frequency', 'Frequency')}</label>
              <input 
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                placeholder={t('reviewMed.frequencyPlaceholder', 'e.g. Once daily')}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tertiary uppercase tracking-wider ml-1">{t('reviewMed.time', 'Time / Specifics')}</label>
            <input 
              name="time"
              value={formData.time}
              onChange={handleChange}
              placeholder={t('reviewMed.timePlaceholder', 'e.g. 08:00 AM with food')}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tertiary uppercase tracking-wider ml-1">{t('reviewMed.reason', 'Reason (Optional)')}</label>
            <textarea 
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={2}
              placeholder={t('reviewMed.reasonPlaceholder', 'e.g. Hypertension')}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-error-container/40 rounded-xl border border-error/20 text-xs text-on-error-container flex gap-2">
              <span className="material-symbols-outlined text-sm">report</span> {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3 rounded-b-3xl">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}
          >
            {isSaving ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('reviewMed.saving', 'Saving...')}
                </>
            ) : (
                <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {t('reviewMed.confirmSave', 'Confirm & Save')}
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
