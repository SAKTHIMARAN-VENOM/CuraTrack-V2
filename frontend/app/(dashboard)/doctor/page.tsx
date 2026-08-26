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
    id: 'doc-david-ross',
    name: 'Dr. David Ross, MD',
    email: 'dr.david.ross@curatrack.com',
    facility: 'Nandurbar Sub-District Hospital',
    license: 'MMC/2026/04481',
    department: 'General Medicine & OPD Room 101',
  });

  const [queue, setQueue] = useState<OPDQueuePatient[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

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

      const formattedQueue: OPDQueuePatient[] = dbAppts.map((a: any, idx: number) => {
        const resolvedClientId = a.client_id || a.patient_id || a.user_id || a.id;
        const clientProf = profilesMap[resolvedClientId] || profilesMap[a.client_id] || profilesMap[a.patient_id];
        let pName = a.patient_name;
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

        const isTele = Boolean(a.room_id || a.status === 'ringing' || a.type === 'video');
        const isAssisted = a.consult_type === 'assisted_teleconsult' || Boolean(a.asha_name || a.beneficiary_id);
        const isEmergency = a.priority === 'EMERGENCY' || a.status === 'ringing';

        let uiStatus: 'WAITING' | 'IN-CONSULT' | 'COMPLETED' = 'WAITING';
        if (a.status === 'in-consult' || a.status === 'in_progress') {
          uiStatus = 'IN-CONSULT';
        } else if (a.status === 'completed' || a.status === 'ended') {
          uiStatus = 'COMPLETED';
        } else {
          uiStatus = 'WAITING';
        }

        const formattedTime = a.scheduled_time
          ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : a.time || 'Just now';

        return {
          id: a.id,
          clientId: resolvedClientId,
          token: a.token || `TKN-${String(idx + 1).padStart(3, '0')}`,
          name: pName,
          age: clientProf?.age || (a.age ? Number(a.age) : 32),
          gender: clientProf?.gender || a.gender || 'Unspecified',
          abhaId: clientProf?.abha_id || a.abha_id || '91-4502-8819-2041',
          bloodGroup: clientProf?.blood_group || a.blood_group || 'O+',
          allergies: clientProf?.allergies || a.allergies || 'No Known Drug Allergies (NKDA)',
          priority: isEmergency ? 'EMERGENCY' : a.priority === 'PRIORITY' ? 'PRIORITY' : 'ROUTINE',
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
          waitTime: formattedTime,
          roomId: a.room_id || undefined,
          ashaName: a.asha_name || undefined,
          villageName: a.village_name || undefined,
          beneficiaryId: a.beneficiary_id || undefined,
          consultType: a.consult_type || undefined,
        };
      });

      setQueue(formattedQueue);
      if (formattedQueue.length > 0 && !selectedPatientId) {
        setSelectedPatientId(formattedQueue[0].id);
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
        let docName = 'Dr. David Ross';
        let docEmail = 'dr.david.ross@curatrack.com';

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

        const finalDocId = docId || 'doc-david-ross';
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

        const { data: activeAppts } = await activeQuery.limit(1);

        if (isMounted && activeAppts && activeAppts.length > 0) {
          const appt = activeAppts[0];
          let patientName = 'Patient';
          if (appt.client_id) {
            try {
              const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', appt.client_id).maybeSingle();
              if (prof?.name) {
                patientName = prof.name;
              } else if (prof?.email) {
                patientName = prof.email.split('@')[0].replace(/[._-]/g, ' ');
              }
            } catch { }
          }
          setIncomingCall({ ...appt, patient_name: patientName });
        }
      } catch (err) {
        console.warn('Error initializing doctor session:', err);
      }
    }

    initializeDoctorSessionAndRealtime();

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
            let patientName = 'Patient';
            if (incoming.client_id) {
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
                patient_name: patientName,
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
    return queue.filter(patient => {
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

      // Set Clinical Findings / SOAP Notes
      if (notesData && notesData.length > 0 && (notesData[0].observations || notesData[0].plan || notesData[0].complaint)) {
        const obs = [
          notesData[0].complaint ? `Complaint: ${notesData[0].complaint}` : '',
          notesData[0].observations ? `Observations: ${notesData[0].observations}` : '',
          notesData[0].plan ? `Plan: ${notesData[0].plan}` : '',
        ].filter(Boolean).join('\n');
        setSoapNotes(obs);
      } else {
        setSoapNotes(currentPat?.complaint && currentPat.complaint !== 'General clinical consultation' ? `Chief Complaint: ${currentPat.complaint}` : '');
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
  }, [supabase, queue]);

  // Load patient clinical records on selected patient change
  useEffect(() => {
    if (!selectedPatient) {
      setSoapDiagnosis('');
      setSoapNotes('');
      setPrescriptions([]);
      setSelectedLabs([]);
      setPatientTriage(null);
      return;
    }

    const patientClientId = selectedPatient.clientId || selectedPatient.id;
    setSubmitSuccessMessage('');
    setSubmitErrorMessage('');
    loadPatientClinicalRecords(patientClientId);
  }, [selectedPatient?.clientId, selectedPatient?.id, loadPatientClinicalRecords]);

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

      // 2. Persist Clinical Notes to clinical_notes table (clean sync)
      await supabase.from('clinical_notes').delete().eq('patient_id', patientClientId);
      if (soapNotes.trim() || soapDiagnosis.trim()) {
        await supabase.from('clinical_notes').insert([{
          patient_id: patientClientId,
          doctor_name: docName,
          date: todayStr,
          summary: soapDiagnosis.trim() || 'Clinical OPD Encounter',
          observations: soapNotes.trim(),
          plan: `Prescribed ${prescriptions.length} medication(s). Ordered ${selectedLabs.length} diagnostic test(s).`,
        }]);
      }

      // 3. Persist Prescriptions & Medications (Incremental Upsert/Merge without deleting history)
      if (prescriptions.length > 0) {
        // Query existing records to prevent duplicates and keep taken/completed status
        const { data: existingRx } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('patient_id', patientClientId);

        const { data: existingMeds } = await supabase
          .from('medications')
          .select('*')
          .eq('patient_id', patientClientId);

        const existingRxIdSet = new Set((existingRx || []).map((r: any) => r.id));
        const existingRxNameSet = new Set((existingRx || []).map((r: any) => (r.medication || r.drug || '').toLowerCase().trim()));

        const existingMedMap = new Map<string, any>();
        (existingMeds || []).forEach((m: any) => {
          if (m.id) existingMedMap.set(m.id, m);
          if (m.name) existingMedMap.set(m.name.toLowerCase().trim(), m);
        });

        const newRxInserts: any[] = [];
        const newMedInserts: any[] = [];
        const newlyAddedInventoryItems: DoctorPrescriptionItem[] = [];

        for (const p of prescriptions) {
          const isPersistedRx = p.id ? existingRxIdSet.has(p.id) : false;
          const existingMed = p.id ? existingMedMap.get(p.id) : null;
          const validRxId = (p.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id))
            ? p.id
            : crypto.randomUUID();

          if (!isPersistedRx) {
            newRxInserts.push({
              id: validRxId,
              patient_id: patientClientId,
              medication: p.drug,
              dosage: p.dosage,
              frequency: p.frequency,
              doctor_name: docName,
              date: p.duration || todayStr,
              instructions: p.instructions,
              inventory_id: p.inventory_id || null,
              quantity: p.quantity,
              is_inventory: p.is_inventory,
              prescription_type: p.is_inventory ? 'INVENTORY' : 'NON-INVENTORY',
              status: p.status || 'PRESCRIBED'
            });

            if (p.is_inventory && p.inventory_id) {
              newlyAddedInventoryItems.push(p);
            }
          } else if (p.status) {
            // Update status of existing persisted prescription & medication
            const { error: syncRxErr } = await supabase
              .from('prescriptions')
              .update({ status: p.status })
              .eq('patient_id', patientClientId)
              .eq('medication', p.drug);
            if (syncRxErr) console.warn('Error syncing existing prescription status:', syncRxErr);

            const { error: syncMedErr } = await supabase
              .from('medications')
              .update({ status: p.status, date_action: todayStr })
              .eq('patient_id', patientClientId)
              .eq('name', p.drug);
            if (syncMedErr) console.warn('Error syncing existing medication status:', syncMedErr);
          }

          if (!existingMed) {
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

  const handleTogglePrescriptionStatus = async (prescriptionId: string) => {
    const targetPrescription = prescriptions.find(p => p.id === prescriptionId);
    if (!targetPrescription) return;

    const nextStatus = (targetPrescription.status === 'TAKEN' || targetPrescription.status === 'COMPLETED') ? 'PRESCRIBED' : 'TAKEN';
    const updatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // 1. Update React local state immediately
    setPrescriptions(prev =>
      prev.map(item =>
        item.id === prescriptionId
          ? { ...item, status: nextStatus }
          : item
      )
    );

    // 2. Persist status update to Supabase
    if (selectedPatient) {
      const patientClientId = selectedPatient.clientId || selectedPatient.id;
      try {
        if (prescriptionId && !prescriptionId.startsWith('rx-')) {
          const { error: rxErr1 } = await supabase
            .from('prescriptions')
            .update({ status: nextStatus })
            .eq('id', prescriptionId);
          if (rxErr1) console.warn('Error updating prescription status by id:', rxErr1);

          const { error: medErr1 } = await supabase
            .from('medications')
            .update({ status: nextStatus, date_action: updatedDate })
            .eq('id', prescriptionId);
          if (medErr1) console.warn('Error updating medication status by id:', medErr1);
        }

        if (patientClientId && targetPrescription.drug) {
          const { error: rxErr2 } = await supabase
            .from('prescriptions')
            .update({ status: nextStatus })
            .eq('patient_id', patientClientId)
            .eq('medication', targetPrescription.drug);
          if (rxErr2) console.warn('Error updating prescription status by medication name:', rxErr2);

          const { error: medErr2 } = await supabase
            .from('medications')
            .update({ status: nextStatus, date_action: updatedDate })
            .eq('patient_id', patientClientId)
            .eq('name', targetPrescription.drug);
          if (medErr2) console.warn('Error updating medication status by name:', medErr2);
        }
      } catch (err) {
        console.error('Failed to persist medication status update:', err);
      }
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
    <div suppressHydrationWarning className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 relative">
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
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-red-400">call_end</span>
              <span>Decline</span>
            </button>
            <button
              onClick={() => handleAcceptCall(incomingCall.room_id)}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              <span>Accept & Join</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-primary to-cyan-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-teal-200 mb-3">
            <span className="material-symbols-outlined text-sm">stethoscope</span>
            <span>{t('doctor.workspaceTitle', 'Clinical OPD & Teleconsultation Workspace')}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{doctorInfo.name}</h1>
          <p className="text-teal-100 text-sm mt-1 max-w-2xl">
            {doctorInfo.facility} • {doctorInfo.department}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-semibold">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t('doctor.dutyShift', 'On Duty (Morning Shift 08:00 - 14:00)')}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-teal-100">
              License: {doctorInfo.license}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleStartTeleconsult}
            className="px-5 py-3 bg-white text-primary hover:bg-teal-50 font-extrabold text-xs rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">video_call</span>
            <span>{t('doctor.startTeleconsult', 'Start Teleconsult')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">{t('doctor.patientsInQueue', 'Patients in OPD Queue')}</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">
            {queue.filter(p => p.status === 'WAITING' || p.status === 'IN-CONSULT').length}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">
            {queue.filter(p => p.priority === 'EMERGENCY').length} Priority Emergency
          </span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">{t('doctor.completedToday', 'Completed Today')}</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">
            {queue.filter(p => p.status === 'COMPLETED').length}
          </span>
          <span className="text-[10px] text-teal-600 font-semibold">Live Database Records</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">{t('doctor.edlPrescriptions', 'EDL Prescriptions')}</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">{prescriptions.length}</span>
          <span className="text-[10px] text-blue-600 font-semibold">Active Encounter Items</span>
        </div>

        <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary block">{t('doctor.labOrdersPending', 'Lab Orders Pending')}</span>
          <span className="text-3xl font-black text-on-surface mt-1 block">{selectedLabs.length}</span>
          <span className="text-[10px] text-purple-600 font-semibold">Diagnostic Pipeline Active</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: OPD Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-surface-container-high p-5 rounded-3xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface">{t('doctor.liveQueue', 'Live Outpatient Queue')}</h2>
                <p className="text-xs text-tertiary">{t('doctor.selectPatientPrompt', 'Select patient to load clinical chart & encounter')}</p>
              </div>
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl">
                Room 101
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">search</span>
              <input
                type="text"
                placeholder={t('doctor.searchPatient', 'Search patient name, token or complaint...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['ALL', 'WAITING', 'EMERGENCY', 'TELECONSULT', 'REFERRALS', 'COMPLETED'] as const).map(tab => {
                const getTabLabel = () => {
                  switch (tab) {
                    case 'ALL': return t('doctor.tabAll', 'ALL');
                    case 'WAITING': return t('doctor.tabWaiting', 'WAITING');
                    case 'EMERGENCY': return t('doctor.tabEmergency', 'EMERGENCY');
                    case 'TELECONSULT': return t('doctor.tabTeleconsult', 'TELECONSULT');
                    case 'REFERRALS': return t('doctor.tabReferrals', 'Inbound Referrals');
                    case 'COMPLETED': return t('doctor.tabCompleted', 'COMPLETED');
                  }
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all relative cursor-pointer ${filterType === tab ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-tertiary hover:bg-surface-container'
                      }`}
                  >
                    {tab === 'REFERRALS' ? (
                      <span className="flex items-center gap-1">
                        <span>{getTabLabel()}</span>
                        {inboundReferrals.filter(r => r.status !== 'COMPLETED').length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                        )}
                      </span>
                    ) : (
                      getTabLabel()
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inbound Referrals View Mode */}
            {filterType === 'REFERRALS' ? (
              <div className="space-y-3 pt-2 max-h-[600px] overflow-y-auto pr-1">
                {loadingReferrals ? (
                  <div className="p-8 text-center bg-surface-container-low/40 rounded-2xl border border-surface-container-high space-y-2">
                    <span className="material-symbols-outlined text-2xl text-teal-600 animate-spin">sync</span>
                    <p className="text-xs font-bold text-tertiary">Loading incoming inter-facility referrals...</p>
                  </div>
                ) : inboundReferrals.length === 0 ? (
                  <div className="p-8 text-center bg-surface-container-low/40 rounded-2xl border border-dashed border-surface-container-high space-y-2">
                    <span className="material-symbols-outlined text-3xl text-tertiary">alt_route</span>
                    <h4 className="text-sm font-bold text-on-surface">No Inbound Referrals</h4>
                    <p className="text-xs text-tertiary">Incoming referrals from rural Sub-Centres and PHCs will appear here in real time.</p>
                  </div>
                ) : (
                  inboundReferrals.map(ref => (
                    <div key={ref.id} className={`p-4 rounded-2xl border transition-all text-xs space-y-2.5 ${ref.status === 'OVERDUE_ESCALATED'
                        ? 'bg-red-50 border-red-300 ring-1 ring-red-400'
                        : ref.urgency === 'EMERGENCY'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-white border-surface-container-high'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-container text-slate-800 font-mono font-black text-[10px]">
                          {ref.referral_token || ref.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${ref.status === 'OVERDUE_ESCALATED'
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
                        <h4 className="font-bold text-sm text-on-surface">{ref.patient_name} ({ref.patient_age}y/{ref.patient_gender})</h4>
                        <p className="text-tertiary text-[11px]">From: <span className="font-semibold text-slate-700">{ref.referring_facility_name}</span> ({ref.referring_doctor_name})</p>
                      </div>

                      <div className="p-2 bg-surface-container-low/70 rounded-xl border border-surface-container">
                        <p className="text-[11px] text-on-surface font-medium line-clamp-2">
                          <span className="font-bold">Reason:</span> {ref.clinical_reason}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-tertiary font-medium">Status: <strong className="text-primary">{ref.status}</strong></span>
                        <div className="flex items-center gap-1.5">
                          {ref.status === 'CREATED' && (
                            <button
                              onClick={() => handleUpdateReferralStatus(ref.id, 'ACCEPTED')}
                              className="px-2.5 py-1 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all"
                            >
                              {t('doctor.accept', 'Accept')}
                            </button>
                          )}
                          {ref.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleUpdateReferralStatus(ref.id, 'IN_TRANSIT')}
                              className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all"
                            >
                              {t('doctor.inTransit', 'In Transit (108)')}
                            </button>
                          )}
                          {ref.status === 'IN_TRANSIT' && (
                            <button
                              onClick={() => handleUpdateReferralStatus(ref.id, 'ARRIVED')}
                              className="px-2.5 py-1 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-all"
                            >
                              {t('doctor.arrived', 'Mark Arrived')}
                            </button>
                          )}
                          {ref.status === 'ARRIVED' && (
                            <button
                              onClick={() => handleUpdateReferralStatus(ref.id, 'CONSULTED')}
                              className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                            >
                              {t('doctor.consult', 'Start Consult')}
                            </button>
                          )}
                          {ref.status === 'CONSULTED' && (
                            <button
                              onClick={() => handleUpdateReferralStatus(ref.id, 'COMPLETED')}
                              className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all"
                            >
                              {t('doctor.complete', 'Discharge & Complete')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Patient Cards List */
              <div className="space-y-2.5 pt-2 max-h-[600px] overflow-y-auto pr-1">
                {loadingQueue ? (
                  <div className="p-8 text-center bg-surface-container-low/40 rounded-2xl border border-surface-container-high space-y-2">
                    <span className="material-symbols-outlined text-2xl text-teal-600 animate-spin">sync</span>
                    <p className="text-xs font-bold text-tertiary">Loading live patient queue from database...</p>
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="p-8 text-center bg-surface-container-low/40 rounded-2xl border border-dashed border-surface-container-high space-y-2">
                    <span className="material-symbols-outlined text-3xl text-tertiary">assignment_turned_in</span>
                    <h4 className="text-sm font-bold text-on-surface">No Patients in OPD Queue</h4>
                    <p className="text-xs text-tertiary">
                      Active consultations and live appointment requests will appear here automatically in real time.
                    </p>
                  </div>
                ) : (
                  filteredQueue.map(patient => {
                    const isSelected = patient.id === selectedPatientId;
                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs ${isSelected
                            ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary'
                            : 'bg-white border-surface-container-high hover:border-primary/40 hover:bg-surface-container-low/40'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-surface-container text-slate-800 font-mono font-black text-[10px]">
                              {patient.token}
                            </span>
                            <h3 className="font-bold text-sm text-on-surface">{patient.name}</h3>
                            {patient.consultType === 'assisted_teleconsult' && (
                              <span className="px-2 py-0.5 rounded-lg bg-teal-100 text-teal-800 font-black text-[9px] uppercase">
                                ASHA
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${patient.priority === 'EMERGENCY'
                                ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                : patient.priority === 'PRIORITY'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                          >
                            {patient.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-tertiary text-[11px] mb-2">
                          <span>{patient.age}y / {patient.gender}</span>
                          <span>•</span>
                          <span className="font-mono">{patient.type}</span>
                          {patient.ashaName && (
                            <>
                              <span>•</span>
                              <span>{patient.ashaName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{patient.waitTime}</span>
                        </div>

                        <p className="text-slate-700 text-xs line-clamp-2 bg-surface-container-low/60 p-2 rounded-xl border border-surface-container">
                          {patient.complaint}
                        </p>
                        {patient.villageName && (
                          <p className="text-[11px] text-teal-800 font-bold mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">home_health</span>
                            <span>{patient.villageName}{patient.beneficiaryId ? ` • ${patient.beneficiaryId}` : ''}</span>
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-container-high text-[11px]">
                          <div className="flex items-center gap-3 font-semibold text-slate-600">
                            <span>BP: <strong>{patient.vitals.bp}</strong></span>
                            <span>HR: <strong>{patient.vitals.hr}</strong></span>
                            <span>SpO2: <strong>{patient.vitals.spo2}</strong></span>
                          </div>
                          <span
                            className={`font-bold uppercase text-[10px] ${patient.status === 'IN-CONSULT' ? 'text-teal-600 font-black' : patient.status === 'COMPLETED' ? 'text-slate-400' : 'text-amber-600'
                              }`}
                          >
                            {patient.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Patient Clinical Chart & Encounter (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!selectedPatient ? (
            <div className="bg-white border border-surface-container-high p-8 rounded-3xl shadow-card text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-tertiary">folder_shared</span>
              <h3 className="text-base font-extrabold text-on-surface">No Patient Selected</h3>
              <p className="text-xs text-tertiary max-w-sm mx-auto">
                Select a patient from the OPD queue to inspect clinical vitals, record SOAP encounter notes, and dispatch e-prescriptions.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-surface-container-high p-6 rounded-3xl shadow-card space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary text-white font-mono font-black text-xs">
                      {selectedPatient.token}
                    </span>
                    <h2 className="text-2xl font-extrabold text-on-surface">{selectedPatient.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-tertiary">
                    <span>ABHA: <strong className="font-mono text-slate-800">{selectedPatient.abhaId}</strong></span>
                    <span>•</span>
                    <span>{selectedPatient.age} Years, {selectedPatient.gender}</span>
                    <span>•</span>
                    <span>Blood: <strong className="text-red-700 font-bold">{selectedPatient.bloodGroup}</strong></span>
                    {selectedPatient.ashaName && (
                      <>
                        <span>•</span>
                        <span>Assisted by: <strong className="text-teal-700 font-bold">{selectedPatient.ashaName}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/records?patientId=${selectedPatient.clientId || selectedPatient.id}`}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm text-purple-700">folder_shared</span>
                    <span>{t('doctor.patientRecord', 'Patient Record')}</span>
                  </Link>
                  {selectedPatient.status !== 'IN-CONSULT' && (
                    <button
                      onClick={() => handleStatusChange(selectedPatient.id, 'IN-CONSULT')}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      {t('doctor.callIntoRoom', 'Call into Room')}
                    </button>
                  )}
                  {selectedPatient.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange(selectedPatient.id, 'COMPLETED')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      {t('doctor.complete', 'Mark Encounter Done')}
                    </button>
                  )}
                </div>
              </div>

              {selectedPatient.consultType === 'assisted_teleconsult' && (
                <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-teal-950">
                  <span className="material-symbols-outlined text-teal-700 text-lg">support_agent</span>
                  <div>
                    <span className="font-extrabold uppercase tracking-wide block">ASHA-Assisted Handoff</span>
                    <span className="font-semibold">
                      {selectedPatient.ashaName || 'ASHA worker'} is helping this patient join from {selectedPatient.villageName || 'the field'}.
                      Use the room link for video, then record the plan here so the ASHA can follow up.
                    </span>
                  </div>
                </div>
              )}

              {/* Patient-Specific Clinical Triage & Urgency Assessment */}
              <div className={`p-4 rounded-2xl border transition-all ${selectedPatient.priority === 'EMERGENCY'
                  ? 'bg-red-50/70 border-red-200 text-red-950 shadow-sm'
                  : selectedPatient.priority === 'PRIORITY'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-sm'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-950 shadow-sm'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">
                      {selectedPatient.priority === 'EMERGENCY' ? 'emergency' : selectedPatient.priority === 'PRIORITY' ? 'warning' : 'check_circle'}
                    </span>
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      Patient Clinical Triage Assessment
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${selectedPatient.priority === 'EMERGENCY'
                      ? 'bg-red-600 text-white'
                      : selectedPatient.priority === 'PRIORITY'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                    {patientTriage?.urgencyLabel || (selectedPatient.priority === 'EMERGENCY' ? '🔴 RED — Emergency' : selectedPatient.priority === 'PRIORITY' ? '🟡 YELLOW — Priority' : '🟢 GREEN — Routine')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block mb-0.5">Triage Classification</span>
                    <p className="font-bold text-xs">
                      {patientTriage?.description || (selectedPatient.priority === 'EMERGENCY' ? 'Immediate clinical attention required' : selectedPatient.priority === 'PRIORITY' ? 'Needs prompt assessment' : 'Normal consultation')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block mb-0.5">Reported Chief Complaint</span>
                    <p className="font-semibold text-xs text-slate-800">
                      {selectedPatient.complaint || 'General clinical consultation'}
                    </p>
                  </div>
                </div>

                {/* ASHA Community Screening Review (if present) */}
                {patientTriage?.communityAssessment && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 bg-white/70 p-3 rounded-xl border border-black/5 text-xs text-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 text-teal-800 font-extrabold text-[11px] uppercase">
                        <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                        <span>Community Triage Screening • {patientTriage.communityAssessment.screener}</span>
                      </div>
                      <span className="text-[10px] text-tertiary font-bold">{patientTriage.communityAssessment.date}</span>
                    </div>
                    {patientTriage.communityAssessment.observations && (
                      <p className="text-[11px] text-slate-700 font-medium">
                        <strong className="font-bold text-slate-900">ASHA Observations:</strong> {patientTriage.communityAssessment.observations.replace(/\[Urgency: [^\]]+\]\s*/g, '')}
                      </p>
                    )}
                    {patientTriage.communityAssessment.plan && (
                      <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                        <strong className="font-bold text-slate-900">Recommended Pathway:</strong> {patientTriage.communityAssessment.plan}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Allergy Warning & Medical Safety Alerts Section */}
              <div className="space-y-2">
                {selectedPatient.allergies && selectedPatient.allergies !== 'None' && selectedPatient.allergies !== 'No Known Drug Allergies (NKDA)' ? (
                  <div className="bg-red-50 border border-red-300 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-red-950 shadow-sm">
                    <span className="material-symbols-outlined text-red-600 text-xl shrink-0 mt-0.5">warning</span>
                    <div>
                      <span className="font-black text-red-900 uppercase tracking-wide block">⚠️ Allergies & Adverse Reactions</span>
                      <span className="font-extrabold text-sm text-red-800">{selectedPatient.allergies}</span>
                      <span className="text-[11px] text-red-700 block mt-0.5">Verify all prescription orders against recorded drug allergies.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-lg">verified_user</span>
                      <span className="font-bold">Allergy Safety: <strong className="text-emerald-800 font-black">No known allergies (NKDA)</strong></span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300">Verified</span>
                  </div>
                )}

                {patientTriage?.medicalAlerts && patientTriage.medicalAlerts.length > 0 && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl space-y-1.5 text-xs text-amber-950">
                    <div className="flex items-center gap-1.5 font-extrabold text-[11px] text-amber-900 uppercase tracking-wide">
                      <span className="material-symbols-outlined text-sm text-amber-700">notifications_active</span>
                      <span>Important Medical & Telemetry Alerts</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {patientTriage.medicalAlerts.map((alert, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${alert.type === 'danger'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : alert.type === 'warning'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}
                        >
                          <span className="material-symbols-outlined text-xs">{alert.icon}</span>
                          <span>{alert.text}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vitals Ribbon */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-tertiary block mb-2">Recorded Triage Vitals</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                    <span className="text-[10px] text-tertiary block">Blood Pressure</span>
                    <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.bp}</span>
                    <span className="text-[9px] text-emerald-600 font-semibold block">Triage</span>
                  </div>
                  <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                    <span className="text-[10px] text-tertiary block">Heart Rate</span>
                    <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.hr !== 'N/A' ? `${selectedPatient.vitals.hr} bpm` : 'N/A'}</span>
                    <span className="text-[9px] text-teal-600 font-semibold block">Pulse</span>
                  </div>
                  <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                    <span className="text-[10px] text-tertiary block">Oxygen (SpO2)</span>
                    <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.spo2}</span>
                    <span className="text-[9px] text-blue-600 font-semibold block">O2 Saturation</span>
                  </div>
                  <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                    <span className="text-[10px] text-tertiary block">Body Temp</span>
                    <span className="font-black text-sm text-amber-700">{selectedPatient.vitals.temp}</span>
                    <span className="text-[9px] text-amber-700 font-semibold block">Thermometry</span>
                  </div>
                  <div className="bg-surface-container-low p-2.5 rounded-2xl border border-surface-container">
                    <span className="text-[10px] text-tertiary block">BMI Index</span>
                    <span className="font-black text-sm text-slate-900">{selectedPatient.vitals.bmi}</span>
                    <span className="text-[9px] text-slate-600 font-semibold block">Anthropometry</span>
                  </div>
                </div>
              </div>

              {/* Success & Error Banners */}
              {submitSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                  <span className="font-bold">{submitSuccessMessage}</span>
                </div>
              )}

              {submitErrorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-300 rounded-2xl flex items-center gap-3 text-xs text-red-900 animate-fadeIn">
                  <span className="material-symbols-outlined text-red-600 text-lg">error</span>
                  <span className="font-bold">{submitErrorMessage}</span>
                </div>
              )}

              {/* SOAP Clinical Encounter Notes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Clinical SOAP Notes & Assessment</span>
                    {loadingClinicalRecords && (
                      <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                        Syncing...
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-tertiary font-semibold">ICD-10 Categorized</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-tertiary block mb-1">Provisional Diagnosis</label>
                  <input
                    type="text"
                    placeholder="Enter provisional diagnosis or clinical impression..."
                    value={soapDiagnosis}
                    onChange={e => setSoapDiagnosis(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-tertiary block mb-1">Subjective & Objective Clinical Findings</label>
                  <textarea
                    rows={3}
                    placeholder="Record subjective complaints, objective vitals assessment, and clinical review..."
                    value={soapNotes}
                    onChange={e => setSoapNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Digital E-Prescriptions & Facility Inventory Integration */}
              <div className="space-y-4 pt-4 border-t border-surface-container-high">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t('doctor.prescribeMedicineTitle', 'E-Prescription & Facility EDL Dispensing')}
                    </h3>
                    <p className="text-[10px] text-tertiary">
                      {t('doctor.prescribeMedicineSubtitle', 'Real-time formulary search and automated stock deduction')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-200">
                      Interaction Safe (NKDA Checked)
                    </span>
                    {isNonInventoryMode && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                        {t('doctor.nonInventoryMedicine', 'Non-Inventory Mode')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Medicine Search & Form Component */}
                <form onSubmit={handleAddDrug} className="space-y-3 bg-surface-container-low p-4 rounded-3xl border border-surface-container">
                  {/* Medicine Search Bar / Mode Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">
                          {isNonInventoryMode ? 'edit_note' : 'inventory'}
                        </span>
                        <span>
                          {isNonInventoryMode
                            ? t('doctor.nonInventoryMedicine', 'Non-Inventory Medicine Name')
                            : t('doctor.searchMedicinePlaceholder', 'Search Facility Medicine Inventory')}
                        </span>
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
                          className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">arrow_back</span>
                          <span>{t('doctor.switchBackToInventory', 'Switch to Facility Inventory Search')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectNonInventoryMed('')}
                          className="text-[11px] text-purple-700 hover:text-purple-900 font-bold hover:underline"
                        >
                          {t('doctor.prescribeNonInventory', '+ Prescribe Non-Inventory Medicine')}
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
                          placeholder="Enter medicine name (e.g. Azithromycin 500mg)..."
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

                  {/* Selected Inventory Medicine Stock Status Badge */}
                  {!isNonInventoryMode && selectedInventoryMed && (
                    <div className="p-3 bg-white rounded-2xl border border-teal-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-mono font-black text-[10px]">
                          {selectedInventoryMed.id}
                        </div>
                        <div>
                          <span className="font-bold text-on-surface block text-xs">{selectedInventoryMed.name}</span>
                          <span className="text-[10px] text-tertiary">
                            {selectedInventoryMed.category} • Storage: {selectedInventoryMed.storage_location || 'Main Pharmacy'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-tertiary block">{t('doctor.availableStock', 'Available Stock')}</span>
                          <span className="font-black text-xs text-primary">
                            {selectedInventoryMed.stock_units.toLocaleString()} {selectedInventoryMed.unit}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                            selectedInventoryMed.status === 'ADEQUATE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : selectedInventoryMed.status === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {selectedInventoryMed.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-tertiary block mb-1">Dosage / Strength</label>
                      <input
                        type="text"
                        value={draftDosage}
                        onChange={(e) => setDraftDosage(e.target.value)}
                        placeholder="500mg (1 tablet)"
                        className="w-full px-3 py-1.5 bg-white rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-tertiary block mb-1">Frequency</label>
                      <select
                        value={draftFrequency}
                        onChange={(e) => handleFrequencyChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                      >
                        <option value="OD (Once daily)">OD (Once daily)</option>
                        <option value="BD (Twice daily)">BD (Twice daily)</option>
                        <option value="TDS (3 times daily)">TDS (3 times daily)</option>
                        <option value="QDS (4 times daily)">QDS (4 times daily)</option>
                        <option value="SOS (As needed)">SOS (As needed)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-tertiary block mb-1">Duration</label>
                      <input
                        type="text"
                        value={draftDuration}
                        onChange={(e) => handleDurationChange(e.target.value)}
                        placeholder="5 Days"
                        className="w-full px-3 py-1.5 bg-white rounded-xl text-xs font-semibold border border-surface-container-high outline-none focus:border-primary"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-tertiary block mb-1">
                        {t('doctor.quantity', 'Quantity')} ({selectedInventoryMed?.unit || 'units'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={draftQuantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-1.5 bg-white rounded-xl text-xs font-bold border border-surface-container-high outline-none focus:border-primary"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="submit"
                        disabled={!draftDrugName.trim()}
                        className={`w-full py-1.5 px-3 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${
                          !draftDrugName.trim()
                            ? 'bg-surface-container text-tertiary cursor-not-allowed'
                            : isNonInventoryMode
                            ? 'bg-purple-700 hover:bg-purple-800 text-white'
                            : 'bg-primary hover:bg-primary/90 text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        <span>{t('doctor.addMedication', 'Add Medication')}</span>
                      </button>
                    </div>

                    <div className="sm:col-span-12">
                      <input
                        type="text"
                        value={draftInstructions}
                        onChange={(e) => setDraftInstructions(e.target.value)}
                        placeholder="Special instructions (e.g. Take with warm water after meals)"
                        className="w-full px-3 py-1 bg-white rounded-xl text-[11px] border border-surface-container-high outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Stock Level Warning Notice */}
                  {stockWarning && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
                      <span>{stockWarning}</span>
                    </div>
                  )}
                </form>

                {/* Active Prescriptions Table & Summary */}
                <div className="overflow-hidden rounded-3xl border border-surface-container-high bg-white shadow-xs">
                  {prescriptions.length === 0 ? (
                    <div className="p-6 text-center bg-surface-container-low/40 text-tertiary text-xs space-y-1">
                      <span className="material-symbols-outlined text-2xl text-slate-400 block">medication</span>
                      <span className="font-bold text-on-surface block">No medications added yet</span>
                      <span className="text-[11px]">Search the facility inventory above or prescribe non-inventory medicines.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-container-high">
                      <div className="p-3 bg-surface-container-low/70 flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                          {t('doctor.prescriptionSummary', 'Prescription Summary')} ({prescriptions.length} items)
                        </span>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="flex items-center gap-1 font-bold text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {prescriptions.filter((p) => p.is_inventory).length} Facility EDL
                          </span>
                          <span className="flex items-center gap-1 font-bold text-purple-800">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {prescriptions.filter((p) => !p.is_inventory).length} Non-Inventory
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-container-low/40 text-tertiary uppercase font-black text-[9px] tracking-wider border-b border-surface-container-high">
                            <tr>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Medicine</th>
                              <th className="p-2.5">Dosage</th>
                              <th className="p-2.5">Frequency & Duration</th>
                              <th className="p-2.5">Quantity</th>
                              <th className="p-2.5">Stock After Rx</th>
                              <th className="p-2.5">Instructions</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container-high">
                            {prescriptions.map((p) => {
                              const remainingStock =
                                p.is_inventory && p.available_stock !== undefined
                                  ? Math.max(0, p.available_stock - p.quantity)
                                  : null;

                              return (
                                <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                                  <td className="p-2.5">
                                    {p.is_inventory ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Formulary
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                        External
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-on-surface">{p.drug}</span>
                                      {p.status && (
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
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
                                    <span className="text-[10px] text-tertiary block">
                                      {p.category || (p.is_inventory ? 'EDL' : 'Non-Inventory')}
                                      {p.inventory_id && ` • ID: ${p.inventory_id}`}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-800 font-semibold">{p.dosage}</td>
                                  <td className="p-2.5 text-slate-800">
                                    <span className="font-semibold block">{p.frequency}</span>
                                    <span className="text-[10px] text-tertiary">{p.duration}</span>
                                  </td>
                                  <td className="p-2.5 font-black text-slate-900">
                                    {p.quantity} {p.unit}
                                  </td>
                                  <td className="p-2.5">
                                    {p.is_inventory && remainingStock !== null ? (
                                      <span
                                        className={`text-[11px] font-black ${
                                          remainingStock < 10 ? 'text-amber-600' : 'text-primary'
                                        }`}
                                      >
                                        {remainingStock.toLocaleString()} {p.unit}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-tertiary italic">N/A (External)</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-tertiary text-[11px] max-w-xs truncate">{p.instructions}</td>
                                  <td className="p-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePrescriptionStatus(p.id)}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                                          p.status === 'TAKEN' || p.status === 'COMPLETED'
                                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                            : 'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
                                        }`}
                                        title={p.status === 'TAKEN' ? t('doctor.markedGiven', 'Marked as Given / Taken') : t('doctor.giveMedicine', 'Give / Administer Medicine')}
                                      >
                                        <span className="material-symbols-outlined text-xs">
                                          {p.status === 'TAKEN' || p.status === 'COMPLETED' ? 'check_circle' : 'medication'}
                                        </span>
                                        <span>{p.status === 'TAKEN' || p.status === 'COMPLETED' ? t('doctor.given', 'Given') : t('doctor.give', 'Give')}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePrescription(p.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                        title="Remove medication"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Lab Ordering */}
              <div className="space-y-3 pt-4 border-t border-surface-container-high">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Diagnostic Lab Investigations Order</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Complete Blood Count (CBC)',
                    'Rapid Malarial Antigen (Pf/Pv)',
                    'Sickle Cell Solubility Test',
                    'Fasting Blood Glucose',
                    'Serum Creatinine & Electrolytes',
                    'Urine Routine & Microscopic'
                  ].map(lab => {
                    const isSelected = selectedLabs.includes(lab);
                    return (
                      <button
                        key={lab}
                        onClick={() => toggleLab(lab)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${isSelected
                            ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm'
                            : 'bg-white border-surface-container-high text-tertiary hover:bg-surface-container-low'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm text-teal-600">
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span className="truncate">{lab}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-surface-container-high">
                <div className="flex items-center gap-2">
                  <button
                    disabled={submittingEncounter}
                    onClick={handleSubmitEncounter}
                    className={`px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${submittingEncounter ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-base ${submittingEncounter ? 'animate-spin' : ''}`}>
                      {submittingEncounter ? 'sync' : 'send'}
                    </span>
                    <span>{submittingEncounter ? t('actions.loading', 'Persisting...') : t('doctor.submitEncounter', 'Submit Encounter & Order EDL Drugs')}</span>
                  </button>
                  <button
                    onClick={() => setShowAshaModal(true)}
                    className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-amber-700">home_health</span>
                    <span>{t('doctor.assignAshaFollowup', 'Assign ASHA Follow-up')}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/doctor/referrals`}
                    className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base text-teal-700">alt_route</span>
                    <span>{t('doctor.referPatient', 'Refer Patient')}</span>
                  </Link>
                  <Link
                    href={`/records?patientId=${selectedPatient.clientId || selectedPatient.id}`}
                    className="px-3.5 py-2.5 bg-surface-container-low hover:bg-surface-container text-tertiary font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">folder_shared</span>
                    <span>{t('doctor.patientRecord', 'Patient Record')}</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
