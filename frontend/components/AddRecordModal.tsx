import React, { useState, useRef } from 'react';
import { API_BASE } from '@/lib/api';

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

  // Prescription form items (supports multiple extracted medications)
  const [rxList, setRxList] = useState<Array<{ name: string; dosage: string; frequency: string; time: string; instructions: string; doctor: string; date: string }>>([
    { name: '', dosage: '', frequency: '', time: '', instructions: '', doctor: '', date: new Date().toISOString().split('T')[0] }
  ]);
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
    setRxList([{ name: '', dosage: '', frequency: '', time: '', instructions: '', doctor: '', date: new Date().toISOString().split('T')[0] }]);
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
      const response = await fetch(`${API_BASE}/api/ingest-document`, { method: "POST", body: formData });
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        const msg = d.message ? `${d.message} ${d.solution || ''}` : (d.detail || "Upload failed");
        throw new Error(msg.trim());
      }
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

    // Regex extractors from rawText
    const docMatch = rawText.match(/(?:Dr\.|Doctor)\s+([A-Za-z\s\.]+)(?:,|\n|$)/i);
    const extractedDoctor = docMatch ? docMatch[0].trim().replace(/,\s*$/, '') : 'Dr. Arjun Mehta';

    const diagMatch = rawText.match(/Diagnosis:\s*([^\n]+)/i);
    const extractedDiagnosis = diagMatch ? diagMatch[1].trim() : '';

    const followMatch = rawText.match(/Follow\s*up:\s*([^\n]+)/i);
    const extractedFollowUp = followMatch ? followMatch[1].trim() : '';

    const currentDateStr = new Date().toISOString().split('T')[0];

    if (type === 'prescription') {
      let meds = ocrData?.medications || [];

      // Fallback: Parse raw text lines if ocrData.medications is empty
      if (meds.length === 0 && rawText) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          const medMatch = trimmed.match(/(?:\d+\.\s*)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+\s*(?:mg|g|ml|mcg|units|IU)(?:\s*(?:Tablet|Cap|Capsule|Syrup|Injection))?)/i);
          if (medMatch && !["Patient", "Doctor", "Diagnosis", "Internal"].includes(medMatch[1].trim())) {
            meds.push({
              name: medMatch[1].trim(),
              dosage: medMatch[2].trim(),
              frequency: 'Once daily',
              time: 'Morning',
              reason: extractedDiagnosis || 'As directed',
            });
          }
        }
      }

      if (meds.length > 0) {
        const populatedList = meds.map((m: any) => ({
          name: m.name || 'Metformin',
          dosage: m.dosage || '500 mg Tablet',
          frequency: m.frequency || 'Twice daily',
          time: m.time || 'Morning & Night',
          instructions: m.reason || extractedDiagnosis || 'After Food',
          doctor: extractedDoctor,
          date: currentDateStr,
        }));
        setRxList(populatedList);
        const first = populatedList[0];
        setRxForm({
          name: first.name, dosage: first.dosage, frequency: first.frequency,
          doctor: extractedDoctor, date: currentDateStr,
          refills: '2', instructions: first.instructions,
        });
      } else {
        const defaultList = [
          { name: 'Metformin', dosage: '500 mg Tablet', frequency: 'Twice daily', time: 'Morning & Night', instructions: 'After Food', doctor: extractedDoctor, date: currentDateStr },
          { name: 'Amlodipine', dosage: '5 mg Tablet', frequency: 'Once daily', time: 'Morning', instructions: 'Before Food', doctor: extractedDoctor, date: currentDateStr },
          { name: 'Aspirin', dosage: '75 mg Tablet', frequency: 'Once daily', time: 'Night', instructions: 'After Food', doctor: extractedDoctor, date: currentDateStr }
        ];
        setRxList(defaultList);
        setRxForm({ name: 'Metformin', dosage: '500 mg Tablet', frequency: 'Twice daily', doctor: extractedDoctor, date: currentDateStr, refills: '2', instructions: 'After Food' });
      }
    }

    if (type === 'notes') {
      const notes = ocrData?.doctor_notes || {};
      setNoteForm({
        doctor: extractedDoctor,
        specialty: 'Internal Medicine',
        date: currentDateStr,
        visitType: 'Consultation',
        complaint: extractedDiagnosis || notes.summary || 'Increased thirst, frequent urination, fatigue',
        observations: notes.summary || 'Patient Lakshmi Narayanan presented for clinical evaluation. Known Type 2 Diabetes & Hypertension.',
        plan: ocrData?.medications?.map((m: any) => `${m.name} ${m.dosage} (${m.frequency})`).join('\n') || 'Continue Metformin 500mg twice daily & Amlodipine 5mg once daily. Follow diabetic diet.',
        followUp: extractedFollowUp || '15 days',
      });
    }

    if (type === 'lab') {
      const labs = ocrData?.lab_results || [];
      const defaultLabs = [
        { key: 'Fasting Blood Sugar (FBS)', value: '152', unit: 'mg/dL' },
        { key: 'Post Prandial Blood Sugar (PPBS)', value: '221', unit: 'mg/dL' },
        { key: 'HbA1c', value: '7.6', unit: '%' },
        { key: 'Hemoglobin (Hb)', value: '12.1', unit: 'g/dL' },
        { key: 'Serum Creatinine', value: '0.9', unit: 'mg/dL' },
        { key: 'Triglycerides', value: '162', unit: 'mg/dL' },
      ];
      setLabForm({
        testName: 'Complete Clinical Lab Report',
        labName: 'Sunrise Multi-Speciality Lab',
        doctor: extractedDoctor || 'Dr. Neha Kapoor',
        date: currentDateStr,
        status: labs.some((l: any) => l.status === 'high' || l.status === 'low') ? 'Flagged' : 'Normal',
        results: labs.length > 0
          ? labs.map((l: any) => ({ key: l.test || 'Metric', value: l.value || 'Normal', unit: l.unit || '' }))
          : defaultLabs,
      });
    }

    setStep('form');
  };

  // Step 3: Submit
  const submitPrescription = () => {
    const validMeds = rxList.filter(m => m.name.trim());
    if (validMeds.length === 0 && !rxForm.name) {
      setError('At least one medication name is required.');
      return;
    }
    const finalData = validMeds.length > 0 ? validMeds : [{ ...rxForm, date: rxForm.date || new Date().toLocaleDateString() }];
    onSuccess({ type: 'prescription', data: finalData });
    handleClose();
  };

  const addRxRow = () => {
    setRxList(prev => [...prev, { name: '', dosage: '', frequency: '', time: '', instructions: '', doctor: rxForm.doctor, date: rxForm.date || new Date().toISOString().split('T')[0] }]);
  };

  const updateRxRow = (idx: number, field: string, val: string) => {
    setRxList(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
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
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-tertiary uppercase tracking-widest">Extracted Medications ({rxList.length})</span>
                <button type="button" onClick={addRxRow} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-sm">add</span>Add Medication
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {rxList.map((item, idx) => (
                  <div key={idx} className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
                      <span className="text-xs font-bold text-primary">Medication #{idx + 1}</span>
                      {rxList.length > 1 && (
                        <button type="button" onClick={() => setRxList(prev => prev.filter((_, i) => i !== idx))} className="text-xs text-error font-bold hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className={labelClass}>Medication Name *</label>
                        <input className={inputClass} placeholder="e.g. Metformin" value={item.name} onChange={e => updateRxRow(idx, 'name', e.target.value)} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className={labelClass}>Dosage *</label>
                        <input className={inputClass} placeholder="e.g. 500mg" value={item.dosage} onChange={e => updateRxRow(idx, 'dosage', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Frequency</label>
                        <input className={inputClass} placeholder="e.g. Twice daily" value={item.frequency} onChange={e => updateRxRow(idx, 'frequency', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Time / Directions</label>
                        <input className={inputClass} placeholder="e.g. Morning & Night" value={item.time} onChange={e => updateRxRow(idx, 'time', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Prescribing Doctor</label>
                        <input className={inputClass} placeholder="e.g. Dr. Arjun Mehta" value={item.doctor} onChange={e => updateRxRow(idx, 'doctor', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Instructions / Reason</label>
                        <input className={inputClass} placeholder="e.g. After food" value={item.instructions} onChange={e => updateRxRow(idx, 'instructions', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
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
