'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddRecordModal from '@/components/AddRecordModal';
import ReviewMedicationModal from '@/components/ReviewMedicationModal';
import { offlineStorage } from '@/lib/offline-storage';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_MEDICATIONS = [
  { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', time: '8:00 AM (Morning)', status: 'TAKEN', color: '#d4f0fa', icon: 'pill', isError: false },
  { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '1:00 PM (Afternoon)', status: 'UPCOMING', color: '#d4f0fa', icon: 'pill', isError: false },
  { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', time: '9:00 PM (Night)', status: 'UPCOMING', color: '#e8def8', icon: 'medication', isError: false },
  { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'Once daily', time: '8:00 AM (Morning)', status: 'MISSED', color: '#ffe082', icon: 'pill', isError: true },
];

const DEFAULT_LAB_DISCLAIMER = 'This is an AI explanation of the uploaded scan and is not a diagnosis. Confirm these results with a qualified clinician.';

const normalizeLabStatus = (status?: string) => {
  const normalized = String(status || 'unknown').toLowerCase();
  if (['high', 'low', 'normal'].includes(normalized)) return normalized;
  return 'unknown';
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r?\n/g, ' ');

const wrapPdfLine = (value: string, limit = 92) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
};

const createPdfBlob = (title: string, lines: string[]) => {
  const pageLines = lines.flatMap((line) => wrapPdfLine(line));
  const pages: string[][] = [];
  for (let i = 0; i < pageLines.length; i += 46) {
    pages.push(pageLines.slice(i, i + 46));
  }
  if (pages.length === 0) pages.push([title]);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const pageObjectRefs: number[] = [];
  const contentObjectRefs: number[] = [];

  const catalogRef = addObject(''); // filled after pages object exists
  const pagesRef = addObject(''); // filled after page refs exist
  const fontRef = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  pages.forEach((page) => {
    const streamLines = page.map((line) => `(${escapePdfText(line)}) Tj T*`).join('\n');
    const stream = `BT /F1 10 Tf 50 790 Td 14 TL\n${streamLines}\nET`;
    const contentRef = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageRef = addObject(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${contentRef} 0 R >>`);
    contentObjectRefs.push(contentRef);
    pageObjectRefs.push(pageRef);
  });

  objects[catalogRef - 1] = `<< /Type /Catalog /Pages ${pagesRef} 0 R >>`;
  objects[pagesRef - 1] = `<< /Type /Pages /Kids [${pageObjectRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageObjectRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export default function HealthRecordsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('medications');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [extractedMedications, setExtractedMedications] = useState<any[]>([]);
  const [activeMedications, setActiveMedications] = useState<any[]>([]);
  const [reviewingMedication, setReviewingMedication] = useState<any>(null);
  const [reviewIndex, setReviewIndex] = useState<number>(-1);
  const [userPrescriptions, setUserPrescriptions] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [userLabReports, setUserLabReports] = useState<any[]>([]);
  const [refillStatus, setRefillStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('demo-patient-001');
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check logged-in user and fetch user-scoped data from Supabase
    const loadSupabaseData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);

          // Fetch user-scoped medications
          const { data: dbMeds } = await supabase.from('medications').select('*').eq('patient_id', user.id);
          if (dbMeds && dbMeds.length > 0) {
            const mapped = dbMeds.map((m: any) => ({
              id: m.id,
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency || 'Once daily',
              time: m.time || 'Morning',
              status: m.status || 'UPCOMING',
              color: '#d4f0fa',
              icon: 'pill',
              isError: false,
            }));
            setActiveMedications(mapped);
            offlineStorage.saveMedications(mapped, user.id);
          } else {
            // Check offline storage for this specific user
            const cachedMeds = offlineStorage.getMedications(user.id);
            setActiveMedications(cachedMeds || []);
          }

          // Fetch user-scoped prescriptions
          const { data: dbRx } = await supabase.from('prescriptions').select('*').eq('patient_id', user.id);
          setUserPrescriptions(dbRx || []);

          // Fetch user-scoped doctor notes
          const { data: dbNotes } = await supabase.from('doctor_notes').select('*').eq('patient_id', user.id);
          setUserNotes(dbNotes || []);

          // Fetch user-scoped lab reports
          const { data: dbLabs } = await supabase.from('lab_results').select('*').eq('patient_id', user.id);
          const mappedDbLabs = (dbLabs || []).map((lab: any) => ({
            ...lab,
            testName: lab.testName || lab.test_name || 'Laboratory Investigation Report',
            labName: lab.labName || lab.lab_name || '',
            clinicalInsights: lab.clinicalInsights || null,
            rawText: lab.rawText || '',
            results: Array.isArray(lab.results) ? lab.results : [],
          }));
          const cachedLabReports = offlineStorage.getLabReports();
          setUserLabReports([
            ...cachedLabReports,
            ...mappedDbLabs.filter((dbLab: any) => !cachedLabReports.some((cached: any) =>
              cached.testName === dbLab.testName && cached.date === dbLab.date
            )),
          ]);
        } else {
          // Unauthenticated demo fallback
          const cachedMeds = offlineStorage.getMedications();
          setActiveMedications(cachedMeds.length > 0 ? cachedMeds : DEFAULT_MEDICATIONS);
          const cachedLabReports = offlineStorage.getLabReports();
          if (cachedLabReports.length > 0) setUserLabReports(cachedLabReports);
        }
      } catch (e) {
        console.warn('Could not load records from Supabase:', e);
      }
    };
    loadSupabaseData();

    if (!offlineStorage.isOnline()) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      const pending = offlineStorage.getPendingSyncs();
      if (pending.length > 0) {
        offlineStorage.clearPendingSyncs();
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dynamic summary stats
  const takenCount = activeMedications.filter(m => m.status === 'TAKEN').length;
  const adherencePercentage = activeMedications.length > 0 
    ? Math.round((takenCount / activeMedications.length) * 100) 
    : 100;
  const nextDoseMed = activeMedications.find(m => m.status === 'UPCOMING');

  const handleExportPDF = () => {
    const lines = [
      'CuraTrack Medical History & Health Records Export',
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      'Active Medications',
      ...(activeMedications.length > 0
        ? activeMedications.map(m => `- ${m.name} (${m.dosage}) - Status: ${m.status}`)
        : ['- None']),
      '',
      `Prescriptions: ${userPrescriptions.length}`,
      `Doctor Notes: ${userNotes.length}`,
      `Lab Reports: ${userLabReports.length}`,
      '',
      'Recent Lab Reports',
      ...(userLabReports.length > 0
        ? userLabReports.map(lab => `- ${lab.testName || 'Lab Report'} - ${lab.status || 'Unknown'} - ${lab.date || 'No date'}`)
        : ['- None']),
    ];

    const blob = createPdfBlob('CuraTrack Medical History Export', lines);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CuraTrack_Medical_Report_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRequestRefill = (medName?: string) => {
    const target = medName || 'Lisinopril 10mg';
    setRefillStatus(`Refill request for ${target} submitted to pharmacy.`);
    alert(`💊 Refill request for ${target} has been sent to your preferred pharmacy!`);
  };

  const handleToggleMedicationStatus = (index: number) => {
    setActiveMedications(prev => {
      const updated = prev.map((med, idx) => {
        if (idx !== index) return med;
        const nextStatus: 'TAKEN' | 'MISSED' | 'UPCOMING' = 
          med.status === 'TAKEN' ? 'MISSED' : med.status === 'MISSED' ? 'UPCOMING' : 'TAKEN';
        return {
          ...med,
          status: nextStatus,
          isError: nextStatus === 'MISSED'
        };
      });

      offlineStorage.saveMedications(updated);
      return updated;
    });
  };

  const handleDownloadReport = (lab: any) => {
    const insights = getLabInsights(lab);
    const reportTitle = lab?.testName || 'Lab Report';
    const results = lab?.results || [];
    const abnormalResults = (lab?.results || []).filter((result: any) => {
      const status = normalizeLabStatus(result.status);
      return status === 'high' || status === 'low';
    });
    const digitalScanText = String(lab?.rawText || '').trim();
    const digitalScanLines = digitalScanText
      ? digitalScanText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [
          'No OCR transcript was stored for this report.',
          'The structured digital values below were extracted from the uploaded scan.',
        ];

    const lines = [
      'CuraTrack Digital Lab Report',
      `Report: ${reportTitle}`,
      `Date: ${lab?.date || new Date().toLocaleDateString()}`,
      `Lab: ${lab?.labName || 'Unknown Lab'}`,
      `Doctor: ${lab?.doctor || 'Unknown Doctor'}`,
      `Overall status: ${lab?.status || 'Unknown'}`,
      '',
      'Digital version of uploaded scan',
      'This section is the text CuraTrack read from your uploaded medical scan using OCR.',
      ...digitalScanLines,
      '',
      'Structured digital lab values',
      ...(results.length > 0
        ? results.map((result: any) => {
            const status = normalizeLabStatus(result.status);
            const label = status === 'unknown' ? 'STATUS NOT FOUND' : status.toUpperCase();
            return `- ${result.key || 'Metric'} | Value: ${result.value || '-'} ${result.unit || ''} | ${label}`;
          })
        : ['No structured lab values were extracted from the scan.']),
      '',
      'Doctor-perspective analysis',
      'If I were reviewing this report with you in clinic, this is how I would frame the findings based on the scan alone:',
      insights.plain_language_summary || 'No summary available.',
      '',
      'Clinical findings',
      ...(insights.key_findings || []).map((finding: any) =>
        `- ${finding.title || 'Finding'} (${finding.severity || 'unknown'}): ${finding.explanation || ''}`
      ),
      '',
      'Interpretation',
      insights.possible_meaning || 'Not enough context was available in the scan to explain the result fully.',
      '',
      'Recommended actions',
      ...(insights.recommended_next_steps || []).map((stepText: string) => `- ${stepText}`),
      '',
      'Suggested follow-up questions for your doctor',
      ...(insights.questions_for_doctor || []).map((question: string) => `- ${question}`),
      '',
      abnormalResults.length > 0
        ? `Attention: ${abnormalResults.length} extracted value${abnormalResults.length === 1 ? '' : 's'} appeared high or low in the scan.`
        : 'No high/low status was extracted from the scan.',
      ...(insights.urgent_warning_signs?.length > 0
        ? [
            '',
            'Urgent warning signs',
            ...(insights.urgent_warning_signs || []).map((warning: string) => `- ${warning}`),
          ]
        : []),
      '',
      insights.disclaimer || DEFAULT_LAB_DISCLAIMER,
      `Generated: ${new Date().toLocaleString()}`,
    ];

    const blob = createPdfBlob(reportTitle, lines);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '_')}_Analysis.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMessageDoctor = (doctorName: string) => {
    router.push(`/telemedicine?doctor=${encodeURIComponent(doctorName)}`);
  };

  const handleRecordAdded = async (data: any) => {
    const supabase = createClient();

    // Handle new structured record types
    if (data && data.type === 'prescription') {
      const rxItems = Array.isArray(data.data) ? data.data : [data.data];
      setUserPrescriptions(prev => [...rxItems, ...prev]);

      const newActiveMeds = rxItems.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency || 'Once daily',
        time: m.time || 'Morning',
        status: 'UPCOMING',
        color: '#d4f0fa',
        icon: 'pill',
        isError: false,
      }));
      setActiveMedications(prev => {
        const updated = [...newActiveMeds, ...prev];
        offlineStorage.saveMedications(updated, userId);
        return updated;
      });

      // Persist to Supabase
      try {
        await supabase.from('prescriptions').insert(
          rxItems.map((m: any) => ({
            patient_id: userId,
            medication: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            doctor_name: m.doctor,
            date: m.date,
            instructions: m.instructions,
          }))
        );
        await supabase.from('medications').insert(
          rxItems.map((m: any) => ({
            patient_id: userId,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            time: m.time,
            reason: m.instructions,
            source: 'ocr_record',
            active: true,
          }))
        );
      } catch (err) {
        console.warn('Failed to insert prescription to Supabase:', err);
      }

      setActiveTab('prescriptions');
      return;
    }
    if (data && data.type === 'notes') {
      setUserNotes(prev => [data.data, ...prev]);
      try {
        await supabase.from('doctor_notes').insert({
          patient_id: userId,
          doctor: data.data.doctor,
          specialty: data.data.specialty,
          date: data.data.date,
          visit_type: data.data.visitType,
          complaint: data.data.complaint,
          observations: data.data.observations,
          plan: data.data.plan,
          follow_up: data.data.followUp,
          summary: data.data.complaint || data.data.observations,
          source: 'ocr_record',
        });
      } catch (err) {
        console.warn('Failed to insert doctor note to Supabase:', err);
      }
      setActiveTab('notes');
      return;
    }
    if (data && data.type === 'lab') {
      setUserLabReports(prev => {
        const updated = [data.data, ...prev];
        offlineStorage.saveLabReports(updated);
        return updated;
      });
      try {
        await supabase.from('lab_results').insert({
          patient_id: userId,
          test_name: data.data.testName,
          lab_name: data.data.labName,
          doctor: data.data.doctor,
          date: data.data.date,
          status: data.data.status,
          results: data.data.results,
          source: 'ocr_record',
        });
      } catch (err) {
        console.warn('Failed to insert lab result to Supabase:', err);
      }
      setActiveTab('lab');
      setOpenSections({ 'user-lab-0': true });
      return;
    }
  };

  const startReview = (med: any, index: number) => {
    setReviewingMedication(med);
    setReviewIndex(index);
    setIsReviewModalOpen(true);
  };

  const handleReviewConfirm = (updatedMed: any) => {
    // Add to active medications
    setActiveMedications(prev => {
      const updated = [...prev, {
          ...updatedMed,
          status: 'UPCOMING', // Default status for new confirms
          color: '#d4f0fa',
          icon: 'pill'
      }];
      offlineStorage.saveMedications(updated);
      return updated;
    });
    
    // Remove the item from the extracted list
    setExtractedMedications(prev => prev.filter((_, i) => i !== reviewIndex));
    setReviewingMedication(null);
    setReviewIndex(-1);
    setActiveTab('medications'); // Switch to medications tab to see the result
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getLabInsights = (lab: any) => {
    const aiInsights = lab?.clinicalInsights;
    const hasAiInsights = Boolean(
      aiInsights?.plain_language_summary ||
      aiInsights?.possible_meaning ||
      aiInsights?.key_findings?.length ||
      aiInsights?.recommended_next_steps?.length ||
      aiInsights?.questions_for_doctor?.length ||
      aiInsights?.urgent_warning_signs?.length
    );

    if (hasAiInsights) return aiInsights;

    const results = lab?.results || [];
    const resultNames = results.map((r: any) => r.key).filter(Boolean);
    const abnormalResults = results.filter((r: any) => {
      const status = normalizeLabStatus(r.status);
      return status === 'high' || status === 'low';
    });
    const normalResults = results.filter((r: any) => normalizeLabStatus(r.status) === 'normal');
    const flagged = lab?.status === 'Flagged' || abnormalResults.length > 0;
    const abnormalSummary = abnormalResults
      .map((r: any) => `${r.key || 'A result'} is ${normalizeLabStatus(r.status)} at ${r.value || '-'} ${r.unit || ''}`.trim())
      .join('; ');

    return {
      plain_language_summary: flagged
        ? `I found ${abnormalResults.length || 'one or more'} result${abnormalResults.length === 1 ? '' : 's'} that appear outside the expected range. ${abnormalSummary || 'The report is marked as flagged.'}`
        : `I reviewed the extracted values from this scan. ${normalResults.length > 0 ? `${normalResults.length} result${normalResults.length === 1 ? '' : 's'} were marked normal. ` : ''}No high or low value was extracted, but the result still needs clinical context.`,
      key_findings: abnormalResults.length > 0
        ? abnormalResults.map((result: any) => {
            const status = normalizeLabStatus(result.status);
            return {
              title: `${result.key || 'Lab value'} is ${status}`,
              explanation: `${result.key || 'This value'} was read as ${result.value || '-'} ${result.unit || ''}. A ${status} result can be temporary, lab-specific, or related to diet, hydration, medicines, infection, chronic disease, or the reason your doctor ordered the test.`,
              severity: status === 'high' || status === 'low' ? 'watch' : 'unknown',
              related_tests: [result.key || 'Lab value'],
            };
          })
        : [
            {
              title: flagged ? 'Flagged lab report' : 'No high/low value extracted',
              explanation: flagged
                ? 'The report is marked as flagged, but CuraTrack could not identify exactly which extracted row was high or low. Compare each value with the reference range printed on the original scan.'
                : 'The scan did not provide an obvious abnormal marker that CuraTrack could identify. Normal-looking values can still matter when symptoms are present.',
              severity: flagged ? 'watch' : 'normal',
              related_tests: resultNames.slice(0, 5),
            },
          ],
      possible_meaning: flagged
        ? 'An out-of-range lab value is a signal to interpret the result, not a diagnosis by itself. The next step is to match it with your symptoms, previous reports, medications, and the lab reference range.'
        : 'These values can be useful as a baseline for future comparison, especially if your doctor is tracking a condition over time.',
      recommended_next_steps: flagged
        ? [
            'Book a review with your doctor or the doctor who ordered the test, especially if this is new or worsening.',
            'Compare the flagged value with the lab reference range printed on the report.',
            'Check whether you have older reports to see if this is a trend or a one-time change.',
            'Do not start or stop medication based only on this scan.',
          ]
        : [
            'Keep this report saved for trend comparison.',
            'Discuss it during your next visit if symptoms continue or if this was part of ongoing monitoring.',
          ],
      questions_for_doctor: flagged
        ? [
            'Which value is outside range, and how serious is it for me?',
            'Do I need a repeat test or another related test?',
            'Could my medicines, diet, or recent illness affect this result?',
          ]
        : [
            'Are these values appropriate for my age and medical history?',
            'When should I repeat this test?',
          ],
      urgent_warning_signs: flagged
        ? ['Seek urgent care if you have severe chest pain, fainting, severe breathlessness, confusion, heavy bleeding, or rapidly worsening symptoms.']
        : [],
      disclaimer: DEFAULT_LAB_DISCLAIMER,
    };
  };

  const severityClass = (severity?: string) => {
    switch (severity) {
      case 'urgent':
        return 'bg-error-container text-on-error-container border-error/20';
      case 'concerning':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'watch':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'normal':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      default:
        return 'bg-surface-container-low text-on-surface-variant border-outline-variant/20';
    }
  };

  const renderLabInsights = (lab: any) => {
    const insights = getLabInsights(lab);

    return (
      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">stethoscope</span>
          </div>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Doctor-style scan insights</p>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{insights.plain_language_summary}</p>
          </div>
        </div>

        {insights.key_findings?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.key_findings.map((finding: any, idx: number) => (
              <div key={idx} className={`rounded-xl border p-4 ${severityClass(finding.severity)}`}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-bold">{finding.title || `Finding ${idx + 1}`}</p>
                  <span className="px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-black uppercase tracking-wider">{finding.severity || 'unknown'}</span>
                </div>
                {finding.explanation && <p className="text-xs leading-relaxed opacity-90">{finding.explanation}</p>}
                {finding.related_tests?.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-2">Related: {finding.related_tests.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {insights.possible_meaning && (
          <div>
            <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">What this may mean</p>
            <p className="text-sm text-on-surface-variant leading-relaxed">{insights.possible_meaning}</p>
          </div>
        )}

        {insights.recommended_next_steps?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-2">Suggested actions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {insights.recommended_next_steps.map((stepText: string, idx: number) => (
                <div key={idx} className="flex gap-2 rounded-xl bg-white/70 p-3 text-xs text-on-surface-variant leading-relaxed">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                  <span>{stepText}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.questions_for_doctor?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-2">Ask your doctor</p>
            <div className="space-y-2">
              {insights.questions_for_doctor.map((question: string, idx: number) => (
                <div key={idx} className="flex gap-2 text-xs text-on-surface-variant leading-relaxed">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">help</span>
                  <span>{question}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.urgent_warning_signs?.length > 0 && (
          <div className="rounded-xl border border-error/20 bg-error-container/40 p-3">
            <p className="text-[10px] font-bold text-on-error-container uppercase tracking-widest mb-2">Seek urgent care if you notice</p>
            <ul className="space-y-1.5">
              {insights.urgent_warning_signs.map((warning: string, idx: number) => (
                <li key={idx} className="flex gap-2 text-xs text-on-error-container leading-relaxed">
                  <span className="material-symbols-outlined text-error text-sm mt-0.5">emergency_home</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-tertiary leading-relaxed border-t border-primary/10 pt-3">{insights.disclaimer || DEFAULT_LAB_DISCLAIMER}</p>
      </div>
    );
  };

  return (
    <div className="flex-1 p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
          <span className="material-symbols-outlined text-amber-600">wifi_off</span>
          <span>Offline Mode • Medication tracking and health records are saved locally</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-full uppercase tracking-widest mb-3">Medical History</span>
          <h2 className="font-headline text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-none">Health Records</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-xl">download</span> Export PDF
          </button>
          <button onClick={() => setIsAddRecordModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}>
            <span className="material-symbols-outlined text-xl fill-icon">add_circle</span> Add Record
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 bg-surface-container-low p-1.5 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('medications')} className={`${activeTab === 'medications' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">medication</span>Medications
        </button>
        <button onClick={() => setActiveTab('lab')} className={`${activeTab === 'lab' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">biotech</span>Lab Results
        </button>
        <button onClick={() => setActiveTab('notes')} className={`${activeTab === 'notes' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">description</span>Doctor's Notes
        </button>
        <button onClick={() => setActiveTab('prescriptions')} className={`${activeTab === 'prescriptions' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
          <span className="material-symbols-outlined text-base">receipt_long</span>Prescriptions
        </button>
      </div>

      {/* ===== MEDICATIONS SECTION ===== */}
      {activeTab === 'medications' && (
        <div className="space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Active</p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">{activeMedications.length}</p>
              <p className="text-xs text-tertiary mt-1">Medications</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Next Dose</p>
              <p className="font-headline text-3xl font-extrabold text-primary">{nextDoseMed ? nextDoseMed.time.split(' ')[0] : 'None'}</p>
              <p className="text-xs text-tertiary mt-1">{nextDoseMed ? `${nextDoseMed.name} · ${nextDoseMed.dosage}` : 'All complete'}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Adherence</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">{adherencePercentage}%</p>
              <p className="text-xs text-tertiary mt-1">This month</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Refill Due</p>
              <p className="font-headline text-3xl font-extrabold text-error">{activeMedications.length > 0 ? '7d' : 'None'}</p>
              <p className="text-xs text-tertiary mt-1">{activeMedications.length > 0 ? 'Days remaining' : 'No active refills'}</p>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Today's Medication Schedule</h3>
              <span suppressHydrationWarning className="text-xs font-bold text-tertiary uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="space-y-4">
              {activeMedications.length === 0 ? (
                <div className="text-center py-8 text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">medication</span>
                  <p className="font-semibold text-sm">No active medications added yet.</p>
                  <p className="text-xs mt-1">Click "Add Record" above to upload or log your medications.</p>
                </div>
              ) : (
                activeMedications.map((med, idx) => (
                  <div key={`active-${idx}`} className={`flex items-center gap-5 p-4 ${med.isError ? 'bg-error-container/40' : 'bg-surface-container-low'} rounded-2xl group hover:bg-surface-container transition-colors`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${med.isError ? 'bg-error-container' : ''}`} style={!med.isError ? { background: med.color } : {}}>
                      <span className={`material-symbols-outlined fill-icon ${med.isError ? 'text-error' : 'text-primary'}`}>
                        {(!med.icon || med.icon === 'capsule') ? 'pill' : med.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-headline font-bold text-on-surface">{med.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          med.status === 'TAKEN' ? 'status-badge-stable' : 
                          med.status === 'MISSED' ? 'status-badge-urgent' : 
                          'status-badge-pending'
                        }`}>{med.status}</span>
                      </div>
                      <p className="text-sm text-tertiary">{med.dosage} · {med.frequency} · {med.time}</p>
                      <div className="progress-bar mt-3 w-40" style={med.isError ? { background: '#ffdad6' } : {}}>
                        <div className={med.isError ? "" : "progress-fill"} style={med.isError ? { width: '0%', height: '100%', borderRadius: '9999px', background: '#ba1a1a' } : { width: med.status === 'TAKEN' ? '100%' : '0%' }}></div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleMedicationStatus(idx)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        med.status === 'TAKEN' 
                          ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' 
                          : med.status === 'MISSED' 
                          ? 'bg-error-container text-on-error-container hover:bg-error/20' 
                          : 'text-white'
                      }`}
                      style={med.status === 'UPCOMING' ? { background: 'linear-gradient(135deg, #00647e, #2c7d99)' } : {}}
                    >
                      {med.status === 'TAKEN' ? '✓ Taken' : med.status === 'MISSED' ? 'Mark Taken' : 'Mark Taken'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adherence chart + Refill tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly adherence */}
            <div className="section-card p-6">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Weekly Adherence</h3>
              <div className="flex items-end gap-3 h-28">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <div key={day} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className="w-full rounded-lg" 
                      style={{ 
                        height: activeMedications.length > 0 ? `${(80 + (idx * 3) % 20)}%` : '15%', 
                        background: activeMedications.length > 0 ? 'linear-gradient(180deg,#00647e,#2c7d99)' : '#edeeef',
                        opacity: activeMedications.length > 0 ? 1 : 0.4 
                      }}
                    ></div>
                    <span className="text-[10px] font-bold text-tertiary">{day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: '#00647e' }}></div><span className="text-xs text-tertiary">Taken</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-error-container"></div><span className="text-xs text-tertiary">Missed</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-surface-container-high"></div><span className="text-xs text-tertiary">Upcoming</span></div>
              </div>
            </div>
            {/* Refill tracker */}
            <div className="section-card p-6">
              <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Refill Tracker</h3>
              <div className="space-y-4">
                {activeMedications.length === 0 ? (
                  <div className="text-center py-6 text-tertiary">
                    <p className="text-sm font-semibold">No active medication refills tracked.</p>
                  </div>
                ) : (
                  activeMedications.map((med, idx) => (
                    <div key={`refill-${idx}`}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-bold text-on-surface">{med.name} {med.dosage}</span>
                        <span className="text-xs font-bold text-on-surface-variant">Active</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: med.status === 'TAKEN' ? '100%' : '50%' }}></div>
                      </div>
                    </div>
                  ))
                )}
                {activeMedications.length > 0 && (
                  <button 
                    onClick={() => handleRequestRefill()}
                    className="w-full mt-2 py-3 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm font-bold text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">local_pharmacy</span> Request Refill
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LAB RESULTS SECTION ===== */}
      {activeTab === 'lab' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Total Tests</p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">{userLabReports.length}</p>
              <p className="text-xs text-tertiary mt-1">Uploaded tests</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Normal</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">{userLabReports.filter(l => l.status === 'Normal').length}</p>
              <p className="text-xs text-tertiary mt-1">Results</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Flagged</p>
              <p className="font-headline text-3xl font-extrabold text-error">{userLabReports.filter(l => l.status === 'Flagged').length}</p>
              <p className="text-xs text-tertiary mt-1">Needs attention</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Pending</p>
              <p className="font-headline text-3xl font-extrabold text-primary">{userLabReports.filter(l => l.status === 'Pending').length}</p>
              <p className="text-xs text-tertiary mt-1">In progress</p>
            </div>
          </div>

          {/* Lab results list */}
          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Recent Lab Results</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-xl text-xs font-bold tab-active">All</button>
                <button className="px-3 py-1.5 rounded-xl text-xs font-bold tab-inactive hover:bg-surface-container">Flagged</button>
                <button className="px-3 py-1.5 rounded-xl text-xs font-bold tab-inactive hover:bg-surface-container">Normal</button>
              </div>
            </div>

            <div className="space-y-3">
              {userLabReports.length === 0 ? (
                <div className="text-center py-10 text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">biotech</span>
                  <p className="font-semibold text-sm">No lab results uploaded yet.</p>
                  <p className="text-xs mt-1">Upload a lab report PDF or prescription to automatically extract test values.</p>
                </div>
              ) : (
                userLabReports.map((lab, idx) => (
                  <div key={`user-lab-${idx}`} className="rounded-2xl overflow-hidden">
                    <button onClick={() => toggleSection(`user-lab-${idx}`)} className={`w-full flex items-center gap-4 p-5 ${lab.status === 'Flagged' ? 'bg-error-container/30 hover:bg-error-container/50' : 'bg-surface-container-low hover:bg-surface-container'} transition-colors text-left`}>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${lab.status === 'Flagged' ? 'bg-error-container' : 'bg-primary/10'}`}>
                        <span className={`material-symbols-outlined ${lab.status === 'Flagged' ? 'text-error' : 'text-primary'}`}>biotech</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-headline font-bold text-on-surface">{lab.testName}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lab.status === 'Flagged' ? 'status-badge-urgent' : lab.status === 'Pending' ? 'status-badge-pending' : 'status-badge-stable'}`}>{lab.status?.toUpperCase()}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                        </div>
                        <p className="text-xs text-tertiary">{lab.date} · {lab.labName || 'Unknown Lab'} · {lab.doctor || 'Unknown Doctor'}</p>
                      </div>
                      <span className={`material-symbols-outlined rotate-icon text-tertiary ${openSections[`user-lab-${idx}`] ? 'open' : ''}`}>expand_more</span>
                    </button>
                    <div className={`collapsible-content ${openSections[`user-lab-${idx}`] ? 'open' : ''}`}>
                      <div className="p-5 bg-surface-container-lowest border-t border-outline-variant/10 space-y-3">
                        {renderLabInsights(lab)}

                        {lab.results && lab.results.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {lab.results.map((r: any, ri: number) => (
                              <div key={ri} className="p-4 bg-surface-container-low rounded-xl text-center">
                                <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">{r.key}</p>
                                <p className="font-headline text-xl font-extrabold text-on-surface">{r.value}</p>
                                {r.unit && <p className="text-[10px] text-tertiary">{r.unit}</p>}
                                {normalizeLabStatus(r.status) !== 'unknown' && (
                                  <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    normalizeLabStatus(r.status) === 'normal'
                                      ? 'bg-secondary/10 text-secondary'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {normalizeLabStatus(r.status)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => handleDownloadReport(lab)}
                          className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-base">download</span> Download report (PDF)
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DOCTOR'S NOTES SECTION ===== */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main notes list */}
            <div className="lg:col-span-2 space-y-4">
              {userNotes.length === 0 ? (
                <div className="section-card p-10 text-center text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">description</span>
                  <p className="font-semibold text-sm">No doctor's notes recorded yet.</p>
                  <p className="text-xs mt-1">Uploaded clinical notes and consultation summaries will appear here.</p>
                </div>
              ) : (
                userNotes.map((note, idx) => (
                  <div key={`user-note-${idx}`} className="section-card overflow-hidden">
                    <div className="p-6 lg:p-8 border-b border-outline-variant/10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined fill-icon text-primary text-2xl">person</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-headline font-bold text-on-surface">{note.doctor}</p>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                            </div>
                            <p className="text-xs text-tertiary">{note.specialty || 'General'} · {note.date}</p>
                            {note.visitType && <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">{note.visitType.toUpperCase()}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8 space-y-5">
                      {note.complaint && (
                        <div>
                          <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Chief Complaint</p>
                          <p className="text-sm text-on-surface leading-relaxed">{note.complaint}</p>
                        </div>
                      )}
                      {note.observations && (
                        <div>
                          <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Clinical Observations</p>
                          <p className="text-sm text-on-surface leading-relaxed">{note.observations}</p>
                        </div>
                      )}
                      {note.plan && (
                        <div>
                          <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Assessment &amp; Plan</p>
                          <p className="text-sm text-on-surface leading-relaxed">{note.plan}</p>
                        </div>
                      )}
                      {note.followUp && (
                        <div className="p-4 bg-primary-fixed/40 rounded-xl">
                          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Follow-up</p>
                          <p className="text-sm text-on-surface font-semibold">Next appointment: {note.followUp}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right sidebar: doctors list & archive */}
            <div className="space-y-4">
              <div className="section-card p-6">
                <h3 className="font-headline text-base font-bold text-on-surface mb-4">Care Team</h3>
                {(() => {
                  const doctors = Array.from(new Set([
                    ...userNotes.map(n => n.doctor),
                    ...userPrescriptions.map(p => p.doctor),
                    ...userLabReports.map(l => l.doctor)
                  ].filter(Boolean)));

                  if (doctors.length === 0) {
                    return (
                      <p className="text-xs text-tertiary text-center py-4">No care team members linked yet.</p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {doctors.map((docName, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-xl">person</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{docName}</p>
                            <p className="text-xs text-tertiary">Physician</p>
                          </div>
                          <button onClick={() => handleMessageDoctor(docName)} className="ml-auto text-tertiary hover:text-primary"><span className="material-symbols-outlined text-xl">message</span></button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="section-card p-6">
                <h3 className="font-headline text-base font-bold text-on-surface mb-4">Notes Archive</h3>
                {userNotes.length === 0 ? (
                  <p className="text-xs text-tertiary text-center py-4">No notes archived.</p>
                ) : (
                  <div className="space-y-2">
                    {userNotes.map((note, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-tertiary text-lg">description</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{note.doctor} - Note</p>
                          <p className="text-[10px] text-tertiary">{note.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRESCRIPTIONS SECTION ===== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Active Rx</p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">{userPrescriptions.length + extractedMedications.length}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Renewed</p>
              <p className="font-headline text-3xl font-extrabold text-secondary">0</p>
              <p className="text-xs text-tertiary mt-1">This month</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Expired</p>
              <p className="font-headline text-3xl font-extrabold text-error">0</p>
            </div>
            <div className="section-card p-5">
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Refills Left</p>
              <p className="font-headline text-3xl font-extrabold text-primary">0</p>
            </div>
          </div>

          <div className="section-card p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold text-on-surface">Active Prescriptions</h3>
            </div>

            <div className="space-y-4">
              {userPrescriptions.length === 0 && extractedMedications.length === 0 ? (
                <div className="text-center py-10 text-tertiary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                  <p className="font-semibold text-sm">No active prescriptions logged yet.</p>
                  <p className="text-xs mt-1">Click "Add Record" above to upload a prescription PDF or image.</p>
                </div>
              ) : (
                <>
                  {userPrescriptions.map((rx, idx) => (
                    <div key={`user-rx-${idx}`} className="p-6 bg-primary-container/20 border border-primary/20 rounded-2xl hover:bg-primary-container/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}>
                            <span className="material-symbols-outlined fill-icon text-white text-2xl">medication</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-headline font-bold text-on-surface text-lg">{rx.name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">ACTIVE</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                            </div>
                            <p className="text-sm text-tertiary mb-3">{rx.dosage} · {rx.frequency || 'As directed'} · {rx.date}</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                              {rx.doctor && (
                                <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                                  <span className="text-tertiary">Prescribed by: </span><span className="font-bold text-on-surface">{rx.doctor}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {extractedMedications.map((med, idx) => (
                    <div key={`extracted-${idx}`} className="p-6 bg-primary-container/20 border border-primary/20 rounded-2xl hover:bg-primary-container/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}>
                            <span className="material-symbols-outlined fill-icon text-white text-2xl">medication</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-headline font-bold text-on-surface text-lg">{med.name || "Unknown Medication"}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable bg-primary/10 text-primary">NEW (EXTRACTED)</span>
                            </div>
                            <p className="text-sm text-tertiary mb-3">{med.dosage || "N/A"} · {med.frequency || "N/A"} · {med.time || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => startReview(med, idx)}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" 
                            style={{ background: 'linear-gradient(135deg,#00647e,#2c7d99)' }}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <AddRecordModal 
        isOpen={isAddRecordModalOpen} 
        onClose={() => setIsAddRecordModalOpen(false)} 
        onSuccess={handleRecordAdded} 
      />

      {reviewingMedication && (
        <ReviewMedicationModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewingMedication(null);
          }}
          medication={reviewingMedication}
          onConfirm={handleReviewConfirm}
        />
      )}
    </div>
  );
}
