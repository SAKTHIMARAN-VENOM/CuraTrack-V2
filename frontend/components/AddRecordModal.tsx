import React, { useState, useRef } from 'react';

type RecordType = 'select' | 'prescription' | 'notes' | 'lab';
type ModalStep = 'upload' | 'classifying' | 'form';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function AddRecordModal({ isOpen, onClose, onSuccess }: AddRecordModalProps) {
  const [step, setStep] = useState<ModalStep>('upload');
  const [recordType, setRecordType] = useState<RecordType>('select');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR extracted data
  const [rawText, setRawText] = useState('');
  const [ocrData, setOcrData] = useState<any>(null);

  // Prescription form
  const [rxForm, setRxForm] = useState({
    name: '', dosage: '', frequency: '', doctor: '', date: '', refills: '', instructions: '',
  });

  // Doctor's Notes form
  const [noteForm, setNoteForm] = useState({
    doctor: '', specialty: '', date: '', visitType: '', complaint: '', observations: '', plan: '', followUp: '',
  });

  // Lab Report form
  const [labForm, setLabForm] = useState({
    testName: '', labName: '', doctor: '', date: '', status: 'Normal' as 'Normal' | 'Flagged' | 'Pending',
    results: [{ key: '', value: '', unit: '' }],
  });

  if (!isOpen) return null;

  const resetAll = () => {
    setStep('upload');
    setRecordType('select');
    setFile(null);
    setError(null);
    setRawText('');
    setOcrData(null);
    setRxForm({ name: '', dosage: '', frequency: '', doctor: '', date: '', refills: '', instructions: '' });
    setNoteForm({ doctor: '', specialty: '', date: '', visitType: '', complaint: '', observations: '', plan: '', followUp: '' });
    setLabForm({ testName: '', labName: '', doctor: '', date: '', status: 'Normal', results: [{ key: '', value: '', unit: '' }] });
  };

  const handleClose = () => { resetAll(); onClose(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  // Step 1: Upload & OCR
  const handleUpload = async () => {
    if (!file) { setError("Please select a file."); return; }
    setIsUploading(true); setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("http://localhost:8000/api/ingest-document", { method: "POST", body: formData });
      if (!response.ok) { const d = await response.json(); throw new Error(d.detail || "Upload failed"); }
      const result = await response.json();
      setRawText(result.raw_text || '');
      setOcrData(result.data || null);
      setStep('classifying'); // Move to type selection
    } catch (err: any) { setError(err.message); } finally { setIsUploading(false); }
  };

  // Step 2: User picks type → pre-fill form from OCR data
  const selectType = (type: RecordType) => {
    setRecordType(type);
    setError(null);

    if (type === 'prescription' && ocrData) {
      const meds = ocrData.medications || [];
      const first = meds[0] || {};
      setRxForm({
        name: first.name || '', dosage: first.dosage || '', frequency: first.frequency || '',
        doctor: '', date: new Date().toISOString().split('T')[0],
        refills: '', instructions: first.reason || '',
      });
    }

    if (type === 'notes' && ocrData) {
      const notes = ocrData.doctor_notes || {};
      setNoteForm({
        doctor: '', specialty: '', date: new Date().toISOString().split('T')[0],
        visitType: '', complaint: notes.summary || rawText.slice(0, 500),
        observations: '', plan: '', followUp: '',
      });
    }

    if (type === 'lab' && ocrData) {
      const labs = ocrData.lab_results || [];
      setLabForm({
        testName: '', labName: '', doctor: '',
        date: new Date().toISOString().split('T')[0], status: 'Normal',
        results: labs.length > 0
          ? labs.map((l: any) => ({ key: l.test || '', value: l.value || '', unit: l.unit || '' }))
          : [{ key: '', value: '', unit: '' }],
      });
    }

    setStep('form');
  };

  // Step 3: Submit
  const submitPrescription = () => {
    if (!rxForm.name || !rxForm.dosage) { setError('Medication name and dosage are required.'); return; }
    onSuccess({ type: 'prescription', data: { ...rxForm, date: rxForm.date || new Date().toLocaleDateString() } });
    handleClose();
  };

  const submitNote = () => {
    if (!noteForm.doctor || !noteForm.complaint) { setError('Doctor name and chief complaint are required.'); return; }
    onSuccess({ type: 'notes', data: { ...noteForm, date: noteForm.date || new Date().toLocaleDateString() } });
    handleClose();
  };

  const submitLab = () => {
    if (!labForm.testName) { setError('Test name is required.'); return; }
    onSuccess({ type: 'lab', data: { ...labForm, date: labForm.date || new Date().toLocaleDateString(), results: labForm.results.filter(r => r.key) } });
    handleClose();
  };

  const addLabResult = () => {
    setLabForm(prev => ({ ...prev, results: [...prev.results, { key: '', value: '', unit: '' }] }));
  };

  const updateLabResult = (idx: number, field: string, value: string) => {
    setLabForm(prev => ({
      ...prev,
      results: prev.results.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }));
  };

  const inputClass = "w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const labelClass = "block text-xs font-bold text-tertiary uppercase tracking-widest mb-1.5";

  const headerTitle = step === 'upload' ? 'Upload Document'
    : step === 'classifying' ? 'Select Record Type'
    : recordType === 'prescription' ? 'Prescription Details'
    : recordType === 'notes' ? "Doctor's Note Details"
    : 'Lab Report Details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/20 shadow-xl rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'upload' && (
              <button onClick={() => { if (step === 'form') { setStep('classifying'); setRecordType('select'); } else { setStep('upload'); } setError(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            )}
            <h2 className="font-headline text-xl font-bold text-on-surface">{headerTitle}</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {['Upload', 'Classify', 'Review'].map((label, i) => {
            const stepIdx = step === 'upload' ? 0 : step === 'classifying' ? 1 : 2;
            const isActive = i <= stepIdx;
            return (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-1.5 ${isActive ? 'text-primary' : 'text-outline'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-primary text-white' : 'bg-surface-container text-outline'}`}>{i + 1}</div>
                  <span className="text-xs font-bold">{label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 rounded ${i < stepIdx ? 'bg-primary' : 'bg-surface-container'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-error-container/40 rounded-xl border border-error/20 flex gap-3 text-sm">
              <span className="material-symbols-outlined text-error text-xl shrink-0">error</span>
              <span className="text-on-error-container">{error}</span>
            </div>
          )}

          {/* ========== STEP 1: UPLOAD ========== */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="text-sm text-tertiary">
                Upload an image or PDF of your medical record. Our AI will extract the text and help you categorize the data.
              </div>
              <div
                className="border-2 border-dashed border-outline-variant/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors group"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input type="file" className="hidden" ref={fileInputRef} accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} disabled={isUploading} />
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                </div>
                {file ? (
                  <div className="text-center">
                    <span className="font-bold text-on-surface">{file.name}</span>
                    <p className="text-xs text-tertiary mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="font-bold text-on-surface">Click to select a file</span>
                    <p className="text-xs text-tertiary mt-1">PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
              {isUploading && (
                <div className="flex flex-col items-center justify-center gap-3 py-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-primary animate-pulse">Scanning with AI OCR...</span>
                </div>
              )}
            </div>
          )}

          {/* ========== STEP 2: CLASSIFY ========== */}
          {step === 'classifying' && (
            <div className="space-y-5">
              {/* Show extracted text preview */}
              {rawText && (
                <div className="bg-surface-container-low rounded-2xl p-4 max-h-32 overflow-y-auto border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-2">Extracted Text Preview</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">{rawText.slice(0, 600)}{rawText.length > 600 ? '...' : ''}</p>
                </div>
              )}

              <p className="text-sm font-bold text-on-surface">What type of record is this?</p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'prescription' as RecordType, icon: 'receipt_long', label: 'Prescription', color: '#006782' },
                  { id: 'notes' as RecordType, icon: 'description', label: "Doctor's\nNotes", color: '#35B0AB' },
                  { id: 'lab' as RecordType, icon: 'biotech', label: 'Lab\nReport', color: '#4F6378' },
                ].map(rt => (
                  <button
                    key={rt.id}
                    onClick={() => selectType(rt.id)}
                    className="p-5 bg-surface-container-low border border-outline-variant/20 rounded-2xl text-center hover:bg-surface-container hover:border-primary/30 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110" style={{ background: `${rt.color}15` }}>
                      <span className="material-symbols-outlined fill-icon text-2xl" style={{ color: rt.color }}>{rt.icon}</span>
                    </div>
                    <p className="font-headline font-bold text-on-surface text-sm whitespace-pre-line leading-tight">{rt.label}</p>
                  </button>
                ))}
              </div>

              {/* AI extraction summary */}
              {ocrData && (
                <div className="bg-secondary/5 rounded-2xl p-4 border border-secondary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-secondary text-lg">auto_awesome</span>
                    <p className="text-xs font-bold text-secondary">AI detected:</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(ocrData.medications?.length > 0) && (
                      <span className="px-2.5 py-1 rounded-lg bg-white text-[11px] font-bold text-on-surface">
                        💊 {ocrData.medications.length} medication{ocrData.medications.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {(ocrData.lab_results?.length > 0) && (
                      <span className="px-2.5 py-1 rounded-lg bg-white text-[11px] font-bold text-on-surface">
                        🔬 {ocrData.lab_results.length} lab result{ocrData.lab_results.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {(ocrData.doctor_notes?.summary) && (
                      <span className="px-2.5 py-1 rounded-lg bg-white text-[11px] font-bold text-on-surface">
                        📝 Doctor&apos;s notes found
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== STEP 3: FORM — PRESCRIPTION ========== */}
          {step === 'form' && recordType === 'prescription' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Medication Name *</label>
                  <input className={inputClass} placeholder="e.g. Lisinopril" value={rxForm.name} onChange={e => setRxForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Dosage *</label>
                  <input className={inputClass} placeholder="e.g. 10mg" value={rxForm.dosage} onChange={e => setRxForm(p => ({ ...p, dosage: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Frequency</label>
                  <input className={inputClass} placeholder="e.g. Once daily" value={rxForm.frequency} onChange={e => setRxForm(p => ({ ...p, frequency: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Prescribing Doctor</label>
                  <input className={inputClass} placeholder="e.g. Dr. Sarah Chen" value={rxForm.doctor} onChange={e => setRxForm(p => ({ ...p, doctor: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" className={inputClass} value={rxForm.date} onChange={e => setRxForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Refills</label>
                  <input className={inputClass} placeholder="e.g. 3" value={rxForm.refills} onChange={e => setRxForm(p => ({ ...p, refills: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Instructions</label>
                <textarea className={`${inputClass} min-h-[80px] resize-none`} placeholder="e.g. Take 1 tablet by mouth once daily..." value={rxForm.instructions} onChange={e => setRxForm(p => ({ ...p, instructions: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ========== STEP 3: FORM — DOCTOR'S NOTES ========== */}
          {step === 'form' && recordType === 'notes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Doctor Name *</label>
                  <input className={inputClass} placeholder="e.g. Dr. Sarah Chen" value={noteForm.doctor} onChange={e => setNoteForm(p => ({ ...p, doctor: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Specialty</label>
                  <input className={inputClass} placeholder="e.g. Cardiology" value={noteForm.specialty} onChange={e => setNoteForm(p => ({ ...p, specialty: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" className={inputClass} value={noteForm.date} onChange={e => setNoteForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Visit Type</label>
                  <input className={inputClass} placeholder="e.g. Follow-up" value={noteForm.visitType} onChange={e => setNoteForm(p => ({ ...p, visitType: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Chief Complaint *</label>
                <textarea className={`${inputClass} min-h-[70px] resize-none`} placeholder="Patient presents for..." value={noteForm.complaint} onChange={e => setNoteForm(p => ({ ...p, complaint: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Clinical Observations</label>
                <textarea className={`${inputClass} min-h-[70px] resize-none`} placeholder="BP, HR, findings..." value={noteForm.observations} onChange={e => setNoteForm(p => ({ ...p, observations: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Assessment & Plan</label>
                <textarea className={`${inputClass} min-h-[70px] resize-none`} placeholder="Diagnosis, treatment plan..." value={noteForm.plan} onChange={e => setNoteForm(p => ({ ...p, plan: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Follow-up Date</label>
                <input type="date" className={inputClass} value={noteForm.followUp} onChange={e => setNoteForm(p => ({ ...p, followUp: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ========== STEP 3: FORM — LAB REPORT ========== */}
          {step === 'form' && recordType === 'lab' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Test Name *</label>
                  <input className={inputClass} placeholder="e.g. Complete Blood Count" value={labForm.testName} onChange={e => setLabForm(p => ({ ...p, testName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Lab Name</label>
                  <input className={inputClass} placeholder="e.g. Metro City Lab" value={labForm.labName} onChange={e => setLabForm(p => ({ ...p, labName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Doctor</label>
                  <input className={inputClass} placeholder="e.g. Dr. Sarah Chen" value={labForm.doctor} onChange={e => setLabForm(p => ({ ...p, doctor: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" className={inputClass} value={labForm.date} onChange={e => setLabForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={labForm.status} onChange={e => setLabForm(p => ({ ...p, status: e.target.value as any }))}>
                    <option value="Normal">Normal</option>
                    <option value="Flagged">Flagged</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>Test Results</label>
                  <button onClick={addLabResult} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-sm">add</span>Add Row
                  </button>
                </div>
                <div className="space-y-2">
                  {labForm.results.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                      <input className={inputClass} placeholder="Metric" value={r.key} onChange={e => updateLabResult(idx, 'key', e.target.value)} />
                      <input className={inputClass} placeholder="Value" value={r.value} onChange={e => updateLabResult(idx, 'value', e.target.value)} />
                      <input className={inputClass} placeholder="Unit" value={r.unit} onChange={e => updateLabResult(idx, 'unit', e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3 rounded-b-3xl shrink-0">
          <button type="button" onClick={handleClose} disabled={isUploading} className="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors">
            Cancel
          </button>
          {step === 'upload' && (
            <button
              type="button" onClick={handleUpload} disabled={!file || isUploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:grayscale"
              style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              {isUploading ? 'Scanning...' : 'Upload & Scan'}
            </button>
          )}
          {step === 'form' && (
            <button
              type="button"
              onClick={recordType === 'prescription' ? submitPrescription : recordType === 'notes' ? submitNote : submitLab}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Save Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
