'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { MedicineSearchDropdown, FacilityMedicineItem } from '@/components/MedicineSearchDropdown';

export interface DoctorPrescriptionItem {
  id: string;
  inventory_id?: string;
  is_inventory: boolean;
  prescription_type?: 'INVENTORY' | 'NON-INVENTORY' | string;
  status?: string;
  drug: string;
  category?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  available_stock?: number;
  stock_status?: 'ADEQUATE' | 'LOW_STOCK' | 'CRITICAL_STOCKOUT_RISK';
  instructions: string;
}

interface OPDQueuePatient {
  id: string;
  clientId: string;
  token: string;
  name: string;
  age: number;
  gender: string;
  abhaId: string;
  bloodGroup: string;
  allergies: string;
  priority: 'EMERGENCY' | 'PRIORITY' | 'ROUTINE';
  complaint: string;
  vitals: {
    bp: string;
    hr: number | string;
    spo2: number | string;
    temp: string;
    bmi: string;
  };
  type: 'In-Person OPD' | 'Teleconsult' | 'Emergency Follow-Up';
  status: 'WAITING' | 'IN-CONSULT' | 'COMPLETED';
  waitTime: string;
  date?: string;
  roomId?: string;
  ashaName?: string;
  villageName?: string;
  beneficiaryId?: string;
  consultType?: string;
}

interface Appointment {
  id: string;
  client_id: string;
  doctor_id: string;
  scheduled_time?: string;
  room_id: string;
  status: string;
  patient_name?: string;
  time?: string;
  date?: string;
  notes?: string;
  priority?: string;
  vitals_bp?: string;
  vitals_hr?: number | string;
  vitals_spo2?: number | string;
  vitals_temp?: string;
  vitals_bmi?: string;
  token?: string;
  asha_name?: string;
  village_name?: string;
  beneficiary_id?: string;
  consult_type?: string;
  complaint?: string;
}

interface DoctorProfileInfo {
  id: string;
  name: string;
  email: string;
  facility: string;
  license: string;
  department: string;
}

interface PatientTriageDetails {
  urgency: 'EMERGENCY' | 'PRIORITY' | 'ROUTINE';
  urgencyLabel: string;
  description: string;
  complaint: string;
  symptoms: string[];
  communityAssessment?: {
    screener: string;
    date: string;
    summary: string;
    observations: string;
    plan: string;
  } | null;
  pastDiagnoses: string[];
  medicalAlerts: Array<{ type: 'danger' | 'warning' | 'info'; text: string; icon: string }>;
}

export const calculatePatientQueuePriority = (patient: OPDQueuePatient): number => {
  if (patient.status === 'COMPLETED') return 1_000_000_000_000_000;

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Check if future scheduled appointment
  let isFuture = false;
  let scheduledTimeMs = 0;

  if (patient.date) {
    const parsed = new Date(patient.date);
    if (!isNaN(parsed.getTime())) {
      scheduledTimeMs = parsed.getTime();
      const parsedIso = parsed.toISOString().split('T')[0];
      if (parsedIso > todayIso && patient.date !== todayFormatted) {
        isFuture = true;
      }
    }
  }

  let rank = 3;
  if (!isFuture) {
    // Today's immediate queue: Emergency highest (1), Priority (2), Routine (3)
    if (patient.priority === 'EMERGENCY') rank = 1;
    else if (patient.priority === 'PRIORITY') rank = 2;
    else rank = 3;
  } else {
    // Future scheduled meetings have lower priority than today's live queue
    if (patient.priority === 'EMERGENCY') rank = 10;
    else if (patient.priority === 'PRIORITY') rank = 20;
    else rank = 30;
  }

  // Weight rank by 1e12 + scheduled/creation timestamp
  return rank * 1_000_000_000_000 + (scheduledTimeMs || Date.now());
};

