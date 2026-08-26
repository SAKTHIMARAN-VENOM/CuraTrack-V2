'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AddRecordModal from '@/components/AddRecordModal';
import ReviewMedicationModal from '@/components/ReviewMedicationModal';
import { offlineStorage } from '@/lib/offline-storage';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import { API_BASE } from '@/lib/api';

interface RealPatientInfo {
  id: string;
  name: string;
  email?: string;
  age?: number | string;
  gender?: string;
  abhaId?: string;
  bloodGroup?: string;
  allergies?: string;
  latestStatus?: string;
  lastVisit?: string;
}

const DEFAULT_LAB_DISCLAIMER = 'This is an AI explanation of the uploaded scan and is not a diagnosis. Confirm these results with a qualified clinician.';

const normalizeLabStatus = (status?: string) => {
  const normalized = String(status || 'unknown').toLowerCase();
  if (['high', 'low', 'normal'].includes(normalized)) return normalized;
  return 'unknown';
};

const sanitizeTextForPdf = (value: string) => {
  if (!value) return '';
  return String(value)
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/₹/g, 'INR ')
    .replace(/[^\x20-\x7E]/g, ' ');
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapPdfLine = (value: string, limit = 85) => {
  const clean = sanitizeTextForPdf(value).trim();
  if (!clean) return [''];
  const words = clean.split(/\s+/).filter(Boolean);
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

const buildPdfBlob = (pages: string[][]): Blob => {
  const objects: string[] = [];

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(4 + i * 2);
  }
  objects.push(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  );

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  pages.forEach((pageLines, pageIdx) => {
    const pageObjId = 4 + pageIdx * 2;
    const contentObjId = pageObjId + 1;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );

    let stream = 'BT\n/F1 9 Tf\n12 TL\n45 745 Td\n';
    pageLines.forEach((l, idx) => {
      const escaped = escapePdfText(l);
      if (idx === 0) {
        stream += `(${escaped}) Tj\n`;
      } else {
        stream += `T* (${escaped}) Tj\n`;
      }
    });
    stream += 'ET';

    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const xrefOffsets: number[] = [0];

  objects.forEach((obj, idx) => {
    xrefOffsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    const off = String(xrefOffsets[i]).padStart(10, '0');
    pdf += `${off} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const createPdfBlob = (title: string, rawLines: string[]) => {
  const wrappedLines: string[] = [];

  if (title) {
    wrappedLines.push('================================================================================');
    wrappedLines.push(`  ${title.toUpperCase()}`);
    wrappedLines.push('================================================================================');
    wrappedLines.push('');
  }

  rawLines.forEach((line) => {
    if (!line || line.trim() === '') {
      wrappedLines.push('');
    } else {
      wrappedLines.push(...wrapPdfLine(line, 85));
    }
  });

  const LINES_PER_PAGE = 48;
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += LINES_PER_PAGE) {
    pages.push(wrappedLines.slice(i, i + LINES_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push(['CuraTrack Health Record', 'No data available.']);
  }

  return buildPdfBlob(pages);
};

function HealthRecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPatientId = searchParams.get('patientId');
  const { t } = useI18n();
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
  const [userId, setUserId] = useState<string>('');
  const [patientProfile, setPatientProfile] = useState<RealPatientInfo | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<string>('doctor');
  const [facilityArchiveTab, setFacilityArchiveTab] = useState<'dispenses' | 'edl_receipts' | 'labs' | 'waste_logs'>('dispenses');
  const [facilitySearchQuery, setFacilitySearchQuery] = useState<string>('');

  // Doctor Patient Selection States
  const [patients, setPatients] = useState<RealPatientInfo[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] = useState<RealPatientInfo | null>(null);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [loadingPatientData, setLoadingPatientData] = useState<boolean>(false);

  const getActivePatientInfo = (): RealPatientInfo => {
    if (selectedPatient) return selectedPatient;
    if (patientProfile) return patientProfile;

    let savedAuthUser: any = null;
    try {
      const raw = localStorage.getItem('curatrack_auth_user');
      if (raw) savedAuthUser = JSON.parse(raw);
    } catch {}

    return {
      id: userId || 'P-001',
      name: savedAuthUser?.name || 'Kavita Bai',
      email: savedAuthUser?.email || 'patient@curatrack.in',
      age: 28,
      gender: 'Female',
      bloodGroup: 'O+',
      abhaId: '91-4502-8819-0421',
      allergies: 'No Known Drug Allergies (NKDA)',
      latestStatus: 'Registered Patient',
      lastVisit: new Date().toLocaleDateString(),
    };
  };


  // Fetch real patients list from Supabase
  const fetchRealPatients = async () => {
    setLoadingPatients(true);
    try {
      const supabase = createClient();
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'doctor')
        .neq('role', 'facility_manager');

      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      const apptMap: Record<string, any> = {};
      if (appts) {
        for (const a of appts) {
          if (a.client_id && !apptMap[a.client_id]) {
            apptMap[a.client_id] = a;
          }
        }
      }

      if (profs && profs.length > 0) {
        const mappedPatients: RealPatientInfo[] = profs.map(p => {
          const appt = apptMap[p.id];
          return {
            id: p.id,
            name: p.name && p.name.trim().length > 0 ? p.name.trim() : (p.email ? p.email.split('@')[0] : 'Patient'),
            email: p.email,
            age: p.age || 32,
            gender: p.gender || 'Unspecified',
            bloodGroup: p.blood_group || 'O+',
            abhaId: p.abha_id || `91-4502-8819-${p.id.slice(0, 4)}`,
            allergies: p.allergies || 'No Known Drug Allergies (NKDA)',
            latestStatus: appt?.status === 'in-consult' ? 'In Consultation' : appt?.status === 'completed' ? 'Completed' : 'Registered Patient',
            lastVisit: appt?.date || (appt?.created_at ? new Date(appt.created_at).toLocaleDateString() : 'Recent'),
          };
        });
        setPatients(mappedPatients);
        return mappedPatients;
      }
      return [];
    } catch (err) {
      console.warn('Error fetching real patient list:', err);
      return [];
    } finally {
      setLoadingPatients(false);
    }
  };

  // Scoped Data Fetcher: Loads real records for a target patient
  const loadPatientData = async (targetId: string) => {
    if (!targetId) return;
    setLoadingPatientData(true);
    const supabase = createClient();

    try {
      // 0. Fetch patient demographic profile
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        let savedAuthUser: any = null;
        try {
          const raw = localStorage.getItem('curatrack_auth_user');
          if (raw) savedAuthUser = JSON.parse(raw);
        } catch {}

        const pName = prof?.name || (savedAuthUser?.id === targetId ? savedAuthUser?.name : null) || 'Kavita Bai';
        const pEmail = prof?.email || (savedAuthUser?.id === targetId ? savedAuthUser?.email : null) || 'patient@curatrack.in';
        const pAge = prof?.age || 28;
        const pGender = prof?.gender || 'Female';
        const pBlood = prof?.blood_group || 'O+';
        const pAbha = prof?.abha_id || `91-4502-8819-${targetId.slice(0, 4)}`;
        const pAllergies = prof?.allergies || 'No Known Drug Allergies (NKDA)';

        const loadedProf: RealPatientInfo = {
          id: targetId,
          name: pName,
          email: pEmail,
          age: pAge,
          gender: pGender,
          bloodGroup: pBlood,
          abhaId: pAbha,
          allergies: pAllergies,
          latestStatus: 'Registered Patient',
          lastVisit: new Date().toLocaleDateString(),
        };

        setPatientProfile(loadedProf);
        setSelectedPatient(loadedProf);
      } catch (profErr) {
        console.warn('Note loading patient profile info:', profErr);
      }

      // 1. Fetch medications
      const { data: dbMeds } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', targetId);

      if (dbMeds && dbMeds.length > 0) {
        const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const mapped = dbMeds.map((m: any) => {
          const actionDate = m.date_action || (m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : todayStr);
          const isNewDay = actionDate !== todayStr;
          const activeStatus = isNewDay ? 'UPCOMING' : (m.status || 'UPCOMING');
          return {
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency || 'Once daily',
            time: m.time || 'Morning',
            status: activeStatus,
            date_action: actionDate,
            historical_status: m.status || 'UPCOMING',
            color: '#d4f0fa',
            icon: 'pill',
            isError: activeStatus === 'MISSED',
          };
        });
        setActiveMedications(mapped);
      } else {
        setActiveMedications([]);
      }

      // 2. Fetch prescriptions
      const { data: dbRx } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', targetId)
        .order('created_at', { ascending: false });

      setUserPrescriptions(dbRx || []);

      // 3. Fetch doctor notes
      const { data: dbNotes } = await supabase
        .from('doctor_notes')
        .select('*')
        .eq('patient_id', targetId)
        .order('created_at', { ascending: false });

      setUserNotes(dbNotes || []);

      // 4. Fetch lab reports
      const { data: dbLabs } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', targetId)
        .order('created_at', { ascending: false });

      const mappedLabs = (dbLabs || []).map((lab: any) => ({
        ...lab,
        testName: lab.testName || lab.test_name || 'Laboratory Investigation Report',
        labName: lab.labName || lab.lab_name || '',
        clinicalInsights: lab.clinicalInsights || null,
        rawText: lab.rawText || '',
        results: Array.isArray(lab.results) ? lab.results : [],
      }));
      setUserLabReports(mappedLabs);


    } catch (err) {
      console.warn('Error loading patient records for target:', targetId, err);
    } finally {
      setLoadingPatientData(false);
    }
  };

  const handleSelectPatient = (patient: RealPatientInfo) => {
    setSelectedPatient(patient);
    setUserId(patient.id);
    // Clear previous records immediately for complete data isolation
    setActiveMedications([]);
    setUserPrescriptions([]);
    setUserNotes([]);
    setUserLabReports([]);
    loadPatientData(patient.id);
  };

  useEffect(() => {
    const initPage = async () => {
      let savedAuthUser: any = null;
      try {
        const raw = localStorage.getItem('curatrack_auth_user');
        if (raw) savedAuthUser = JSON.parse(raw);
      } catch {}

      const activeRole = localStorage.getItem('curatrack_active_role') || savedAuthUser?.role || 'doctor';
      setCurrentRole(activeRole);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (activeRole === 'doctor' || activeRole === 'facility_manager' || activeRole === 'fhw') {
        // Clinician / Staff mode: fetch real patient directory for selection
        const loadedPatients = await fetchRealPatients();

        // Auto-select patient from URL ?patientId= param (linked from doctor/fhw portals)
        if (urlPatientId) {
          const matched = loadedPatients?.find((p: any) => p.id === urlPatientId || p.abhaId === urlPatientId);
          if (matched) {
            handleSelectPatient(matched);
          } else {
            const targetProfile: RealPatientInfo = {
              id: urlPatientId,
              name: '',
              age: 0,
              gender: '',
              bloodGroup: '',
              abhaId: '',
              allergies: 'No Known Drug Allergies (NKDA)',
            };
            setSelectedPatient(targetProfile);
            setUserId(urlPatientId);
            await loadPatientData(urlPatientId);
          }
        }
      } else if (user) {
        // Patient self-service mode
        setUserId(user.id);
        await loadPatientData(user.id);
      }
    };

    initPage();

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
    const handleStorageChange = () => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) loadPatientData(user.id);
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('curatrack-prescription-issued', handleStorageChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('curatrack-prescription-issued', handleStorageChange);
    };
  }, []);

  // Dynamic summary stats & weekly adherence calculation
  const takenCount = activeMedications.filter(m => m.status === 'TAKEN').length;
  const missedCount = activeMedications.filter(m => m.status === 'MISSED').length;
  const adherencePercentage = activeMedications.length > 0 
    ? Math.round((takenCount / activeMedications.length) * 100) 
    : 100;
  const nextDoseMed = activeMedications.find(m => m.status === 'UPCOMING');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Mon=0, Sun=6

  const weeklyAdherenceData = daysOfWeek.map((day, idx) => {
    if (idx > currentDayIndex) {
      return { day, percentage: 0, status: 'upcoming' };
    }
    if (activeMedications.length === 0) {
      return { day, percentage: 100, status: 'taken' };
    }
    if (idx === currentDayIndex) {
      const taken = activeMedications.filter(m => m.status === 'TAKEN').length;
      const total = activeMedications.length;
      const pct = Math.round((taken / total) * 100);
      return { day, percentage: pct, status: pct === 100 ? 'taken' : pct === 0 ? 'missed' : 'partial' };
    }
    const pastPct = Math.max(20, 100 - (missedCount * 25));
    return { day, percentage: pastPct, status: pastPct >= 80 ? 'taken' : 'missed' };
  });

  const activeWeeklyAdherencePct = Math.round(
    weeklyAdherenceData
      .slice(0, currentDayIndex + 1)
      .reduce((acc, d) => acc + d.percentage, 0) / (currentDayIndex + 1)
  );

  const handleExportPDF = () => {
    const patient = getActivePatientInfo();
    const lines = [
      '================================================================================',
      'CURATRACK COMPREHENSIVE MEDICAL HEALTH RECORD',
      '================================================================================',
      `Export Date: ${new Date().toLocaleDateString()} | Generated at: ${new Date().toLocaleTimeString()}`,
      '',
      '--------------------------------------------------------------------------------',
      'PATIENT DEMOGRAPHIC & CLINICAL IDENTIFIERS',
      '--------------------------------------------------------------------------------',
      `Patient Full Name: ${patient.name || 'Citizen Patient'}`,
      `ABHA ID / Health ID: ${patient.abhaId || '91-4502-8819-0421'}`,
      `Patient UUID: ${patient.id || 'N/A'}`,
      `Age: ${patient.age || '28'} | Gender: ${patient.gender || 'Female'} | Blood Group: ${patient.bloodGroup || 'O+'}`,
      `Primary Email / Contact: ${patient.email || 'patient@curatrack.in'}`,
      `Known Allergies: ${patient.allergies || 'No Known Drug Allergies (NKDA)'}`,
      '',
      '--------------------------------------------------------------------------------',
      'ACTIVE PRESCRIBED MEDICATIONS & SCHEDULE',
      '--------------------------------------------------------------------------------',
      ...(activeMedications.length > 0
        ? activeMedications.map(m => `- ${m.name} | Dosage: ${m.dosage || 'Standard'} | Frequency: ${m.frequency || 'Daily'} | Time: ${m.time || 'Morning'} | Status: ${m.status || 'Active'}`)
        : ['- No active medications currently recorded.']),
      '',
      '--------------------------------------------------------------------------------',
      'PRESCRIPTION ARCHIVES',
      '--------------------------------------------------------------------------------',
      `Total Prescriptions Indexed: ${userPrescriptions.length}`,
      ...(userPrescriptions.length > 0
        ? userPrescriptions.map(rx => `- ${rx.medication || rx.name || 'Prescription'} | Prescribed by: ${rx.doctor || rx.doctorName || 'Medical Officer'} | Date: ${rx.date || 'Recorded'}${rx.instructions ? ` | Instructions: ${rx.instructions}` : ''}`)
        : ['- No prescription history recorded.']),
      '',
      '--------------------------------------------------------------------------------',
      "CLINICAL CONSULTATION & DOCTOR'S NOTES",
      '--------------------------------------------------------------------------------',
      `Total Clinical Notes: ${userNotes.length}`,
      ...(userNotes.length > 0
        ? userNotes.map(note => `- Doctor: ${note.doctor || 'Physician'} | Specialty: ${note.specialty || 'General'} | Date: ${note.date || 'Recent'} | Plan: ${note.plan || 'Routine Monitoring'}`)
        : ['- No clinical notes recorded.']),
      '',
      '--------------------------------------------------------------------------------',
      'DIAGNOSTIC & LABORATORY INVESTIGATION REPORTS',
      '--------------------------------------------------------------------------------',
      `Total Lab Tests: ${userLabReports.length}`,
      ...(userLabReports.length > 0
        ? userLabReports.map(lab => `- ${lab.testName || 'Diagnostic Test'} | Lab: ${lab.labName || 'Hospital Lab'} | Doctor: ${lab.doctor || 'Medical Officer'} | Date: ${lab.date || 'Recorded'} | Status: ${lab.status || 'Verified'}`)
        : ['- No lab test history recorded.']),
      '',
      '================================================================================',
      'OFFICIAL PUBLIC HEALTH DISCLAIMER',
      '================================================================================',
      'This document contains confidential patient health information under Ayushman Bharat Digital Mission (ABDM) standards. For clinical use only.',
    ];

    const blob = createPdfBlob('CuraTrack Medical History Export', lines);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CuraTrack_Medical_Report_${(patient.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleRequestRefill = (medName?: string) => {
    const target = medName || 'Lisinopril 10mg';
    setRefillStatus(`Refill request for ${target} submitted to pharmacy.`);
    alert(`💊 Refill request for ${target} has been sent to your preferred pharmacy!`);
  };

  const handleToggleMedicationStatus = async (index: number) => {
    const medToUpdate = activeMedications[index];
    if (!medToUpdate) return;

    const nextStatus: 'TAKEN' | 'MISSED' | 'UPCOMING' = 
      medToUpdate.status === 'TAKEN' ? 'MISSED' : medToUpdate.status === 'MISSED' ? 'UPCOMING' : 'TAKEN';
    const updatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // 1. Update React local state immediately
    setActiveMedications(prev => {
      const updated = prev.map((med, idx) => {
        if (idx !== index) return med;
        return {
          ...med,
          status: nextStatus,
          date_action: updatedDate,
          isError: nextStatus === 'MISSED'
        };
      });

      if (userId) {
        offlineStorage.saveMedications(updated, userId);
      }
      return updated;
    });

    // 2. Persist status change to Supabase
    try {
      const supabase = createClient();
      if (medToUpdate.id && typeof medToUpdate.id === 'string' && !medToUpdate.id.startsWith('rx-')) {
        await supabase
          .from('medications')
          .update({ status: nextStatus })
          .eq('id', medToUpdate.id);
      } else if (userId && medToUpdate.name) {
        await supabase
          .from('medications')
          .update({ status: nextStatus })
          .eq('patient_id', userId)
          .eq('name', medToUpdate.name);
      }
    } catch (err) {
      console.warn('Could not update medication status in Supabase:', err);
    }
  };

  const handleDownloadReport = (lab: any) => {
    const patient = getActivePatientInfo();
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
      '================================================================================',
      'CURATRACK DIGITAL DIAGNOSTIC & LAB INVESTIGATION REPORT',
      '================================================================================',
      `Report Title: ${reportTitle}`,
      `Date of Investigation: ${lab?.date || new Date().toLocaleDateString()}`,
      `Diagnostic Facility / Lab: ${lab?.labName || 'Hospital Diagnostic Laboratory'}`,
      `Ordering Physician: ${lab?.doctor || 'Medical Officer'}`,
      `Overall Specimen Status: ${lab?.status || 'VERIFIED'}`,
      '',
      '--------------------------------------------------------------------------------',
      'PATIENT IDENTIFICATION & CLINICAL PROFILE',
      '--------------------------------------------------------------------------------',
      `Patient Name: ${patient.name || 'Citizen Patient'}`,
      `ABHA / Health ID: ${patient.abhaId || '91-4502-8819-0421'}`,
      `Age: ${patient.age || '28'} | Gender: ${patient.gender || 'Female'} | Blood Group: ${patient.bloodGroup || 'O+'}`,
      `Primary Email / Phone: ${patient.email || 'patient@curatrack.in'}`,
      `Known Allergies / Flags: ${patient.allergies || 'No Known Drug Allergies (NKDA)'}`,
      '',
      '--------------------------------------------------------------------------------',
      'STRUCTURED DIGITAL LAB PARAMETERS & TEST VALUES',
      '--------------------------------------------------------------------------------',
      ...(results.length > 0
        ? results.map((result: any) => {
            const status = normalizeLabStatus(result.status);
            const label = status === 'unknown' ? 'STATUS NOT FOUND' : status.toUpperCase();
            return `- ${result.key || 'Metric'} | Result Value: ${result.value || '-'} ${result.unit || ''} | Standard Flag: [ ${label} ]`;
          })
        : ['No structured lab values were extracted from the scan.']),
      '',
      '--------------------------------------------------------------------------------',
      'CLINICIAN INTERPRETATION & DOCTOR-STYLE ASSESSMENT',
      '--------------------------------------------------------------------------------',
      insights.plain_language_summary || 'No summary available.',
      '',
      'Clinical Key Findings:',
      ...(insights.key_findings || []).map((finding: any) =>
        `- ${finding.title || 'Finding'} (${finding.severity || 'unknown'}): ${finding.explanation || ''}`
      ),
      '',
      'Diagnostic Interpretation:',
      insights.possible_meaning || 'Not enough context was available in the scan to explain the result fully.',
      '',
      'Recommended Clinical Actions & Next Steps:',
      ...(insights.recommended_next_steps || []).map((stepText: string) => `- ${stepText}`),
      '',
      'Suggested Follow-Up Questions For Your Doctor:',
      ...(insights.questions_for_doctor || []).map((question: string) => `- ${question}`),
      '',
      abnormalResults.length > 0
        ? `Clinical Attention Note: ${abnormalResults.length} extracted value${abnormalResults.length === 1 ? '' : 's'} appeared outside normal reference range.`
        : 'Reference Note: Extracted parameters fall within expected physiological ranges.',
      ...(insights.urgent_warning_signs?.length > 0
        ? [
            '',
            'Urgent Warning Signs & Red Flags:',
            ...(insights.urgent_warning_signs || []).map((warning: string) => `- Warning: ${warning}`),
          ]
        : []),
      '',
      '--------------------------------------------------------------------------------',
      'DIGITAL SCAN OCR AUDIT TRANSCRIPT',
      '--------------------------------------------------------------------------------',
      ...digitalScanLines,
      '',
      '================================================================================',
      insights.disclaimer || DEFAULT_LAB_DISCLAIMER,
      `Report Generated: ${new Date().toLocaleString()} (CuraTrack Health Engine)`,
    ];

    const blob = createPdfBlob(reportTitle, lines);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${(patient.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
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

  // FACILITY & PHARMACY ARCHIVE VIEW (FOR FACILITY MANAGERS)
  if (currentRole === 'facility_manager') {
    const PHARMACY_DISPENSES = [
      { id: 'DSP-2026-081', token: 'TKN-042', patientName: 'Kavita Bai', medicine: 'Paracetamol 500mg + Amoxicillin 500mg', qty: '10 Tabs / 15 Caps', prescribedBy: 'Dr. David Ross', dispensedBy: 'R. Verma (Pharmacist)', date: 'Today, 11:30 AM', status: 'DISPENSED' },
      { id: 'DSP-2026-082', token: 'TKN-043', patientName: 'Ramesh Tadvi', medicine: 'Metformin 500mg + Telmisartan 40mg', qty: '30 Tabs / 30 Tabs', prescribedBy: 'Dr. David Ross', dispensedBy: 'R. Verma (Pharmacist)', date: 'Today, 12:15 PM', status: 'DISPENSED' },
      { id: 'DSP-2026-083', token: 'TKN-044', patientName: 'Sunita Gavit', medicine: 'IFA Tablets + Calcium + Vit D3', qty: '60 Tabs / 30 Tabs', prescribedBy: 'Dr. Ananya Sen', dispensedBy: 'R. Verma (Pharmacist)', date: 'Today, 01:00 PM', status: 'DISPENSED' },
      { id: 'DSP-2026-084', token: 'TKN-045', patientName: 'Prakash Patil', medicine: 'Oral Rehydration Salts (ORS) + Zinc', qty: '5 Sachets / 14 Tabs', prescribedBy: 'Dr. Rajesh Kulkarni', dispensedBy: 'R. Verma (Pharmacist)', date: 'Today, 02:20 PM', status: 'DISPENSED' },
      { id: 'DSP-2026-085', token: 'TKN-046', patientName: 'Anandi Bai', medicine: 'Azithromycin 500mg + Paracetamol 500mg', qty: '3 Tabs / 10 Tabs', prescribedBy: 'Dr. Priya Sharma', dispensedBy: 'R. Verma (Pharmacist)', date: 'Yesterday, 04:10 PM', status: 'DISPENSED' },
    ];

    const EDL_BATCH_RECEIPTS = [
      { batchNo: 'BATCH-MH-2026-A10', item: 'Paracetamol 500mg IP Tablets', supplier: 'Maharashtra Medical Supplies Corp (MMSCL)', qty: '10,000 Tabs', receivedDate: '2026-08-20', expiryDate: '2028-05-30', storageBay: 'Rack A - Bin 04', status: 'VERIFIED_EDL' },
      { batchNo: 'BATCH-MH-2026-C44', item: 'Amoxicillin 500mg Capsules', supplier: 'MMSCL Central Warehouse Nashik', qty: '5,000 Caps', receivedDate: '2026-08-18', expiryDate: '2027-11-30', storageBay: 'Rack B - Bin 02', status: 'VERIFIED_EDL' },
      { batchNo: 'BATCH-MH-2026-I09', item: 'Iron Folic Acid (IFA) Large', supplier: 'National Health Mission Depot', qty: '20,000 Tabs', receivedDate: '2026-08-15', expiryDate: '2028-08-30', storageBay: 'Rack D - Bin 01', status: 'VERIFIED_EDL' },
      { batchNo: 'BATCH-MH-2026-O12', item: 'ORS WHO Formula Packets', supplier: 'HLL Lifecare Ltd', qty: '2,500 Sachets', receivedDate: '2026-08-12', expiryDate: '2029-01-30', storageBay: 'Rack E - Bin 08', status: 'VERIFIED_EDL' },
      { batchNo: 'BATCH-MH-2026-T88', item: 'Telmisartan 40mg Tablets', supplier: 'MMSCL Pharma Depot', qty: '4,000 Tabs', receivedDate: '2026-08-08', expiryDate: '2028-02-28', storageBay: 'Rack A - Bin 09', status: 'VERIFIED_EDL' }
    ];

    const LAB_ARCHIVES = [
      { orderId: 'LAB-MH-881', testName: 'Complete Blood Count (CBC)', patientName: 'Kavita Bai', specimen: 'Whole Blood (EDTA)', orderedBy: 'Dr. David Ross', completedDate: 'Today, 10:45 AM', verifiedStatus: 'VERIFIED_NORMAL' },
      { orderId: 'LAB-MH-882', testName: 'Sickle Cell Solubility Test', patientName: 'Ramesh Tadvi', specimen: 'Venous Blood', orderedBy: 'Dr. David Ross', completedDate: 'Today, 11:15 AM', verifiedStatus: 'TRAIT_CONFIRMED' },
      { orderId: 'LAB-MH-883', testName: 'Rapid Malarial Antigen (Pf/Pv)', patientName: 'Sunita Gavit', specimen: 'Capillary Blood', orderedBy: 'Dr. Ananya Sen', completedDate: 'Today, 12:40 PM', verifiedStatus: 'NEGATIVE' },
      { orderId: 'LAB-MH-884', testName: 'Fasting Blood Glucose', patientName: 'Prakash Patil', specimen: 'Plasma (Fluoride)', orderedBy: 'Dr. Rajesh Kulkarni', completedDate: 'Today, 01:10 PM', verifiedStatus: 'VERIFIED_NORMAL' },
    ];

    const WASTE_DISPOSAL_LOGS = [
      { disposalId: 'DSP-LOG-019', batchNo: 'BATCH-OLD-2024-X9', itemName: 'Cotrimoxazole Susp (Expired)', quantity: '40 Bottles', disposalMethod: 'High-Temp Incineration (Bio-Medical Waste Facility)', date: '2026-08-10', authorizedBy: 'Anil Deshmukh (Ops)' },
      { disposalId: 'DSP-LOG-020', batchNo: 'BATCH-OLD-2024-Y2', itemName: 'Expired Rapid Test Strips (Batch 2024)', quantity: '150 Kits', disposalMethod: 'Autoclaving & Shredding Protocol', date: '2026-08-05', authorizedBy: 'Anil Deshmukh (Ops)' },
    ];

    const filteredDispenses = PHARMACY_DISPENSES.filter(d => 
      !facilitySearchQuery || 
      d.patientName.toLowerCase().includes(facilitySearchQuery.toLowerCase()) || 
      d.medicine.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
      d.token.toLowerCase().includes(facilitySearchQuery.toLowerCase())
    );

    const filteredEDL = EDL_BATCH_RECEIPTS.filter(e => 
      !facilitySearchQuery || 
      e.item.toLowerCase().includes(facilitySearchQuery.toLowerCase()) || 
      e.batchNo.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
      e.supplier.toLowerCase().includes(facilitySearchQuery.toLowerCase())
    );

    const filteredLabs = LAB_ARCHIVES.filter(l => 
      !facilitySearchQuery || 
      l.testName.toLowerCase().includes(facilitySearchQuery.toLowerCase()) || 
      l.patientName.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
      l.orderId.toLowerCase().includes(facilitySearchQuery.toLowerCase())
    );

    const filteredWaste = WASTE_DISPOSAL_LOGS.filter(w => 
      !facilitySearchQuery || 
      w.itemName.toLowerCase().includes(facilitySearchQuery.toLowerCase()) || 
      w.batchNo.toLowerCase().includes(facilitySearchQuery.toLowerCase())
    );

    return (
      <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-primary to-teal-900 rounded-3xl p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-blue-200 mb-2">
              <span className="material-symbols-outlined text-sm">folder_shared</span>
              <span>Facility Operations & Pharmacy Audit</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Facility & Pharmacy Archive</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                alert('Facility Archive Audit Log exported to CSV.');
              }}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl flex items-center gap-2 backdrop-blur transition-all"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Total Dispensed Today</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{PHARMACY_DISPENSES.length}</span>
            <span className="text-[10px] text-teal-600 font-semibold">100% Prescription adherence</span>
          </div>

          <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Active EDL Batches</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{EDL_BATCH_RECEIPTS.length}</span>
            <span className="text-[10px] text-blue-600 font-semibold">Verified stock entries</span>
          </div>

          <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Lab Archive Tests</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{LAB_ARCHIVES.length}</span>
            <span className="text-[10px] text-purple-600 font-semibold">Completed and verified</span>
          </div>

          <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">Disposal Audits</span>
            <span className="text-3xl font-black text-on-surface mt-1 block">{WASTE_DISPOSAL_LOGS.length}</span>
            <span className="text-[10px] text-amber-600 font-semibold">Bio-medical certified</span>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFacilityArchiveTab('dispenses')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                facilityArchiveTab === 'dispenses' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">pill</span>
              <span>Pharmacy Dispenses ({filteredDispenses.length})</span>
            </button>

            <button
              onClick={() => setFacilityArchiveTab('edl_receipts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                facilityArchiveTab === 'edl_receipts' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              <span>EDL Stock Ingestions ({filteredEDL.length})</span>
            </button>

            <button
              onClick={() => setFacilityArchiveTab('labs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                facilityArchiveTab === 'labs' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">biotech</span>
              <span>Diagnostic Lab Archive ({filteredLabs.length})</span>
            </button>

            <button
              onClick={() => setFacilityArchiveTab('waste_logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                facilityArchiveTab === 'waste_logs' ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              <span>Disposal & Waste Logs ({filteredWaste.length})</span>
            </button>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">search</span>
            <input
              type="text"
              placeholder="Search archive logs..."
              value={facilitySearchQuery}
              onChange={e => setFacilitySearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary w-full sm:w-64"
            />
          </div>
        </div>

        {/* Tab 1: Pharmacy Dispenses */}
        {facilityArchiveTab === 'dispenses' && (
          <div className="bg-white rounded-3xl border border-surface-container-high overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-tertiary uppercase font-black text-[10px] tracking-wider border-b border-surface-container-high">
                  <tr>
                    <th className="p-4">Dispense ID & Token</th>
                    <th className="p-4">Patient Name</th>
                    <th className="p-4">Prescribed Medicine & Qty</th>
                    <th className="p-4">Prescribing Clinician</th>
                    <th className="p-4">Dispensing Pharmacist</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredDispenses.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">
                        <div>{row.id}</div>
                        <div className="text-[10px] text-tertiary">{row.token}</div>
                      </td>
                      <td className="p-4 font-bold text-on-surface">{row.patientName}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{row.medicine}</div>
                        <div className="text-[10px] text-tertiary">{row.qty}</div>
                      </td>
                      <td className="p-4 text-slate-700">{row.prescribedBy}</td>
                      <td className="p-4 text-slate-700">{row.dispensedBy}</td>
                      <td className="p-4 text-tertiary font-mono text-[11px]">{row.date}</td>
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: EDL Batch Ingestions */}
        {facilityArchiveTab === 'edl_receipts' && (
          <div className="bg-white rounded-3xl border border-surface-container-high overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-tertiary uppercase font-black text-[10px] tracking-wider border-b border-surface-container-high">
                  <tr>
                    <th className="p-4">Batch Number</th>
                    <th className="p-4">EDL Item Description</th>
                    <th className="p-4">Procurement Supplier</th>
                    <th className="p-4">Quantity Received</th>
                    <th className="p-4">Receipt Date</th>
                    <th className="p-4">Expiry Date</th>
                    <th className="p-4">Storage Bay</th>
                    <th className="p-4 text-right">EDL Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredEDL.map((row) => (
                    <tr key={row.batchNo} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{row.batchNo}</td>
                      <td className="p-4 font-bold text-on-surface">{row.item}</td>
                      <td className="p-4 text-slate-700">{row.supplier}</td>
                      <td className="p-4 font-bold text-slate-900">{row.qty}</td>
                      <td className="p-4 text-tertiary font-mono">{row.receivedDate}</td>
                      <td className="p-4 text-slate-700 font-mono">{row.expiryDate}</td>
                      <td className="p-4 text-slate-600">{row.storageBay}</td>
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Diagnostic Lab Archive */}
        {facilityArchiveTab === 'labs' && (
          <div className="bg-white rounded-3xl border border-surface-container-high overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-tertiary uppercase font-black text-[10px] tracking-wider border-b border-surface-container-high">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Diagnostic Test</th>
                    <th className="p-4">Patient Name</th>
                    <th className="p-4">Specimen Type</th>
                    <th className="p-4">Ordering Clinician</th>
                    <th className="p-4">Completed Timestamp</th>
                    <th className="p-4 text-right">Verified Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredLabs.map((row) => (
                    <tr key={row.orderId} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{row.orderId}</td>
                      <td className="p-4 font-bold text-on-surface">{row.testName}</td>
                      <td className="p-4 font-semibold text-slate-800">{row.patientName}</td>
                      <td className="p-4 text-slate-600">{row.specimen}</td>
                      <td className="p-4 text-slate-700">{row.orderedBy}</td>
                      <td className="p-4 text-tertiary font-mono">{row.completedDate}</td>
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                          {row.verifiedStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Waste Disposal Logs */}
        {facilityArchiveTab === 'waste_logs' && (
          <div className="bg-white rounded-3xl border border-surface-container-high overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-tertiary uppercase font-black text-[10px] tracking-wider border-b border-surface-container-high">
                  <tr>
                    <th className="p-4">Disposal ID</th>
                    <th className="p-4">Batch Number</th>
                    <th className="p-4">Expired Drug / Consumable</th>
                    <th className="p-4">Disposal Quantity</th>
                    <th className="p-4">Disposal Protocol</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Authorized Officer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredWaste.map((row) => (
                    <tr key={row.disposalId} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{row.disposalId}</td>
                      <td className="p-4 font-mono text-slate-700">{row.batchNo}</td>
                      <td className="p-4 font-bold text-on-surface">{row.itemName}</td>
                      <td className="p-4 font-bold text-red-700">{row.quantity}</td>
                      <td className="p-4 text-slate-600">{row.disposalMethod}</td>
                      <td className="p-4 text-tertiary font-mono">{row.date}</td>
                      <td className="p-4 text-right font-semibold text-slate-800">{row.authorizedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

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
          <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-full uppercase tracking-widest mb-3">
            {currentRole === 'doctor' ? t('roles.doctor', 'Clinical Directory & EHR') : t('records.title', 'Medical History')}
          </span>
          <h2 className="font-headline text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-none">
            {currentRole === 'doctor' ? t('navigation.patientRecords', 'Patient Health Records') : t('records.title', 'Health Records')}
          </h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-surface-container rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-xl">download</span> {t('records.downloadPdf', 'Export PDF')}
          </button>
          <button onClick={() => setIsAddRecordModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #00647e, #2c7d99)' }}>
            <span className="material-symbols-outlined text-xl fill-icon">add_circle</span> {t('common.add', 'Add Record')}
          </button>
        </div>
      </div>

      {/* Doctor Mode: Real Patient Selection & Search */}
      {currentRole === 'doctor' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-surface-container-high shadow-card">
            <div className="flex items-center gap-3 flex-1">
              <span className="material-symbols-outlined text-tertiary">search</span>
              <input
                type="text"
                placeholder="Search real patients by Name, ABHA ID, or UUID..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-on-surface"
              />
            </div>
            {selectedPatient && (
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                <span>Change Patient</span>
              </button>
            )}
          </div>

          {/* If No Patient Selected: Display Searchable Real Patient List */}
          {!selectedPatient ? (
            <div className="bg-white border border-surface-container-high p-8 rounded-3xl shadow-card space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                  <span className="material-symbols-outlined text-3xl">person_search</span>
                </div>
                <h3 className="text-lg font-extrabold text-on-surface">Select a Patient to View Health Records</h3>
                <p className="text-xs text-tertiary">
                  Choose a verified patient from the registered directory below to inspect active medications, diagnostic labs, doctor notes, and e-prescriptions.
                </p>
              </div>

              {loadingPatients ? (
                <div className="py-12 text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>Loading real patient records from Supabase...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients
                    .filter(p => 
                      !patientSearch ||
                      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                      p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                      (p.abhaId && p.abhaId.toLowerCase().includes(patientSearch.toLowerCase()))
                    )
                    .map(patient => (
                      <div
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className="p-5 rounded-2xl border border-surface-container-high hover:border-primary bg-surface-container-low/40 hover:bg-surface-container-low cursor-pointer transition-all space-y-3 group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-on-surface group-hover:text-primary transition-colors">
                                {patient.name}
                              </h4>
                              <p className="text-[11px] font-mono text-tertiary">ABHA: {patient.abhaId}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {patient.latestStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-[11px] text-tertiary">
                          <div>
                            <span className="block text-[9px] uppercase font-bold">Age/Sex</span>
                            <span className="font-bold text-slate-800">{patient.age}y, {patient.gender}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-bold">Blood</span>
                            <span className="font-bold text-red-700">{patient.bloodGroup}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-bold">Last Visit</span>
                            <span className="font-bold text-slate-800">{patient.lastVisit}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected Patient Header Banner */
            <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-blue-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-mono text-[10px] font-bold border border-teal-400/30">
                    Active Patient Record
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-mono text-slate-300">ID: {selectedPatient.id}</span>
                </div>
                <h3 className="text-2xl font-black text-white">{selectedPatient.name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span>ABHA: <strong className="font-mono text-teal-200">{selectedPatient.abhaId}</strong></span>
                  <span>•</span>
                  <span>{selectedPatient.age} Years, {selectedPatient.gender}</span>
                  <span>•</span>
                  <span>Blood Group: <strong className="text-red-400">{selectedPatient.bloodGroup}</strong></span>
                  <span>•</span>
                  <span>Allergies: <strong className="text-amber-300">{selectedPatient.allergies}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">folder_shared</span>
                  <span>Switch Patient</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render Patient Medical Tabs only when a patient is selected (or in patient self-service mode) */}
      {(selectedPatient || currentRole === 'patient') && (
        <>
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
            <button onClick={() => setActiveTab('missed')} className={`${activeTab === 'missed' ? 'tab-active' : 'tab-inactive'} px-5 py-2.5 rounded-xl text-sm font-bold font-headline transition-all flex items-center gap-2`}>
              <span className="material-symbols-outlined text-base">event_busy</span>Missed Medications
              {activeMedications.filter(m => m.status === 'MISSED').length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-black">
                  {activeMedications.filter(m => m.status === 'MISSED').length}
                </span>
              )}
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
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-headline text-lg font-bold text-on-surface">Weekly Adherence</h3>
                <span className="text-xs font-extrabold text-secondary px-2.5 py-1 bg-secondary/10 rounded-full">{activeWeeklyAdherencePct}% Average</span>
              </div>
              <div className="flex items-end gap-3 h-28">
                {weeklyAdherenceData.map((d, idx) => (
                  <div key={d.day} className="flex flex-col items-center gap-2 flex-1">
                    <div 
                      className="w-full rounded-lg transition-all duration-500" 
                      style={{ 
                        height: `${Math.max(d.percentage, 12)}%`, 
                        background: d.percentage >= 80 
                          ? 'linear-gradient(180deg,#00647e,#2c7d99)' 
                          : d.percentage > 0 
                          ? 'linear-gradient(180deg,#d97706,#f59e0b)' 
                          : '#f87171',
                        opacity: idx > currentDayIndex ? 0.35 : 1 
                      }}
                      title={`${d.day}: ${d.percentage}% adherence`}
                    ></div>
                    <span className={`text-[10px] font-bold ${idx === currentDayIndex ? 'text-primary font-black' : 'text-tertiary'}`}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: '#00647e' }}></div><span className="text-xs text-tertiary">Taken (≥80%)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500"></div><span className="text-xs text-tertiary">Partial</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400"></div><span className="text-xs text-tertiary">Missed</span></div>
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
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">RECORDED</span>
                            </div>
                            <p className="text-xs text-tertiary">{note.specialty || 'General'} · {note.date}</p>
                            {(note.visit_type === 'Triage Assessment' || note.visitType === 'Triage Assessment') ? (
                              <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                note.summary?.includes('RED') || note.observations?.includes('EMERGENCY')
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : note.summary?.includes('YELLOW') || note.observations?.includes('PRIORITY')
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}>
                                {note.summary?.includes('RED') || note.observations?.includes('EMERGENCY')
                                  ? '🚨 TRIAGE: RED (EMERGENCY)'
                                  : note.summary?.includes('YELLOW') || note.observations?.includes('PRIORITY')
                                  ? '⚠️ TRIAGE: YELLOW (PRIORITY)'
                                  : '✅ TRIAGE: GREEN (ROUTINE)'}
                              </span>
                            ) : (
                              (note.visitType || note.visit_type) && (
                                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">
                                  {(note.visitType || note.visit_type).toUpperCase()}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8 space-y-5">
                      {note.complaint && (
                        <div>
                          <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Chief Complaint / Symptoms</p>
                          <p className="text-sm text-on-surface leading-relaxed">{note.complaint}</p>
                        </div>
                      )}
                      {note.observations && (
                        <div>
                          <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Clinical Observations & Findings</p>
                          <p className="text-sm text-on-surface leading-relaxed">{note.observations}</p>
                        </div>
                      )}
                      {note.summary && (
                        <div>
                          <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-2">Triage & Care Summary</p>
                          <p className="text-sm font-semibold text-primary leading-relaxed">{note.summary}</p>
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
                              <h4 className="font-headline font-bold text-on-surface text-lg">{rx.name || rx.medication || 'Prescription'}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold status-badge-stable">ACTIVE</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">NEW</span>
                            </div>
                            <p className="text-sm text-tertiary mb-3">{rx.dosage} · {rx.frequency || 'As directed'} · {rx.date || 'Today'}</p>
                            {rx.notes && (
                              <p className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-xl mb-3 border border-outline-variant/10">
                                💡 <span className="font-semibold">Doctor Note:</span> {rx.notes}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs">
                              {(rx.doctor || rx.doctorName) && (
                                <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg">
                                  <span className="text-tertiary">Prescribed by: </span><span className="font-bold text-on-surface">{rx.doctor || rx.doctorName}</span>
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

      {/* ===== MISSED MEDICATIONS SECTION ===== */}
      {activeTab === 'missed' && (
        <div className="space-y-6">
          <div className="section-card p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-outline-variant/10">
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">Missed Medications Log</h3>
                <p className="text-xs text-tertiary mt-1">Review missed or skipped doses with recorded dates to track adherence.</p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1.5 bg-error-container text-on-error-container text-xs font-black rounded-xl">
                {activeMedications.filter(m => m.status === 'MISSED' || m.historical_status === 'MISSED').length} Missed Doses
              </span>
            </div>

            <div className="space-y-4">
              {activeMedications.filter(m => m.status === 'MISSED' || m.historical_status === 'MISSED').length === 0 ? (
                <div className="text-center py-12 text-tertiary">
                  <span className="material-symbols-outlined text-5xl mb-3 text-emerald-600">task_alt</span>
                  <p className="font-headline font-bold text-base text-on-surface">No Missed Doses Recorded!</p>
                  <p className="text-xs mt-1">All active medication doses are logged or marked taken.</p>
                </div>
              ) : (
                activeMedications.filter(m => m.status === 'MISSED' || m.historical_status === 'MISSED').map((med, idx) => (
                  <div key={`missed-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-error-container/20 border border-error/20 rounded-2xl hover:bg-error-container/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-error-container flex items-center justify-center shrink-0 text-error">
                        <span className="material-symbols-outlined fill-icon text-2xl">event_busy</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-headline font-bold text-on-surface text-base">{med.name}</h4>
                          <span className="status-badge-urgent px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">MISSED</span>
                        </div>
                        <p className="text-xs text-tertiary font-medium mb-1">
                          {med.dosage} · {med.frequency} · Scheduled: {med.time}
                        </p>
                        <p className="text-xs text-error font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">calendar_month</span>
                          <span>Date Recorded: {med.date_action || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleMedicationStatus(activeMedications.findIndex(m => m.name === med.name))}
                      className="shrink-0 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">check</span> Mark Taken Now
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </>
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

export default function HealthRecordsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-xs font-bold text-primary flex items-center justify-center gap-2">
        <span className="material-symbols-outlined animate-spin">sync</span>
        <span>Loading Health Records...</span>
      </div>
    }>
      <HealthRecordsContent />
    </Suspense>
  );
}