export default function DoctorOPDPage() {
  const router = useRouter();
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live Database States
  const [doctorInfo, setDoctorInfo] = useState<DoctorProfileInfo>({
    id: '',
    name: 'Medical Officer, MD',
    email: 'doctor@curatrack.in',
    facility: 'Sub-District Hospital',
    license: 'MMC/2026/04481',
    department: 'General Medicine & OPD Room 101',
  });

  const [queue, setQueue] = useState<OPDQueuePatient[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenPatientModal = (patient: OPDQueuePatient) => {
    setSelectedPatientId(patient.id);
    setIsModalOpen(true);
  };

  // Facility awareness: beds & medicine alerts
  const [bedsData, setBedsData] = useState<any>(null);
  const [loadingBeds, setLoadingBeds] = useState<boolean>(true);
  const [medAlerts, setMedAlerts] = useState<any[]>([]);
  const [showBedPanel, setShowBedPanel] = useState<boolean>(false);

  const [filterType, setFilterType] = useState<'ALL' | 'WAITING' | 'EMERGENCY' | 'TELECONSULT' | 'REFERRALS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inbound Referrals Pipeline State (Phase 3)
  const [inboundReferrals, setInboundReferrals] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState<boolean>(false);

  // ASHA Closed-Loop Follow-up Dispatch State (Phase 7)
  const [showAshaModal, setShowAshaModal] = useState<boolean>(false);
  const [ashaTaskData, setAshaTaskData] = useState({
    task_type: 'Post-Op Check',
    instructions: 'Visit patient at home on Day 5. Check wound healing, vitals, and verify medication adherence.',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'HIGH'
  });
  const [assigningTask, setAssigningTask] = useState<boolean>(false);
  const [ashaSuccessMsg, setAshaSuccessMsg] = useState<string>('');

  // Telemedicine Realtime & Incoming Call State
  const [incomingCall, setIncomingCall] = useState<Appointment | null>(null);
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);

  // Patient Clinical Assessment & Triage State
  const [patientTriage, setPatientTriage] = useState<PatientTriageDetails | null>(null);

  // Clinical Encounter State - dynamically loaded per selected patient
  const [soapDiagnosis, setSoapDiagnosis] = useState<string>('');
  const [soapNotes, setSoapNotes] = useState<string>('');
  const [prescriptions, setPrescriptions] = useState<DoctorPrescriptionItem[]>([]);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [loadingClinicalRecords, setLoadingClinicalRecords] = useState<boolean>(false);
  const [submittingEncounter, setSubmittingEncounter] = useState<boolean>(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string>('');
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>('');

  // Prescription Form Draft State (Facility Inventory & Non-Inventory Integration)
  const [selectedInventoryMed, setSelectedInventoryMed] = useState<FacilityMedicineItem | null>(null);
  const [isNonInventoryMode, setIsNonInventoryMode] = useState<boolean>(false);
  const [draftDrugName, setDraftDrugName] = useState<string>('');
  const [draftDosage, setDraftDosage] = useState<string>('500mg');
  const [draftFrequency, setDraftFrequency] = useState<string>('BD (Twice daily)');
  const [draftDuration, setDraftDuration] = useState<string>('5 Days');
  const [draftQuantity, setDraftQuantity] = useState<number>(10);
  const [draftInstructions, setDraftInstructions] = useState<string>('Take after meals');
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  // Helper to auto-calculate quantity from frequency and duration
  const calculateQuantity = useCallback((freq: string, dur: string): number => {
    let perDay = 1;
    if (freq.startsWith('BD') || freq.includes('Twice') || freq.includes('2')) perDay = 2;
    else if (freq.startsWith('TDS') || freq.includes('3')) perDay = 3;
    else if (freq.startsWith('QDS') || freq.includes('4')) perDay = 4;
    else if (freq.startsWith('OD') || freq.includes('Once') || freq.includes('1')) perDay = 1;

    const daysMatch = dur.match(/\d+/);
    const days = daysMatch ? parseInt(daysMatch[0], 10) : 5;
    return Math.max(1, perDay * days);
  }, []);

  const handleSelectInventoryMed = useCallback((med: FacilityMedicineItem) => {
    setSelectedInventoryMed(med);
    setIsNonInventoryMode(false);
    setDraftDrugName(med.name);
    const calculatedQty = calculateQuantity(draftFrequency, draftDuration);
    setDraftQuantity(calculatedQty);
    if (calculatedQty > med.stock_units) {
      setStockWarning(t('doctor.insufficientStock', { available: med.stock_units }, `Insufficient facility stock. Available: ${med.stock_units}`));
    } else {
      setStockWarning(null);
    }
  }, [calculateQuantity, draftFrequency, draftDuration, t]);

  const handleSelectNonInventoryMed = useCallback((name: string) => {
    setSelectedInventoryMed(null);
    setIsNonInventoryMode(true);
    setDraftDrugName(name || 'Custom Medication');
    const calculatedQty = calculateQuantity(draftFrequency, draftDuration);
    setDraftQuantity(calculatedQty);
    setStockWarning(null);
  }, [calculateQuantity, draftFrequency, draftDuration]);

  const handleFrequencyChange = (freq: string) => {
    setDraftFrequency(freq);
    const calculatedQty = calculateQuantity(freq, draftDuration);
    setDraftQuantity(calculatedQty);
    if (!isNonInventoryMode && selectedInventoryMed && calculatedQty > selectedInventoryMed.stock_units) {
      setStockWarning(t('doctor.insufficientStock', { available: selectedInventoryMed.stock_units }, `Insufficient facility stock. Available: ${selectedInventoryMed.stock_units}`));
    } else {
      setStockWarning(null);
    }
  };

  const handleDurationChange = (dur: string) => {
    setDraftDuration(dur);
    const calculatedQty = calculateQuantity(draftFrequency, dur);
    setDraftQuantity(calculatedQty);
    if (!isNonInventoryMode && selectedInventoryMed && calculatedQty > selectedInventoryMed.stock_units) {
      setStockWarning(t('doctor.insufficientStock', { available: selectedInventoryMed.stock_units }, `Insufficient facility stock. Available: ${selectedInventoryMed.stock_units}`));
    } else {
      setStockWarning(null);
    }
  };

  const handleQuantityChange = (qty: number) => {
    const validQty = Math.max(1, qty || 1);
    setDraftQuantity(validQty);
    if (!isNonInventoryMode && selectedInventoryMed && validQty > selectedInventoryMed.stock_units) {
      setStockWarning(t('doctor.insufficientStock', { available: selectedInventoryMed.stock_units }, `Insufficient facility stock. Available: ${selectedInventoryMed.stock_units}`));
    } else {
      setStockWarning(null);
    }
  };

  // Fetch Inbound Referrals from Backend/Supabase (Phase 3 with Doctor Privacy RBAC)
  const fetchInboundReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const docName = encodeURIComponent(doctorInfo.name || 'Dr. David Ross');
      const docId = activeDoctorId || doctorInfo.id || 'doc-david-ross';
      const res = await apiFetch(`/api/referrals?doctor_id=${docId}&doctor_name=${docName}`);
      if (res?.referrals) {
        setInboundReferrals(res.referrals);
      }
    } catch (e) {
      console.warn('Error fetching inbound referrals:', e);
    } finally {
      setLoadingReferrals(false);
    }
  }, [activeDoctorId, doctorInfo.name, doctorInfo.id]);

  // Fetch Live Queue from Supabase Database
  const fetchLiveQueue = useCallback(async (docId: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (docId) {
        query = query.or(`doctor_id.eq.${docId},doctor_id.eq.doc-david-ross,doctor_id.ilike.%doc-%`);
      }

      const { data: dbAppts, error: dbError } = await query;

      if (dbError) {
        console.warn('Error querying appointments for doctor:', dbError);
      }

      if (!dbAppts || dbAppts.length === 0) {
        setQueue([]);
        setLoadingQueue(false);
        return;
      }

      // Fetch profiles for client names individually to avoid RLS collection errors
      const clientIds = Array.from(new Set(dbAppts.map((a: any) => a.client_id || a.patient_id || a.user_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      if (clientIds.length > 0) {
        await Promise.all(
          clientIds.map(async (cid) => {
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('id, name, email, gender, blood_group')
                .eq('id', cid)
                .maybeSingle();
              if (prof) {
                profilesMap[cid] = prof;
              }
            } catch (err) {
              console.warn(`Error resolving profile for client ${cid}:`, err);
            }
          })
        );
      }

      const seenPatients = new Set<string>();
      const deduplicatedQueue: OPDQueuePatient[] = [];

      for (const a of dbAppts) {
        const resolvedClientId = a.client_id || a.patient_id || a.user_id || a.id;
        const patientKey = resolvedClientId || a.patient_name || a.id;

        if (seenPatients.has(patientKey)) {
          continue; // Keep only one latest entry per patient in the queue
        }
        seenPatients.add(patientKey);

        // Extract any assisted metadata if embedded in appointment notes
        let extractedPatientName: string | null = null;
        let extractedAshaName: string | null = null;
        let extractedVillageName: string | null = null;
        if (a.notes && typeof a.notes === 'string') {
          const patMatch = a.notes.match(/for patient ([^\n\.\,]+)/i) || a.notes.match(/for ([^\n\.\,]+)\./i);
          if (patMatch) extractedPatientName = patMatch[1].trim();

          const ashaMatch = a.notes.match(/initiated by ([^\n\.\,]+) for/i);
          if (ashaMatch) extractedAshaName = ashaMatch[1].trim();

          const villMatch = a.notes.match(/Village:\s*([^\n\.]+)/i);
          if (villMatch) extractedVillageName = villMatch[1].trim();
        }

        const isTele = Boolean(a.room_id || a.status === 'ringing' || a.type === 'video');
        const isAssisted = a.consult_type === 'assisted_teleconsult' || Boolean(a.asha_name || a.beneficiary_id || extractedAshaName || (a.notes && a.notes.includes('Assisted teleconsult')));
        const rawPriority = (a.priority || '').toUpperCase().trim();
        const resolvedPriority: 'EMERGENCY' | 'PRIORITY' | 'ROUTINE' =
          rawPriority === 'EMERGENCY' || rawPriority === 'RED'
            ? 'EMERGENCY'
            : rawPriority === 'PRIORITY' || rawPriority === 'YELLOW' || rawPriority === 'HIGH'
              ? 'PRIORITY'
              : 'ROUTINE';

        const clientProf = profilesMap[resolvedClientId] || profilesMap[a.client_id] || profilesMap[a.patient_id];

        let pName = a.patient_name || extractedPatientName;
        if (!pName && clientProf) {
          if (clientProf.name && clientProf.name.trim().length > 0) {
            pName = clientProf.name.trim();
          } else if (clientProf.email) {
            const emailPrefix = clientProf.email.split('@')[0].replace(/[._-]/g, ' ');
            pName = emailPrefix
              .split(' ')
              .filter(Boolean)
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
          }
        }
        if (!pName) {
          pName = 'Patient';
        }

        let uiStatus: 'WAITING' | 'IN-CONSULT' | 'COMPLETED' = 'WAITING';
        if (a.status === 'in-consult' || a.status === 'in_progress') {
          uiStatus = 'IN-CONSULT';
        } else if (a.status === 'completed' || a.status === 'ended') {
          uiStatus = 'COMPLETED';
        } else {
          uiStatus = 'WAITING';
        }

        const formattedDate = a.scheduled_time
          ? new Date(a.scheduled_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : a.date
            ? new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const formattedTime = a.scheduled_time
          ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : a.time || 'Just now';

        deduplicatedQueue.push({
          id: a.id,
          clientId: resolvedClientId,
          token: a.token || `TKN-${String(deduplicatedQueue.length + 1).padStart(3, '0')}`,
          name: pName,
          age: clientProf?.age || (a.age ? Number(a.age) : 32),
          gender: clientProf?.gender || a.gender || 'Unspecified',
          abhaId: clientProf?.abha_id || a.abha_id || '91-4502-8819-2041',
          bloodGroup: clientProf?.blood_group || a.blood_group || 'O+',
          allergies: clientProf?.allergies || a.allergies || 'No Known Drug Allergies (NKDA)',
          priority: resolvedPriority,
          complaint: a.complaint || a.notes || (isAssisted ? 'ASHA-assisted teleconsultation request' : isTele ? 'Teleconsultation consultation request' : 'General clinical consultation'),
          vitals: {
            bp: a.vitals_bp || 'N/A',
            hr: a.vitals_hr || 'N/A',
            spo2: a.vitals_spo2 ? `${a.vitals_spo2}%` : 'N/A',
            temp: a.vitals_temp || 'N/A',
            bmi: a.vitals_bmi || 'N/A',
          },
          type: isTele ? 'Teleconsult' : 'In-Person OPD',
          status: uiStatus,
          date: formattedDate,
          waitTime: formattedTime,
          roomId: a.room_id || undefined,
          ashaName: a.asha_name || extractedAshaName || (isAssisted ? 'Sunita Tai (ASHA)' : undefined),
          villageName: a.village_name || extractedVillageName || (isAssisted ? 'Borvihir Pada' : undefined),
          beneficiaryId: a.beneficiary_id || undefined,
          consultType: a.consult_type || (isAssisted ? 'assisted_teleconsult' : undefined),
        });
      }

      // Sort queue: Today's Emergency first, then Priority, then Routine, followed by scheduled future meetings
      deduplicatedQueue.sort((a, b) => calculatePatientQueuePriority(a) - calculatePatientQueuePriority(b));

      setQueue(deduplicatedQueue);
      if (deduplicatedQueue.length > 0 && !selectedPatientId) {
        setSelectedPatientId(deduplicatedQueue[0].id);
      }
    } catch (err) {
      console.warn('Error fetching live OPD queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  }, [supabase, selectedPatientId]);

  // Initialize doctor session, fetch queue, and subscribe to Supabase Realtime live queue changes
  useEffect(() => {
    let isMounted = true;

    async function initializeDoctorSessionAndRealtime() {
      try {
        let docId: string | null = null;
        let docName = 'Medical Officer';
        let docEmail = 'doctor@curatrack.in';

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            docId = user.id;
            docEmail = user.email || docEmail;
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (prof?.name) docName = prof.name;
          }
        } catch { }

        if (typeof window !== 'undefined') {
          try {
            const savedUser = localStorage.getItem('curatrack_auth_user');
            if (savedUser) {
              const parsed = JSON.parse(savedUser);
              if (parsed.id) docId = parsed.id;
              if (parsed.name) docName = parsed.name;
              if (parsed.email) docEmail = parsed.email;
            }
          } catch { }
        }

        const finalDocId = docId || '';
        const finalDocName = docName.startsWith('Dr.') ? docName : `Dr. ${docName}`;

        if (isMounted) {
          setActiveDoctorId(finalDocId);
          setDoctorInfo({
            id: finalDocId,
            name: `${finalDocName}, MD`,
            email: docEmail,
            facility: 'Nandurbar Sub-District Hospital',
            license: 'MMC/2026/04481',
            department: 'General Medicine & OPD Room 101',
          });
        }

        // Fetch Initial Queue Data from Supabase & Inbound Referrals
        await fetchLiveQueue(finalDocId);
        await fetchInboundReferrals();

        // Helper to check if appointment is within 5 minutes of current time or a live ringing call
        const isCallWithinFiveMinutes = (appt: any): boolean => {
          if (!appt) return false;
          const now = Date.now();

          // If live ringing call initiated right now by ASHA
          if (appt.status === 'ringing') {
            if (appt.created_at) {
              const createdMs = new Date(appt.created_at).getTime();
              return Math.abs(now - createdMs) <= 5 * 60 * 1000;
            }
            return true;
          }

          // If scheduled appointment, only pop up if within 5 minutes
          const timeStr = appt.scheduled_time || (appt.date && appt.time ? `${appt.date}T${appt.time}` : appt.created_at);
          if (!timeStr) return false;

          const scheduledMs = new Date(timeStr).getTime();
          if (isNaN(scheduledMs)) return false;

          const diffMs = scheduledMs - now;
          // Trigger if starting within the next 5 minutes or started up to 10 minutes ago and still active
          return diffMs <= 5 * 60 * 1000 && diffMs >= -10 * 60 * 1000;
        };

        // Fetch active incoming telemedicine calls
        let activeQuery = supabase
          .from('appointments')
          .select('*')
          .not('room_id', 'is', null)
          .in('status', ['active', 'ringing'])
          .order('created_at', { ascending: false });

        if (finalDocId) {
          activeQuery = activeQuery.or(`doctor_id.eq.${finalDocId},doctor_id.eq.doc-david-ross,doctor_id.ilike.%doc-%`);
        }

        const { data: activeAppts } = await activeQuery.limit(10);

        if (isMounted && activeAppts && activeAppts.length > 0) {
          const eligibleAppt = activeAppts.find(a => isCallWithinFiveMinutes(a));
          if (eligibleAppt) {
            let patientName = eligibleAppt.patient_name;
            if (!patientName && eligibleAppt.notes) {
              const patMatch = eligibleAppt.notes.match(/for patient ([^\n\.\,]+)/i) || eligibleAppt.notes.match(/for ([^\n\.\,]+)\./i);
              if (patMatch) patientName = patMatch[1].trim();
            }
            if (!patientName && eligibleAppt.client_id) {
              try {
                const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', eligibleAppt.client_id).maybeSingle();
                if (prof?.name) {
                  patientName = prof.name;
                } else if (prof?.email) {
                  patientName = prof.email.split('@')[0].replace(/[._-]/g, ' ');
                }
              } catch { }
            }
            setIncomingCall({ ...eligibleAppt, patient_name: patientName || 'Patient' });
          } else {
            setIncomingCall(null);
          }
        }
      } catch (err) {
        console.warn('Error initializing doctor session:', err);
      }
    }

    initializeDoctorSessionAndRealtime();

    // Helper for realtime listener
    const isRealtimeCallWithinFiveMinutes = (appt: any): boolean => {
      if (!appt) return false;
      const now = Date.now();

      if (appt.status === 'ringing') {
        if (appt.created_at) {
          const createdMs = new Date(appt.created_at).getTime();
          return Math.abs(now - createdMs) <= 5 * 60 * 1000;
        }
        return true;
      }

      const timeStr = appt.scheduled_time || (appt.date && appt.time ? `${appt.date}T${appt.time}` : appt.created_at);
      if (!timeStr) return false;

      const scheduledMs = new Date(timeStr).getTime();
      if (isNaN(scheduledMs)) return false;

      const diffMs = scheduledMs - now;
      return diffMs <= 5 * 60 * 1000 && diffMs >= -10 * 60 * 1000;
    };

    // Subscribe to realtime changes on appointments table for live queue (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel('doctor_portal_live_queue_v3')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        async (payload) => {
          if (!isMounted) return;

          // Refetch live queue when any appointment changes (INSERT, UPDATE, DELETE)
          fetchLiveQueue(activeDoctorId || '');

          const incoming = payload.new as Appointment;
          if (incoming && (incoming.status === 'active' || incoming.status === 'ringing') && incoming.room_id) {
            if (!isRealtimeCallWithinFiveMinutes(incoming)) {
              return;
            }

            let patientName = incoming.patient_name;
            if (!patientName && incoming.notes) {
              const patMatch = incoming.notes.match(/for patient ([^\n\.\,]+)/i) || incoming.notes.match(/for ([^\n\.\,]+)\./i);
              if (patMatch) patientName = patMatch[1].trim();
            }
            if (!patientName && incoming.client_id) {
              try {
                const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', incoming.client_id).maybeSingle();
                if (prof?.name) {
                  patientName = prof.name;
                } else if (prof?.email) {
                  patientName = prof.email.split('@')[0].replace(/[._-]/g, ' ');
                }
              } catch { }
            }

            if (isMounted) {
              setIncomingCall({
                ...incoming,
                patient_name: patientName || 'Patient',
              });
              setRealtimeConnected(true);
            }
          } else if (incoming.status === 'ended' || incoming.status === 'cancelled' || incoming.status === 'completed') {
            if (isMounted) {
              setIncomingCall(prev => (prev?.id === incoming.id ? null : prev));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isMounted) {
          setRealtimeConnected(true);
        }
      });

    // Realtime channel for inter-facility referrals (Phase 3)
    const refChannel = supabase
      .channel('doctor_referrals_live_stream')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals'
        },
        () => {
          if (isMounted) fetchInboundReferrals();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(refChannel);
    };
  }, [supabase, fetchLiveQueue, fetchInboundReferrals, activeDoctorId]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    const list = queue.filter(patient => {
      // In [ALL] tab, do NOT show patients who are already marked as Done (COMPLETED)
      if (filterType === 'ALL' && patient.status === 'COMPLETED') return false;
      if (filterType === 'WAITING' && patient.status !== 'WAITING') return false;
      if (filterType === 'EMERGENCY' && patient.priority !== 'EMERGENCY') return false;
      if (filterType === 'TELECONSULT' && patient.type !== 'Teleconsult') return false;
      if (filterType === 'COMPLETED' && patient.status !== 'COMPLETED') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          patient.name.toLowerCase().includes(q) ||
          patient.token.toLowerCase().includes(q) ||
          patient.complaint.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => calculatePatientQueuePriority(a) - calculatePatientQueuePriority(b));
  }, [queue, filterType, searchQuery]);

  // Selected Patient Object
  const selectedPatient = useMemo(() => {
    return queue.find(p => p.id === selectedPatientId) || queue[0] || null;
  }, [queue, selectedPatientId]);

  // Patient Status Change Action Handler
  const handleStatusChange = async (patientId: string, newStatus: 'WAITING' | 'IN-CONSULT' | 'COMPLETED') => {
    setQueue(prev => prev.map(p => (p.id === patientId ? { ...p, status: newStatus } : p)));
    try {
      await supabase
        .from('appointments')
        .update({ status: newStatus.toLowerCase() })
        .eq('id', patientId);
    } catch (err) {
      console.warn('Error updating status in database:', err);
    }
  };

  // Dynamic Clinical Records Loader: Loads real records when selected patient changes
  const loadPatientClinicalRecords = useCallback(async (patientClientId: string) => {
    if (!patientClientId) {
      setSoapDiagnosis('');
      setSoapNotes('');
      setPrescriptions([]);
      setSelectedLabs([]);
      setPatientTriage(null);
      return;
    }

    setLoadingClinicalRecords(true);

    try {
      // 1. Fetch all Doctor Notes / Encounter / Triage for this patient
      const { data: allNotes } = await supabase
        .from('doctor_notes')
        .select('*')
        .eq('patient_id', patientClientId)
        .order('created_at', { ascending: false });

      const notesData = allNotes && allNotes.length > 0 ? [allNotes[0]] : [];

      // 2. Fetch active Diagnoses for this patient
      const { data: diagData } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('patient_id', patientClientId)
        .order('created_at', { ascending: false });

      // 3. Fetch active Prescriptions and Medications for this patient
      const { data: rxData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientClientId)
        .order('created_at', { ascending: false });

      const { data: medData } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientClientId)
        .order('created_at', { ascending: false });

      // 4. Fetch latest Lab Results/Orders for this patient
      const { data: labData } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', patientClientId)
        .order('created_at', { ascending: false });

      // Find current selected patient queue object
      const currentPat = queue.find(p => (p.clientId || p.id) === patientClientId);
      const patPriority = currentPat?.priority || 'ROUTINE';

      let urgencyLabel = '🟢 GREEN — Routine';
      let urgencyDesc = 'Normal consultation (Standard OPD workflow)';
      if (patPriority === 'EMERGENCY') {
        urgencyLabel = '🔴 RED — Emergency';
        urgencyDesc = 'Immediate clinical attention required';
      } else if (patPriority === 'PRIORITY') {
        urgencyLabel = '🟡 YELLOW — Priority';
        urgencyDesc = 'Needs prompt assessment';
      }

      // Check if ASHA / Community Triage Screening note exists
      const triageNote = allNotes?.find(n =>
        n.visit_type === 'Triage Assessment' ||
        n.visit_type === 'Community Triage' ||
        (n.observations && n.observations.includes('[Urgency:'))
      );

      let communityAssessment = null;
      if (triageNote) {
        communityAssessment = {
          screener: triageNote.doctor || currentPat?.ashaName || 'ASHA Worker',
          date: triageNote.date || (triageNote.created_at ? new Date(triageNote.created_at).toLocaleDateString() : 'Recent'),
          summary: triageNote.summary || '',
          observations: triageNote.observations || '',
          plan: triageNote.plan || '',
        };
      }

      // Extract real medical alerts from vitals and diagnoses
      const alerts: Array<{ type: 'danger' | 'warning' | 'info'; text: string; icon: string }> = [];

      if (currentPat?.vitals) {
        const spo2Val = parseFloat(String(currentPat.vitals.spo2).replace('%', ''));
        if (!isNaN(spo2Val) && spo2Val <= 92 && spo2Val > 0) {
          alerts.push({
            type: 'danger',
            text: `Critical Hypoxemia (SpO2: ${currentPat.vitals.spo2}) — Immediate oxygen therapy indicated`,
            icon: 'air'
          });
        }

        const bpStr = currentPat.vitals.bp || '';
        if (bpStr.includes('/')) {
          const [sys, dia] = bpStr.split('/').map(Number);
          if ((sys && sys >= 140) || (dia && dia >= 90)) {
            alerts.push({
              type: 'warning',
              text: `Elevated Blood Pressure (${bpStr} mmHg) — Monitor for hypertensive urgency`,
              icon: 'vital_signs'
            });
          }
        }

        const hrVal = parseFloat(String(currentPat.vitals.hr));
        if (!isNaN(hrVal) && hrVal > 100) {
          alerts.push({
            type: 'warning',
            text: `Tachycardia (${hrVal} bpm) — Elevated heart rate alert`,
            icon: 'ecg_heart'
          });
        } else if (!isNaN(hrVal) && hrVal < 50 && hrVal > 0) {
          alerts.push({
            type: 'warning',
            text: `Bradycardia (${hrVal} bpm) — Abnormally low heart rate`,
            icon: 'ecg_heart'
          });
        }

        const tempStr = currentPat.vitals.temp || '';
        const tempVal = parseFloat(tempStr.replace('°F', '').replace('°C', ''));
        if (!isNaN(tempVal) && ((tempVal >= 100.4 && tempStr.includes('F')) || (tempVal >= 38 && tempStr.includes('C')) || tempVal >= 100.4)) {
          alerts.push({
            type: 'warning',
            text: `Febrile Core Temperature (${tempStr}) — Fever protocol active`,
            icon: 'device_thermostat'
          });
        }
      }

      // Chronic active diagnoses from database
      const pastDiagNames = (diagData || []).map((d: any) => d.name).filter(Boolean);
      for (const diag of pastDiagNames) {
        if (/sickle|anemia|diabetes|hypertension|cardiac|asthma|copd|epilepsy|kidney|pregnancy|cancer/i.test(diag)) {
          alerts.push({
            type: 'info',
            text: `Underlying Condition: ${diag}`,
            icon: 'health_and_safety'
          });
        }
      }

      setPatientTriage({
        urgency: patPriority,
        urgencyLabel,
        description: urgencyDesc,
        complaint: currentPat?.complaint || (notesData[0]?.complaint || 'General clinical consultation'),
        symptoms: currentPat?.complaint ? [currentPat.complaint] : [],
        communityAssessment,
        pastDiagnoses: pastDiagNames,
        medicalAlerts: alerts,
      });

      // Set Diagnosis
      if (diagData && diagData.length > 0 && diagData[0].name) {
        setSoapDiagnosis(diagData[0].name);
      } else if (notesData && notesData.length > 0 && notesData[0].summary) {
        setSoapDiagnosis(notesData[0].summary);
      } else {
        setSoapDiagnosis('');
      }

      // Set Clinical Findings / SOAP Notes - keep clear for new encounter editing unless custom observations exist
      if (notesData && notesData.length > 0 && notesData[0].observations && !notesData[0].observations.includes('Clinical evaluation performed') && !notesData[0].observations.includes('Chief Complaint:')) {
        setSoapNotes(notesData[0].observations);
      } else {
        setSoapNotes('');
      }

      // Build map of medication statuses (e.g. TAKEN, COMPLETED, UPCOMING)
      const medStatusMap = new Map<string, any>();
      if (medData && medData.length > 0) {
        for (const m of medData) {
          const medName = (m.name || '').toLowerCase().trim();
          if (medName) medStatusMap.set(medName, m);
          if (m.id) medStatusMap.set(m.id, m);
        }
      }

      // Reconcile Prescriptions (avoid duplicates, preserve taken/completed status)
      const reconciledRx: DoctorPrescriptionItem[] = [];
      const seenDrugs = new Set<string>();

      // 1. Process prescriptions from prescriptions table
      if (rxData && rxData.length > 0) {
        for (const r of rxData) {
          const drugName = (r.medication || r.drug || '').trim();
          const key = (r.id || drugName).toLowerCase();
          if (drugName && !seenDrugs.has(key) && !seenDrugs.has(drugName.toLowerCase())) {
            seenDrugs.add(key);
            seenDrugs.add(drugName.toLowerCase());

            const matchingMed = medStatusMap.get(r.id) || medStatusMap.get(drugName.toLowerCase());
            const currentStatus = r.status || matchingMed?.status || 'PRESCRIBED';

            reconciledRx.push({
              id: r.id,
              inventory_id: r.inventory_id || undefined,
              is_inventory: r.prescription_type ? r.prescription_type === 'INVENTORY' : (r.is_inventory ?? !!r.inventory_id),
              prescription_type: r.prescription_type || (r.is_inventory || r.inventory_id ? 'INVENTORY' : 'NON-INVENTORY'),
              status: currentStatus,
              drug: drugName,
              category: r.category || 'Prescribed Drug',
              dosage: r.dosage || 'Standard',
              frequency: r.frequency || 'OD (Once daily)',
              duration: r.date || '5 Days',
              quantity: r.quantity || 10,
              unit: r.unit || 'tablets',
              instructions: r.instructions || 'Take as directed',
            });
          }
        }
      }

      // 2. Include any medications from medications table not yet represented in prescriptions
      if (medData && medData.length > 0) {
        for (const m of medData) {
          const drugName = (m.name || '').trim();
          const key = (m.id || drugName).toLowerCase();
          if (drugName && !seenDrugs.has(key) && !seenDrugs.has(drugName.toLowerCase())) {
            seenDrugs.add(key);
            seenDrugs.add(drugName.toLowerCase());

            reconciledRx.push({
              id: m.id,
              inventory_id: m.inventory_id || undefined,
              is_inventory: m.prescription_type ? m.prescription_type === 'INVENTORY' : (m.is_inventory ?? !!m.inventory_id),
              prescription_type: m.prescription_type || (m.is_inventory || m.inventory_id ? 'INVENTORY' : 'NON-INVENTORY'),
              status: m.status || 'UPCOMING',
              drug: drugName,
              category: m.category || 'Active Medication',
              dosage: m.dosage || 'Standard',
              frequency: m.frequency || 'OD (Once daily)',
              duration: m.duration || '5 Days',
              quantity: m.quantity || 10,
              unit: m.unit || 'tablets',
              instructions: m.instructions || 'Take as directed',
            });
          }
        }
      }

      setPrescriptions(reconciledRx);

      // Set Labs
      if (labData && labData.length > 0) {
        const labs = labData.map((l: any) => l.test_name || l.test).filter(Boolean);
        setSelectedLabs(Array.from(new Set(labs)));
      } else {
        setSelectedLabs([]);
      }
    } catch (err) {
      console.warn('Error loading patient clinical history:', err);
    } finally {
      setLoadingClinicalRecords(false);
    }
  }, [supabase]);

  const selectedPatientKey = selectedPatient ? (selectedPatient.clientId || selectedPatient.id) : '';

  // Load patient clinical records on selected patient change
  useEffect(() => {
    if (!selectedPatientKey) {
      setSoapDiagnosis('');
      setSoapNotes('');
      setPrescriptions([]);
      setSelectedLabs([]);
      setPatientTriage(null);
      return;
    }

    setSubmitErrorMessage('');
    loadPatientClinicalRecords(selectedPatientKey);
  }, [selectedPatientKey, loadPatientClinicalRecords]);

  // Fetch facility bed availability from live database
  const fetchBedsData = useCallback(async () => {
    try {
      const beds = await apiFetch('/api/facility/beds');
      setBedsData(beds);
    } catch (e) {
      console.warn('Error loading bed data for doctor:', e);
    } finally {
      setLoadingBeds(false);
    }
  }, []);

  // Facility Bed Availability Real-Time Listener & Initial Fetch
  useEffect(() => {
    let isMounted = true;
    fetchBedsData();

    async function fetchAlerts() {
      try {
        const alerts = await apiFetch('/api/facility/medicine-alerts');
        if (isMounted && alerts.medicines) setMedAlerts(alerts.medicines);
      } catch (e) {
        console.warn('Error loading medicine alerts for doctor:', e);
      }
    }
    fetchAlerts();

    const channel = supabase
      .channel('facility_bed_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_beds' }, () => {
        fetchBedsData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_medicines' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchBedsData]);

  const handleAcceptCall = useCallback((targetRoomId?: string) => {
    const roomIdToJoin = targetRoomId || incomingCall?.room_id;
    if (!roomIdToJoin) return;
    router.push(`/call/${roomIdToJoin}?role=doctor`);
  }, [incomingCall, router]);

  const handleDeclineCall = useCallback(async () => {
    if (!incomingCall) return;
    const apptId = incomingCall.id;
    setIncomingCall(null);

    try {
      await supabase
        .from('appointments')
        .update({ status: 'ended' })
        .eq('id', apptId);
    } catch (err) {
      console.warn('Error declining appointment:', err);
    }
  }, [incomingCall, supabase]);

  const handleStartTeleconsult = async () => {
    // 1. If an incoming call is active, join that room!
    if (incomingCall?.room_id) {
      handleAcceptCall(incomingCall.room_id);
      return;
    }

    // 2. If the selected patient has a room_id, join that room!
    if (selectedPatient?.roomId) {
      router.push(`/call/${selectedPatient.roomId}?role=doctor`);
      return;
    }

    // 3. Query Supabase for any existing active room for this patient/doctor
    try {
      const { data: activeAppts } = await supabase
        .from('appointments')
        .select('*')
        .not('room_id', 'is', null)
        .in('status', ['active', 'ringing', 'booked'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (activeAppts && activeAppts.length > 0 && activeAppts[0].room_id) {
        router.push(`/call/${activeAppts[0].room_id}?role=doctor`);
        return;
      }
    } catch (e) { }

    // 4. Fallback: Generate room_id AND register in Supabase so patient and doctor share the SAME room!
    const newRoomId = crypto.randomUUID();
    const docId = activeDoctorId || 'doc-david-ross';
    const patId = selectedPatient?.clientId || selectedPatient?.id;

    if (patId) {
      try {
        await supabase.from('appointments').insert({
          client_id: patId,
          doctor_id: docId,
          room_id: newRoomId,
          status: 'active',
          scheduled_time: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (e) { }
    }

    router.push(`/call/${newRoomId}?role=doctor`);
  };

  // Comprehensive Clinical Encounter Submission Handler
  const handleSubmitEncounter = async () => {
    if (!selectedPatient) return;
    setSubmittingEncounter(true);
    setSubmitSuccessMessage('');
    setSubmitErrorMessage('');

    try {
      const patientClientId = selectedPatient.clientId || selectedPatient.id;
      const todayStr = new Date().toISOString().split('T')[0];
      const docName = doctorInfo.name || 'Dr. David Ross';

      // 1. Persist Diagnosis to diagnoses table (clean sync)
      await supabase.from('diagnoses').delete().eq('patient_id', patientClientId);
      if (soapDiagnosis.trim()) {
        await supabase.from('diagnoses').insert([{
          patient_id: patientClientId,
          name: soapDiagnosis.trim(),
          category: 'Clinical OPD',
          status: 'ACTIVE',
          doctor: docName,
          date: todayStr,
        }]);
      }

      // 2. Persist Doctor Notes to doctor_notes & clinical_notes tables
      if (soapNotes.trim() || soapDiagnosis.trim() || prescriptions.length > 0) {
        const chiefComplaint = (patientTriage?.complaint && typeof patientTriage.complaint === 'string' && patientTriage.complaint.trim()) ||
          (Array.isArray(patientTriage?.symptoms) && patientTriage.symptoms.length > 0 ? patientTriage.symptoms.join(', ') : '') ||
          (selectedPatient.complaint && typeof selectedPatient.complaint === 'string' && selectedPatient.complaint.trim()) ||
          'Clinical OPD Consultation';

        const prescribedMedsSummary = prescriptions.length > 0
          ? prescriptions.map(p => `${p.drug} (${p.dosage}, ${p.frequency})`).join(', ')
          : 'No active medications';

        const clinicalObs = soapNotes.trim() || `Patient: ${selectedPatient.name} (${selectedPatient.age}y/${selectedPatient.gender}) | Chief Complaint: ${chiefComplaint} | Prescribed: ${prescribedMedsSummary}`;
        const clinicalPlan = `Prescribed ${prescriptions.length} item(s): ${prescribedMedsSummary}.${selectedLabs.length > 0 ? ` Ordered labs: ${selectedLabs.join(', ')}.` : ''}`;

        const notePayload = {
          patient_id: patientClientId,
          doctor: docName,
          specialty: doctorInfo.specialty || 'General Medicine',
          date: todayStr,
          visit_type: 'OPD Encounter',
          complaint: chiefComplaint,
          observations: clinicalObs,
          plan: clinicalPlan,
          summary: soapDiagnosis.trim() || (prescriptions.length > 0 ? `Prescribed: ${prescribedMedsSummary}` : 'Clinical OPD Encounter'),
          source: 'manual'
        };
        try {
          const { error: noteErr } = await supabase.from('doctor_notes').insert([notePayload]);
          if (noteErr) console.warn('Note insert warning in doctor_notes:', noteErr);
        } catch (ne) {}

        try {
          await supabase.from('clinical_notes').delete().eq('patient_id', patientClientId);
          await supabase.from('clinical_notes').insert([{
            patient_id: patientClientId,
            doctor_name: docName,
            date: todayStr,
            summary: soapDiagnosis.trim() || (prescriptions.length > 0 ? `Prescribed: ${prescribedMedsSummary}` : 'Clinical OPD Encounter'),
            observations: clinicalObs,
            plan: clinicalPlan,
          }]);
        } catch (ce) {}
      }

      // 3. Persist Prescriptions & Medications (Active Upsert vs New Insert vs Historical Preservation)
      if (prescriptions.length > 0) {
        // Query existing records to prevent duplicates and differentiate active vs historical records
        const { data: existingRx, error: fetchRxErr } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', patientClientId);
        if (fetchRxErr) console.warn('Error fetching existing prescriptions:', fetchRxErr);

        const { data: existingMeds, error: fetchMedErr } = await supabase
          .from('medications')
          .select('*')
          .eq('patient_id', patientClientId);
        if (fetchMedErr) console.warn('Error fetching existing medications:', fetchMedErr);

        const existingRxIdSet = new Set((existingRx || []).map((r: any) => r.id));
        const existingMedIdSet = new Set((existingMeds || []).map((m: any) => m.id));

        const normalizeBaseDrug = (name: string) => {
          return (name || '')
            .toLowerCase()
            .replace(/\b\d+(\.\d+)?\s*(mg|g|mcg|ml|iu|tablets?|caps?|sachets?)\b/gi, '')
            .replace(/[()]/g, '')
            .trim();
        };

        // Index active (not taken/completed) existing records by ID and base drug name
        const activeExistingRxMap = new Map<string, any>();
        (existingRx || []).forEach((r: any) => {
          const isFinished = r.status === 'TAKEN' || r.status === 'COMPLETED' || r.status === 'GIVEN';
          if (!isFinished) {
            if (r.id) activeExistingRxMap.set(r.id, r);
            const base = normalizeBaseDrug(r.medication || r.name);
            if (base) activeExistingRxMap.set(`base:${base}`, r);
          }
        });

        const activeExistingMedMap = new Map<string, any>();
        (existingMeds || []).forEach((m: any) => {
          const isFinished = m.status === 'TAKEN' || m.status === 'COMPLETED' || m.status === 'GIVEN';
          if (!isFinished) {
            if (m.id) activeExistingMedMap.set(m.id, m);
            const base = normalizeBaseDrug(m.name);
            if (base) activeExistingMedMap.set(`base:${base}`, m);
          }
        });

        const newRxInserts: any[] = [];
        const newMedInserts: any[] = [];
        const newlyAddedInventoryItems: DoctorPrescriptionItem[] = [];

        for (const p of prescriptions) {
          const isAlreadyInDB = p.id && existingRxIdSet.has(p.id);
          const baseKey = `base:${normalizeBaseDrug(p.drug)}`;
          const activeMatchedRx = (p.id && activeExistingRxMap.get(p.id)) || activeExistingRxMap.get(baseKey);
          const activeMatchedMed = (p.id && activeExistingMedMap.get(p.id)) || activeExistingMedMap.get(baseKey);

          if (isAlreadyInDB && !activeMatchedRx) {
            // Already in database as a finished/historical prescription -> leave untouched
            continue;
          }

          if (activeMatchedRx) {
            // Existing ACTIVE medicine being edited / re-prescribed with changed dosage -> UPDATE existing record
            const rxUpdate: any = {
              medication: p.drug,
              dosage: p.dosage,
              frequency: p.frequency,
              date: p.duration || todayStr,
              duration: p.duration || '5 Days',
              instructions: p.instructions,
              quantity: p.quantity,
              prescription_type: p.is_inventory ? 'INVENTORY' : 'NON-INVENTORY',
              is_inventory: p.is_inventory,
              inventory_id: p.inventory_id || null,
            };
            if (p.status) rxUpdate.status = p.status;

            const { error: updateRxErr } = await supabase
              .from('prescriptions')
              .update(rxUpdate)
              .eq('id', activeMatchedRx.id);
            if (updateRxErr) console.warn('Error updating existing active prescription:', updateRxErr);

            if (activeMatchedMed) {
              const medUpdate: any = {
                name: p.drug,
                dosage: p.dosage,
                frequency: p.frequency,
                instructions: p.instructions,
                prescription_type: p.is_inventory ? 'INVENTORY' : 'NON-INVENTORY',
                is_inventory: p.is_inventory,
                inventory_id: p.inventory_id || null,
                date_action: todayStr,
              };
              if (p.status) medUpdate.status = p.status;

              const { error: updateMedErr } = await supabase
                .from('medications')
                .update(medUpdate)
                .eq('id', activeMatchedMed.id);
              if (updateMedErr) console.warn('Error updating existing active medication:', updateMedErr);
            }
          } else {
            // Genuinely NEW prescription (or previous ones were TAKEN/COMPLETED and preserved as historical)
            const validRxId = (p.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id))
              ? p.id
              : crypto.randomUUID();

            newRxInserts.push({
              id: validRxId,
              patient_id: patientClientId,
              medication: p.drug,
              dosage: p.dosage,
              frequency: p.frequency,
              doctor_name: docName,
              date: p.duration || todayStr,
              duration: p.duration || '5 Days',
              instructions: p.instructions,
              inventory_id: p.inventory_id || null,
              quantity: p.quantity,
              is_inventory: p.is_inventory,
              prescription_type: p.is_inventory ? 'INVENTORY' : 'NON-INVENTORY',
              status: p.status || 'PRESCRIBED'
            });

            if (!p.id || !existingMedIdSet.has(p.id)) {
              newMedInserts.push({
                id: validRxId,
                patient_id: patientClientId,
                name: p.drug,
                dosage: p.dosage,
                frequency: p.frequency,
                instructions: p.instructions,
                doctor: docName,
                status: p.status || 'UPCOMING',
                active: true,
                inventory_id: p.inventory_id || null,
                is_inventory: p.is_inventory,
                prescription_type: p.is_inventory ? 'INVENTORY' : 'NON-INVENTORY'
              });
            }

            if (p.is_inventory && p.inventory_id) {
              newlyAddedInventoryItems.push(p);
            }
          }
        }

        if (newRxInserts.length > 0) {
          const { error: rxInsertErr } = await supabase.from('prescriptions').insert(newRxInserts);
          if (rxInsertErr) {
            console.warn('Rich prescription insert failed, trying core fields fallback:', rxInsertErr);
            const coreRxInserts = newRxInserts.map(r => ({
              id: r.id,
              patient_id: r.patient_id,
              medication: r.medication,
              dosage: r.dosage,
              frequency: r.frequency,
              doctor_name: r.doctor_name,
              date: r.date,
              instructions: r.instructions
            }));
            const { error: coreRxErr } = await supabase.from('prescriptions').insert(coreRxInserts);
            if (coreRxErr) {
              console.error('Failed to persist prescriptions:', coreRxErr);
              throw new Error(`Failed to persist prescriptions: ${coreRxErr.message || 'Database error'}`);
            }
          }
        }

        if (newMedInserts.length > 0) {
          const { error: medInsertErr } = await supabase.from('medications').insert(newMedInserts);
          if (medInsertErr) {
            console.warn('Rich medication insert failed, trying core fields fallback:', medInsertErr);
            const coreMedInserts = newMedInserts.map(m => ({
              id: m.id,
              patient_id: m.patient_id,
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              instructions: m.instructions,
              doctor: m.doctor,
              status: m.status,
              active: m.active
            }));
            const { error: coreMedErr } = await supabase.from('medications').insert(coreMedInserts);
            if (coreMedErr) {
              console.error('Failed to persist medications:', coreMedErr);
              throw new Error(`Failed to persist medications: ${coreMedErr.message || 'Database error'}`);
            }
          }
        }

        // 4. Atomically deduct EDL medicines stock from facility inventory for newly added items
        if (newlyAddedInventoryItems.length > 0) {
          try {
            const rxId = `rx-${patientClientId}-${Date.now()}`;
            await apiFetch('/api/facility/medicines/deduct-stock', {
              method: 'POST',
              body: JSON.stringify({
                prescription_id: rxId,
                patient_id: patientClientId,
                items: newlyAddedInventoryItems.map(p => ({
                  medicine_id: p.inventory_id,
                  medicine_name: p.drug,
                  quantity: p.quantity || 1
                })),
                dispensed_by: docName
              })
            });
          } catch (stockErr) {
            console.warn('EDL stock deduction notification failed:', stockErr);
          }
        }
      }

      // 5. Persist Diagnostic Lab Orders (clean sync)
      await supabase.from('lab_results').delete().eq('patient_id', patientClientId).eq('status', 'Pending');
      if (selectedLabs.length > 0) {
        const labInserts = selectedLabs.map(lab => ({
          patient_id: patientClientId,
          test_name: lab,
          doctor: docName,
          date: todayStr,
          status: 'Pending',
          results: [],
        }));
        await supabase.from('lab_results').insert(labInserts);
      }

      // 6. Update Appointment status to completed in database
      if (selectedPatient.id) {
        await supabase
          .from('appointments')
          .update({
            status: 'completed',
            notes: `Encounter completed. Dx: ${soapDiagnosis.trim() || 'Reviewed'}`,
          })
          .eq('id', selectedPatient.id);
      }

      handleStatusChange(selectedPatient.id, 'COMPLETED');
      setSubmitSuccessMessage(`Encounter and ${prescriptions.length} medication order(s) successfully saved to database for ${selectedPatient.name}.`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('curatrack-prescription-issued'));
        localStorage.setItem('curatrack_rx_updated', Date.now().toString());
      }

      // 7. Refetch directly from database to confirm persisted state
      await loadPatientClinicalRecords(patientClientId);
    } catch (err: any) {
      console.error('Error persisting encounter:', err);
      setSubmitErrorMessage(`Unable to persist encounter: ${err?.message || 'Database error'}. Please retry.`);
    } finally {
      setSubmittingEncounter(false);
    }
  };

  // Referral Lifecycle Action Handler (Phase 3)
  const handleUpdateReferralStatus = async (refId: string, newStatus: string) => {
    try {
      await apiFetch(`/api/referrals/${refId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: newStatus,
          notes: `Referral advanced to ${newStatus} by ${doctorInfo.name}`,
          updated_by: doctorInfo.name
        })
      });
      fetchInboundReferrals();
    } catch (err: any) {
      alert('Failed to update referral: ' + (err.message || 'Error'));
    }
  };

  // ASHA Closed-Loop Task Dispatch Handler (Phase 7)
  const handleAssignAshaFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setAssigningTask(true);
    try {
      const patientClientId = selectedPatient.clientId || selectedPatient.id;
      await apiFetch('/api/fhw/followups/create', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientClientId,
          patient_name: selectedPatient.name,
          assigned_by_doctor_id: doctorInfo.id,
          assigned_by_doctor_name: doctorInfo.name,
          assigned_asha_name: selectedPatient.ashaName || 'Sunita Tai (ASHA #402)',
          task_type: ashaTaskData.task_type,
          instructions: ashaTaskData.instructions,
          priority: ashaTaskData.priority,
          due_date: ashaTaskData.due_date
        })
      });
      setAshaSuccessMsg(`Follow-up task dispatched to ${selectedPatient.ashaName || 'ASHA worker'} successfully!`);
      setTimeout(() => {
        setShowAshaModal(false);
        setAshaSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      alert('Failed to assign ASHA follow-up task: ' + (err.message || 'Error'));
    } finally {
      setAssigningTask(false);
    }
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    setPrescriptions(prev => prev.filter(item => item.id !== prescriptionId));
    if (!selectedPatient) return;
    try {
      await supabase.from('prescriptions').delete().eq('id', prescriptionId);
      await supabase.from('medications').delete().eq('id', prescriptionId);
    } catch (err) {
      console.warn('Error deleting prescription from database:', err);
    }
  };

  const handleAddDrug = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const drugName = isNonInventoryMode ? draftDrugName.trim() : (selectedInventoryMed?.name || draftDrugName.trim());
    if (!drugName) {
      alert('Please search and select a facility medicine or enter a non-inventory medicine name.');
      return;
    }

    const qty = Math.max(1, draftQuantity || 1);

    if (!isNonInventoryMode && selectedInventoryMed) {
      if (qty > selectedInventoryMed.stock_units) {
        setStockWarning(t('doctor.insufficientStock', { available: selectedInventoryMed.stock_units }, `Insufficient facility stock. Available: ${selectedInventoryMed.stock_units}`));
      }
    }

    const newItem: DoctorPrescriptionItem = {
      id: crypto.randomUUID(),
      inventory_id: (!isNonInventoryMode && selectedInventoryMed) ? selectedInventoryMed.id : undefined,
      is_inventory: !isNonInventoryMode && !!selectedInventoryMed,
      prescription_type: (!isNonInventoryMode && selectedInventoryMed) ? 'INVENTORY' : 'NON-INVENTORY',
      status: 'PRESCRIBED',
      drug: drugName,
      category: selectedInventoryMed?.category || (isNonInventoryMode ? 'Non-Inventory' : 'General EDL'),
      dosage: draftDosage.trim() || '500mg',
      frequency: draftFrequency || 'BD (Twice daily)',
      duration: draftDuration.trim() || '5 Days',
      quantity: qty,
      unit: selectedInventoryMed?.unit || 'tablets',
      available_stock: selectedInventoryMed?.stock_units,
      stock_status: selectedInventoryMed?.status,
      instructions: draftInstructions.trim() || 'Take after meals'
    };

    setPrescriptions(prev => [...prev, newItem]);

    // Reset draft form
    setSelectedInventoryMed(null);
    setIsNonInventoryMode(false);
    setDraftDrugName('');
    setDraftDosage('500mg');
    setDraftQuantity(10);
    setDraftInstructions('Take after meals');
    setStockWarning(null);
  };

  const toggleLab = (lab: string) => {
    setSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  };

  if (!mounted) {
    return (
      <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
        <div className="h-44 bg-surface-container rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-24 bg-surface-container rounded-3xl" />
          <div className="h-24 bg-surface-container rounded-3xl" />
          <div className="h-24 bg-surface-container rounded-3xl" />
          <div className="h-24 bg-surface-container rounded-3xl" />
        </div>
        <div className="h-96 bg-surface-container rounded-3xl" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6 relative">
      {/* Floating Incoming Teleconsultation Banner/Modal */}
      {incomingCall && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full bg-slate-900/95 backdrop-blur-xl border border-teal-500/40 p-6 rounded-3xl shadow-2xl text-white animate-bounce-short">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                {incomingCall.consult_type === 'assisted_teleconsult' ? 'Incoming ASHA-Assisted Teleconsultation' : 'Incoming Teleconsultation'}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono border border-teal-500/30">
              Live Ringing
            </span>
          </div>

          <div className="space-y-1 mb-4">
            <h4 className="text-xl font-black text-white">{incomingCall.patient_name || 'Kavita Bai'}</h4>
            <p className="text-xs text-slate-300">
              {incomingCall.asha_name
                ? `${incomingCall.asha_name} is connecting this patient from ${incomingCall.village_name || 'the field'}`
                : 'Patient is waiting in virtual consultation room'}
            </p>
            {incomingCall.complaint && (
              <p className="text-xs text-slate-200 bg-white/10 rounded-2xl p-3 mt-2 line-clamp-3">
                {incomingCall.complaint}
              </p>
            )}
            <p className="text-[11px] font-mono text-teal-300/80 truncate">
              Room ID: {incomingCall.room_id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDeclineCall}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-red-400">call_end</span>
              <span>Decline</span>
            </button>
            <button
              onClick={() => handleAcceptCall(incomingCall.room_id)}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              <span>Accept & Join</span>
            </button>
          </div>
        </div>
      )}


      {/* Hero Banner from drawing with + Telecon */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold text-teal-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Clinical OPD Session • Room 101</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{doctorInfo.facility}</h2>
          <p className="text-xs text-teal-100/80 max-w-xl">
            Certified OPD Station • License: <span className="font-mono text-white font-bold">{doctorInfo.license}</span> • Connected to District Health Network
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleStartTeleconsult}
            className="px-6 py-3 bg-white text-slate-950 hover:bg-teal-50 font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer border border-white/20"
          >
            <span className="material-symbols-outlined text-lg text-teal-700">video_call</span>
            <span>+ Telecon</span>
          </button>
        </div>
      </div>

      {/* Patient Records Section matching wireframe */}
      <div className="bg-white border border-surface-container-high rounded-3xl p-6 lg:p-8 shadow-card space-y-6">
        {/* Section Header: Title on Left, Count Critical Patients on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
          <div>
            <h3 className="text-2xl font-black text-on-surface tracking-tight">Patient Details</h3>
          </div>

          {/* Count Critical Patients Badge Box from drawing */}
          <div className="flex items-center gap-3 px-5 py-3 bg-red-50/90 border-2 border-red-200 rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shrink-0">
              <span className="material-symbols-outlined text-xl">emergency</span>
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-red-900 block">Count Critical Patients:</span>
              <span className="text-2xl font-black text-red-600 leading-none block mt-0.5">
                {queue.filter(p => p.priority === 'EMERGENCY').length}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar matching drawing */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary text-xl">search</span>
          <input
            type="text"
            placeholder="🔍 search bar (Filter by patient name, token, vitals or chief complaint...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-2xl text-xs font-bold border-2 border-surface-container-high outline-none focus:border-primary focus:bg-white transition-all text-on-surface placeholder:text-tertiary"
          />
        </div>

        {/* Filter Tabs matching drawing: [ ALL ] [ Waiting ] [ Done ] */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'ALL', count: queue.filter(p => p.status !== 'COMPLETED').length },
            { id: 'WAITING', label: 'Waiting', count: queue.filter(p => p.status === 'WAITING' || p.status === 'IN-CONSULT').length },
            { id: 'COMPLETED', label: 'Done', count: queue.filter(p => p.status === 'COMPLETED').length },
            { id: 'EMERGENCY', label: 'Critical', count: queue.filter(p => p.priority === 'EMERGENCY').length },
            { id: 'REFERRALS', label: 'Inbound Referrals', count: inboundReferrals.filter(r => r.status !== 'COMPLETED').length }
          ].map(tab => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-surface-container-low text-tertiary border-surface-container-high hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Patient Cards Stack */}
        <div className="space-y-3 pt-2">
          {filterType === 'REFERRALS' ? (
            <div className="space-y-3">
              {loadingReferrals ? (
                <div className="p-10 text-center bg-surface-container-low/40 rounded-2xl border border-surface-container-high space-y-2">
                  <span className="material-symbols-outlined text-3xl text-teal-600 animate-spin">sync</span>
                  <p className="text-xs font-bold text-tertiary">Loading incoming inter-facility referrals...</p>
                </div>
              ) : inboundReferrals.length === 0 ? (
                <div className="p-10 text-center bg-surface-container-low/40 rounded-2xl border border-dashed border-surface-container-high space-y-2">
                  <span className="material-symbols-outlined text-4xl text-tertiary">alt_route</span>
                  <h4 className="text-sm font-bold text-on-surface">No Inbound Referrals</h4>
                  <p className="text-xs text-tertiary">Incoming referrals from rural Sub-Centres and PHCs will appear here in real time.</p>
                </div>
              ) : (
                inboundReferrals.map(ref => (
                  <div
                    key={ref.id}
                    className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${
                      ref.status === 'OVERDUE_ESCALATED'
                        ? 'bg-red-50 border-red-300 ring-1 ring-red-400'
                        : ref.urgency === 'EMERGENCY'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-white border-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-black text-xs">
                        {ref.referral_token || ref.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ref.status === 'OVERDUE_ESCALATED'
                          ? 'bg-red-600 text-white animate-pulse'
                          : ref.urgency === 'EMERGENCY'
                            ? 'bg-red-100 text-red-800'
                            : ref.urgency === 'URGENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ref.status === 'OVERDUE_ESCALATED' ? '🔴 SLA OVERDUE' : ref.urgency}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-base text-on-surface">{ref.patient_name} ({ref.patient_age}y / {ref.patient_gender})</h4>
                      <p className="text-tertiary text-xs font-medium">From: <strong className="text-slate-800">{ref.referring_facility_name}</strong> ({ref.referring_doctor_name})</p>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container text-xs">
                      <p className="text-on-surface font-medium">
                        <strong className="font-bold">Clinical Reason:</strong> {ref.clinical_reason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-tertiary font-bold">Status: <strong className="text-primary font-black">{ref.status}</strong></span>
                      <div className="flex items-center gap-2">
                        {ref.status === 'CREATED' && (
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'ACCEPTED')}
                            className="px-3.5 py-1.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
                          >
                            Accept Referral
                          </button>
                        )}
                        {ref.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'IN_TRANSIT')}
                            className="px-3.5 py-1.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all cursor-pointer"
                          >
                            Mark In Transit
                          </button>
                        )}
                        {ref.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'ARRIVED')}
                            className="px-3.5 py-1.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all cursor-pointer"
                          >
                            Mark Arrived
                          </button>
                        )}
                        {ref.status === 'ARRIVED' && (
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'CONSULTED')}
                            className="px-3.5 py-1.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                          >
                            Start Consult
                          </button>
                        )}
                        {ref.status === 'CONSULTED' && (
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'COMPLETED')}
                            className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all cursor-pointer"
                          >
                            Discharge & Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {loadingQueue ? (
                <div className="p-12 text-center bg-surface-container-low/40 rounded-3xl border border-surface-container-high space-y-2">
                  <span className="material-symbols-outlined text-4xl text-teal-600 animate-spin">sync</span>
                  <p className="text-xs font-bold text-tertiary">Loading live patient records from database...</p>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="p-12 text-center bg-surface-container-low/40 rounded-3xl border border-dashed border-surface-container-high space-y-2">
                  <span className="material-symbols-outlined text-4xl text-tertiary">assignment_turned_in</span>
                  <h4 className="text-base font-bold text-on-surface">No Patients in OPD Queue</h4>
                  <p className="text-xs text-tertiary">
                    Active consultations and live appointment requests will appear here automatically in real time.
                  </p>
                </div>
              ) : (
                filteredQueue.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => handleOpenPatientModal(patient)}
                    className="p-5 rounded-2xl border-2 border-surface-container-high bg-white hover:border-primary/60 hover:shadow-md transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Token Tag from drawing */}
                        <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-black text-xs shadow-xs">
                          {patient.token}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-on-surface group-hover:text-primary transition-colors">
                              {patient.name}
                            </h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              patient.priority === 'EMERGENCY'
                                ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                : patient.priority === 'PRIORITY'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {patient.priority}
                            </span>
                            {patient.status === 'COMPLETED' && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                ✓ Done
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-tertiary font-semibold mt-0.5">
                            {patient.age}y / {patient.gender} • ABHA: <strong className="font-mono text-slate-800">{patient.abhaId}</strong> • {patient.type} {patient.villageName ? `• ${patient.villageName}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* VIEW Button from drawing */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPatientModal(patient);
                          }}
                          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>VIEW</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* Vitals Line from drawing */}
                    <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-700">
                        <span className="text-primary font-black uppercase text-[11px]">Vitals:</span>
                        <span>BP: <strong className="text-slate-900 font-bold">{patient.vitals.bp}</strong></span>
                        <span>•</span>
                        <span>HR: <strong className="text-slate-900 font-bold">{patient.vitals.hr} bpm</strong></span>
                        <span>•</span>
                        <span>SpO2: <strong className="text-slate-900 font-bold">{patient.vitals.spo2}%</strong></span>
                        <span>•</span>
                        <span>Temp: <strong className="text-slate-900 font-bold">{patient.vitals.temp}</strong></span>
                        {patient.vitals.bmi && (
                          <>
                            <span>•</span>
                            <span>BMI: <strong className="text-slate-900 font-bold">{patient.vitals.bmi}</strong></span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] text-tertiary font-medium flex items-center gap-2">
                        <span>Date: <strong className="text-slate-800 font-bold">{patient.date}</strong></span>
                        <span>•</span>
                        <span>Time: <strong className="text-slate-800 font-bold">{patient.waitTime}</strong></span>
                      </div>
                    </div>

                    {/* Complaint snippet */}
                    <p className="text-xs text-slate-700 font-medium line-clamp-1">
                      <strong className="text-slate-900 font-bold">Complaint:</strong> {patient.complaint}
                    </p>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Consultation & Prescription Pop-up Modal */}
      {isModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-surface-container-high my-auto overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-white/20 text-white font-mono font-black text-xs">
                  {selectedPatient.token}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black">{selectedPatient.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedPatient.priority === 'EMERGENCY' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {selectedPatient.priority}
                    </span>
                  </div>
                  <p className="text-xs text-teal-200 font-medium mt-0.5">
                    {selectedPatient.age}y / {selectedPatient.gender} • ABHA: <span className="font-mono text-white font-bold">{selectedPatient.abhaId}</span> • Blood: <strong className="text-red-300 font-bold">{selectedPatient.bloodGroup}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                title="Close Modal"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Quick Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-surface-container-low rounded-2xl border border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Quick Actions:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      handleStartTeleconsult();
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">video_call</span>
                    <span>Start Teleconsult</span>
                  </button>
                  <Link
                    href={`/records?patientId=${selectedPatient.clientId || selectedPatient.id}`}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-base text-purple-700">folder_shared</span>
                    <span>Patient Records</span>
                  </Link>
                  <button
                    onClick={() => setShowAshaModal(true)}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-amber-700">home_health</span>
                    <span>Assign ASHA Task</span>
                  </button>
                </div>
              </div>

              {/* Vitals Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-white border border-surface-container rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-tertiary uppercase block">Blood Pressure</span>
                  <span className="text-base font-black text-slate-900 block mt-0.5">{selectedPatient.vitals.bp}</span>
                </div>
                <div className="p-3 bg-white border border-surface-container rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-tertiary uppercase block">Heart Rate</span>
                  <span className="text-base font-black text-slate-900 block mt-0.5">{selectedPatient.vitals.hr} bpm</span>
                </div>
                <div className="p-3 bg-white border border-surface-container rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-tertiary uppercase block">Oxygen (SpO2)</span>
                  <span className="text-base font-black text-slate-900 block mt-0.5">{selectedPatient.vitals.spo2}%</span>
                </div>
                <div className="p-3 bg-white border border-surface-container rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-tertiary uppercase block">Temperature</span>
                  <span className="text-base font-black text-slate-900 block mt-0.5">{selectedPatient.vitals.temp}</span>
                </div>
                <div className="p-3 bg-white border border-surface-container rounded-2xl text-center shadow-xs">
                  <span className="text-[10px] font-bold text-tertiary uppercase block">Allergies</span>
                  <span className="text-xs font-black text-red-600 block mt-0.5 truncate">{selectedPatient.allergies || 'NKDA'}</span>
                </div>
              </div>

              {/* Clinical Diagnosis & SOAP Notes */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">stethoscope</span>
                  <span>Clinical Assessment & Diagnosis</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">Provisional Diagnosis</label>
                    <input
                      type="text"
                      value={soapDiagnosis}
                      onChange={e => setSoapDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Bronchitis / Viral Gastroenteritis / Type 2 Diabetes"
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-surface-container-high font-bold text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">SOAP Clinical Notes & Observations</label>
                    <textarea
                      rows={2}
                      value={soapNotes}
                      onChange={e => setSoapNotes(e.target.value)}
                      placeholder="Enter clinical observations, physical exam findings, and management plan..."
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-surface-container-high font-medium text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Prescription Pad Section */}
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-teal-950 flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-700 text-lg">prescriptions</span>
                    <span>Give Prescription (EDL & Verified Drugs)</span>
                  </h4>
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-lg">
                    {prescriptions.length} Meds Prescribed
                  </span>
                </div>

                {/* Add Medicine Form */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-teal-100">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase text-tertiary block">
                        {isNonInventoryMode ? 'Non-Inventory Medicine Name' : 'Search Facility Medicine Inventory'}
                      </label>
                      {isNonInventoryMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsNonInventoryMode(false);
                            setSelectedInventoryMed(null);
                            setDraftDrugName('');
                            setStockWarning(null);
                          }}
                          className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">arrow_back</span>
                          <span>Switch to Facility Inventory Search</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectNonInventoryMed('')}
                          className="text-[11px] text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer"
                        >
                          + Prescribe Non-Inventory Medicine
                        </button>
                      )}
                    </div>

                    {isNonInventoryMode ? (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={draftDrugName}
                          onChange={(e) => setDraftDrugName(e.target.value)}
                          placeholder="Enter medicine name (e.g. Paracetamol 650mg)..."
                          className="w-full px-3.5 py-2 bg-white rounded-xl text-xs font-bold border border-purple-300 focus:border-purple-600 outline-none text-purple-950"
                        />
                      </div>
                    ) : (
                      <MedicineSearchDropdown
                        onSelectInventoryMedicine={handleSelectInventoryMed}
                        onSelectNonInventoryMedicine={handleSelectNonInventoryMed}
                        selectedInventoryId={selectedInventoryMed?.id}
                        selectedName={draftDrugName}
                        isNonInventory={isNonInventoryMode}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">Dosage</label>
                      <input
                        type="text"
                        value={draftDosage}
                        onChange={e => setDraftDosage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface-container-low rounded-xl border text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">Frequency</label>
                      <select
                        value={draftFrequency}
                        onChange={e => handleFrequencyChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface-container-low rounded-xl border text-xs font-bold"
                      >
                        <option value="OD (Once daily)">OD (Once daily)</option>
                        <option value="BD (Twice daily)">BD (Twice daily)</option>
                        <option value="TDS (Thrice daily)">TDS (Thrice daily)</option>
                        <option value="QDS (4 times daily)">QDS (4 times daily)</option>
                        <option value="SOS (As needed)">SOS (As needed)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">Duration</label>
                      <select
                        value={draftDuration}
                        onChange={e => handleDurationChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface-container-low rounded-xl border text-xs font-bold"
                      >
                        <option value="3 Days">3 Days</option>
                        <option value="5 Days">5 Days</option>
                        <option value="7 Days">7 Days</option>
                        <option value="10 Days">10 Days</option>
                        <option value="14 Days">14 Days</option>
                        <option value="30 Days">30 Days (Chronic)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={draftQuantity}
                        onChange={e => handleQuantityChange(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-1.5 bg-surface-container-low rounded-xl border text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-tertiary block mb-1">Instructions</label>
                    <input
                      type="text"
                      value={draftInstructions}
                      onChange={e => setDraftInstructions(e.target.value)}
                      placeholder="e.g. Take after meals with warm water"
                      className="w-full px-3 py-1.5 bg-surface-container-low rounded-xl border text-xs font-bold"
                    />
                  </div>

                  {stockWarning && (
                    <p className="text-amber-700 text-xs font-bold bg-amber-50 p-2 rounded-xl border border-amber-200">
                      ⚠️ {stockWarning}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleAddDrug}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    <span>Add Medication</span>
                  </button>
                </div>

                {/* Active Prescribed List */}
                {prescriptions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-tertiary block">Prescribed Medicines:</span>
                    {prescriptions.map(p => (
                      <div key={p.id} className="p-3 bg-white rounded-xl border border-surface-container flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 font-extrabold">{p.drug}</strong>
                            {p.status && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                p.status === 'TAKEN' || p.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : p.status === 'MISSED'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                {p.status === 'TAKEN' ? '✓ Taken' : p.status}
                              </span>
                            )}
                          </div>
                          <span className="text-tertiary font-semibold">({p.dosage}, {p.frequency}, {p.duration})</span>
                          <p className="text-tertiary text-[11px] mt-0.5">{p.quantity} {p.unit} • {p.instructions}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePrescription(p.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                          title="Remove"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnostic Lab Ordering */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-tertiary block">Order Diagnostic Lab Tests</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Complete Blood Count (CBC)', 'Rapid Malarial Antigen', 'Sickle Cell Test', 'Fasting Blood Glucose', 'Serum Creatinine', '12-Lead ECG'].map(lab => {
                    const isSel = selectedLabs.includes(lab);
                    return (
                      <button
                        key={lab}
                        type="button"
                        onClick={() => toggleLab(lab)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          isSel ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500/30' : 'bg-white border-surface-container text-slate-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{isSel ? 'check_box' : 'check_box_outline_blank'}</span>
                        <span className="truncate">{lab}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Messages */}
              {submitSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                  <span>{submitSuccessMessage}</span>
                </div>
              )}
              {submitErrorMessage && (
                <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">error</span>
                  <span>{submitErrorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-surface-container-low border-t border-surface-container flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-white text-slate-700 border border-surface-container font-bold text-xs rounded-xl hover:bg-surface-container transition-all cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={submittingEncounter}
                  onClick={async () => {
                    await handleSubmitEncounter();
                    setTimeout(() => {
                      setIsModalOpen(false);
                    }, 1500);
                  }}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  aria-label="Submit Encounter"
                >
                  <span className={`material-symbols-outlined text-base ${submittingEncounter ? 'animate-spin' : ''}`}>
                    {submittingEncounter ? 'sync' : 'done_all'}
                  </span>
                  <span>{submittingEncounter ? 'Persisting to Database...' : t('doctor.submitEncounter', 'Submit Encounter & Order EDL Drugs')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASHA Follow-up Dispatch Modal (Closed-Loop Workflow Phase 7) */}
      {showAshaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl border border-surface-container-high space-y-5">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <span className="material-symbols-outlined">home_health</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-on-surface">Assign ASHA Field Follow-up</h3>
                  <p className="text-xs text-tertiary">Dispatches home visit task to village frontline worker</p>
                </div>
              </div>
              <button
                onClick={() => setShowAshaModal(false)}
                className="p-1.5 text-tertiary hover:text-on-surface rounded-xl hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {ashaSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <span>{ashaSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleAssignAshaFollowup} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-tertiary uppercase text-[10px] block mb-1">Patient</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedPatient?.name} (${selectedPatient?.age}y / ${selectedPatient?.gender})`}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface"
                  />
                </div>

                <div>
                  <label className="text-tertiary uppercase text-[10px] block mb-1">Assigned Frontline Worker</label>
                  <input
                    type="text"
                    disabled
                    value={selectedPatient?.ashaName || 'Sunita Tai (ASHA #402 - Nandurbar Block A)'}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-tertiary uppercase text-[10px] block mb-1">Task Protocol Type</label>
                    <select
                      value={ashaTaskData.task_type}
                      onChange={e => setAshaTaskData({ ...ashaTaskData, task_type: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-surface-container-high text-on-surface"
                    >
                      <option value="Post-Op Check">Post-Op Wound Check Day 5</option>
                      <option value="Medication Adherence">Medication Adherence Check</option>
                      <option value="IFA & Nutrition Check">IFA & Nutrition Verification</option>
                      <option value="ANC Danger Signs Check">ANC Danger Signs Screening</option>
                      <option value="BP & Glucose Check">BP & Blood Glucose Screening</option>
                      <option value="TB DOTS Verification">TB DOTS Adherence Verification</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-tertiary uppercase text-[10px] block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={ashaTaskData.due_date}
                      onChange={e => setAshaTaskData({ ...ashaTaskData, due_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-surface-container-high text-on-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-tertiary uppercase text-[10px] block mb-1">Special Clinical Instructions for ASHA</label>
                  <textarea
                    rows={3}
                    value={ashaTaskData.instructions}
                    onChange={e => setAshaTaskData({ ...ashaTaskData, instructions: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-surface-container-high text-on-surface font-medium"
                    placeholder="Provide specific guidelines for home visit..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                  <button
                    type="button"
                    onClick={() => setShowAshaModal(false)}
                    className="px-4 py-2 bg-surface-container text-slate-700 font-bold rounded-xl hover:bg-surface-container-high transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigningTask}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>{assigningTask ? 'Dispatching...' : 'Dispatch Task to ASHA'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
