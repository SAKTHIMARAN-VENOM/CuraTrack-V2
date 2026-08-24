"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bluetooth, 
  Stethoscope, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Heart, 
  Pill, 
  AlertTriangle, 
  ArrowLeft, 
  Send, 
  FileText, 
  Activity,
  Clock,
  History,
  LayoutDashboard
} from 'lucide-react';
import { BluetoothManager } from '@/lib/bluetooth/bluetoothManager';
import { OfflineStorageManager } from '@/lib/bluetooth/offlineStorage';
import { 
  OfflineMedicalPackage, 
  DoctorOfflineResponse,
  DoctorAvailabilityState,
  LocalOfflineTransferRecord
} from '@/lib/bluetooth/bluetoothTypes';
import { createClient } from '@/lib/supabase/client';

export default function DoctorBluetoothReceiverPage() {
  const router = useRouter();
  const [manager] = useState(() => BluetoothManager.getInstance());

  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [doctorId, setDoctorId] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('Dr. David Ross');
  const [specialization, setSpecialization] = useState<string>('Cardiology & Internal Medicine');
  const [hospitalName, setHospitalName] = useState<string>('CuraTrack Clinical Center');

  const [availabilityState, setAvailabilityState] = useState<DoctorAvailabilityState>('OFFLINE');
  const [incomingRequest, setIncomingRequest] = useState<{
    requestId: string;
    patientId: string;
    patientName: string;
    accept: () => void;
    reject: () => void;
  } | null>(null);

  const [receivedPackage, setReceivedPackage] = useState<OfflineMedicalPackage | null>(null);
  const [showHistoryView, setShowHistoryView] = useState<boolean>(false);
  const [pastRecords, setPastRecords] = useState<LocalOfflineTransferRecord[]>([]);

  // Track session start timestamp so old historical transfers do NOT overwrite the active clean state
  const sessionStartTimeRef = useRef<number>(Date.now());
  const doctorIdRef = useRef<string>(doctorId);

  useEffect(() => {
    doctorIdRef.current = doctorId;
  }, [doctorId]);

  // Response form states
  const [instructions, setInstructions] = useState<string>('');
  const [diagnosisSummary, setDiagnosisSummary] = useState<string>('');
  const [urgency, setUrgency] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(true);
  const [followUpDays, setFollowUpDays] = useState<number>(3);
  const [responseSent, setResponseSent] = useState<boolean>(false);

  useEffect(() => {
    // Purge legacy mock data entries from local storage
    OfflineStorageManager.clearMockData();

    async function verifyDoctorAccess() {
      try {
        let authUser: any = null;
        let savedAuthUser: any = null;

        try {
          const raw = localStorage.getItem('curatrack_auth_user');
          if (raw) savedAuthUser = JSON.parse(raw);
        } catch {}

        const activeRole = localStorage.getItem('curatrack_active_role') || savedAuthUser?.role;

        try {
          const supabase = createClient();
          const { data } = await supabase.auth.getUser();
          authUser = data?.user;
        } catch {}

        const currentId = authUser?.id || savedAuthUser?.id || 'DOC-BLE-001';
        let profile: any = null;
        let docProf: any = null;

        if (authUser?.id) {
          try {
            const supabase = createClient();
            const { data: prof } = await supabase
              .from('profiles')
              .select('role, name')
              .eq('id', authUser.id)
              .maybeSingle();
            profile = prof;

            const { data: doc } = await supabase
              .from('doctor_profile')
              .select('specialization, hospital_name')
              .eq('doctor_id', authUser.id)
              .maybeSingle();
            docProf = doc;
          } catch (e) {}
        }

        const resolvedId = currentId;
        const resolvedName = profile?.name || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || savedAuthUser?.name || 'Dr. David Ross';
        const resolvedSpec = docProf?.specialization || 'Cardiology & General Medicine';
        const resolvedHospital = docProf?.hospital_name || 'Nandurbar Sub-District Hospital';

        setDoctorId(resolvedId);
        setDoctorName(resolvedName);
        setSpecialization(resolvedSpec);
        setHospitalName(resolvedHospital);

        manager.setDeviceIdentity({
          id: resolvedId,
          name: resolvedName,
          role: 'doctor',
          specialization: resolvedSpec,
          hospitalName: resolvedHospital,
        });

        // Auto-start doctor presence advertising on page load
        manager.startAdvertising((req) => {
          setIncomingRequest(req);
        });
        setAvailabilityState('AVAILABLE');
      } catch (err) {
        console.error('[DoctorBTPage] Auth check error:', err);
      } finally {
        setLoadingAuth(false);
      }
    }

    verifyDoctorAccess();

    manager.setOnDataReceived((pkg) => {
      if (pkg && pkg.patient && pkg.patient.name !== 'Sarah Jenkins') {
        setReceivedPackage(pkg);
        setShowHistoryView(false);
      }
    });

    const isPollingRef = { current: false };

    // Check for NEW transfers received during the current active session
    const checkReceivedTransfers = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const activeDocId = doctorIdRef.current;
        const localTransfers = OfflineStorageManager.getLocalTransfers();
        setPastRecords(localTransfers);

        const realLocalTransfers = localTransfers.filter(r => 
          r.patientName !== 'Sarah Jenkins' && 
          !r.patientName.includes('Sarah') &&
          (r.doctorId === activeDocId || activeDocId === '' || r.doctorId === 'DOC-BLE-001')
        );

        if (realLocalTransfers.length > 0) {
          const newest = realLocalTransfers[0];
          const transferTime = new Date(newest.timestamp).getTime();
          if (transferTime >= sessionStartTimeRef.current) {
            setReceivedPackage(newest.package);
          }
        }

        // Check FastAPI backend transfers with abort controller timeout
        const API_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${API_URL}/offline/transfers`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.transfers && Array.isArray(data.transfers)) {
            const myTransfers = data.transfers.filter((t: any) => 
              t.patientName !== 'Sarah Jenkins' && 
              !t.patientName?.includes('Sarah') &&
              (t.doctorId === activeDocId || activeDocId === '' || t.doctorId === 'DOC-BLE-001')
            );
            if (myTransfers.length > 0) {
              const newestRemote = myTransfers[0];
              const remoteTime = new Date(newestRemote.timestamp).getTime();
              if (remoteTime >= sessionStartTimeRef.current) {
                setReceivedPackage(newestRemote.package);
              }
            }
          }
        }
      } catch (e) {
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(checkReceivedTransfers, 2000);

    return () => {
      clearInterval(interval);
      manager.stopAdvertising();
    };
  }, [manager, router]);

  const toggleBroadcasting = () => {
    if (availabilityState === 'AVAILABLE') {
      manager.stopAdvertising();
      setAvailabilityState('OFFLINE');
    } else {
      manager.startAdvertising((req) => {
        setIncomingRequest(req);
      });
      setAvailabilityState('AVAILABLE');
    }
  };

  const handleAcceptRequest = () => {
    if (!incomingRequest) return;
    incomingRequest.accept();
    setIncomingRequest(null);
  };

  const handleRejectRequest = () => {
    if (!incomingRequest) return;
    incomingRequest.reject();
    setIncomingRequest(null);
  };

  const handleSendResponse = () => {
    if (!receivedPackage || !instructions.trim()) return;

    const responseObj: DoctorOfflineResponse = {
      transferId: receivedPackage.transferId,
      doctorId,
      doctorName,
      timestamp: new Date().toISOString(),
      diagnosisSummary: diagnosisSummary.trim() || undefined,
      instructions: instructions.trim(),
      followUpRequired,
      followUpDays,
      urgency,
    };

    manager.sendDoctorResponse(receivedPackage.patient.patientId, responseObj, receivedPackage);
    setResponseSent(true);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-surface">
        <div className="flex flex-col items-center gap-3 text-secondary">
          <div className="w-10 h-10 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-on-surface">Verifying Doctor Clinical License...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 font-body space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/bluetooth" className="p-3 bg-white border border-outline-variant/30 rounded-2xl hover:bg-surface-container-low transition-colors shadow-xs">
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </Link>
          <div>
            <h1 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-secondary" />
              <span>Doctor Offline Consultation Suite</span>
            </h1>
            <p className="text-xs text-tertiary">
              Clinician: <strong className="text-on-surface">{doctorName}</strong> ({specialization})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/doctor"
            className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-primary border border-primary/20 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Doctor Portal</span>
          </Link>

          <button
            onClick={() => setShowHistoryView(!showHistoryView)}
            className="flex items-center gap-1.5 bg-white hover:bg-surface-container-low text-on-surface border border-outline-variant/30 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-secondary" />
            <span>{showHistoryView ? 'Active Consultation' : 'Past Transfers'}</span>
          </button>

          <button
            onClick={toggleBroadcasting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
              availabilityState === 'AVAILABLE'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'primary-gradient hover:opacity-90 text-white'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{availabilityState === 'AVAILABLE' ? 'Broadcasting (Available)' : 'Become Available'}</span>
          </button>
        </div>
      </div>

      {/* Connection Request Authorization Modal */}
      {incomingRequest && (
        <div className="bg-amber-50 border border-amber-300 p-6 rounded-3xl space-y-4 shadow-sm animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-headline font-bold text-on-surface">Incoming Patient Connection Request</h3>
                <p className="text-xs text-amber-900">Patient: <strong className="text-on-surface">{incomingRequest.patientName}</strong> ({incomingRequest.patientId})</p>
                <p className="text-[11px] text-amber-800/80">Zero medical data has been sent. Do you accept this consultation?</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={handleRejectRequest}
                className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject</span>
              </button>
              <button
                onClick={handleAcceptRequest}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept Pair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Transfer History View Toggle */}
      {showHistoryView ? (
        <div className="bg-white border border-outline-variant/30 p-6 md:p-8 rounded-3xl space-y-4 shadow-sm">
          <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
            <History className="w-5 h-5 text-secondary" />
            <span>Past Transfer History ({pastRecords.length})</span>
          </h2>
          {pastRecords.length === 0 ? (
            <p className="text-xs text-tertiary py-6 text-center">No past transfers stored on this device.</p>
          ) : (
            <div className="space-y-3">
              {pastRecords.map((rec) => (
                <div 
                  key={rec.transferId}
                  onClick={() => { setReceivedPackage(rec.package); setShowHistoryView(false); }}
                  className="cursor-pointer bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/20 hover:border-secondary/50 p-4 rounded-2xl flex items-center justify-between transition-all"
                >
                  <div>
                    <p className="text-sm font-bold text-on-surface">Patient: {rec.patientName}</p>
                    <p className="text-xs text-tertiary">{rec.transferId} • {new Date(rec.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-bold text-secondary underline">View Record</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : receivedPackage ? (
        /* Received Patient Medical Record Summary View */
        <div className="space-y-6">
          <div className="bg-white border border-outline-variant/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono text-primary font-bold">TRANSFER ID: {receivedPackage.transferId}</span>
                <h2 className="text-xl font-headline font-bold text-on-surface mt-1">
                  Patient: {receivedPackage.patient.name}
                </h2>
                <p className="text-xs text-tertiary">
                  Blood Group: {receivedPackage.patient.bloodGroup || 'N/A'} • Gender: {receivedPackage.patient.gender || 'N/A'} • Age: {receivedPackage.patient.age || 'N/A'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-tertiary">Transferred At</span>
                <p className="text-xs font-bold text-on-surface">{new Date(receivedPackage.timestamp).toLocaleString()}</p>
              </div>
            </div>

            {/* Vitals Summary */}
            {receivedPackage.vitals && (
              <div className="bg-surface-container-low/50 border border-outline-variant/20 p-5 rounded-2xl space-y-3">
                <h3 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Transferred Vitals Telemetry</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-xl border border-outline-variant/20 shadow-xs">
                    <span className="text-[10px] text-tertiary uppercase font-semibold">Heart Rate</span>
                    <p className="text-lg font-bold text-rose-600">{receivedPackage.vitals.heartRate || '--'} <span className="text-xs font-normal">BPM</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-outline-variant/20 shadow-xs">
                    <span className="text-[10px] text-tertiary uppercase font-semibold">SpO2 Oxygen</span>
                    <p className="text-lg font-bold text-primary">{receivedPackage.vitals.spo2 || '--'} <span className="text-xs font-normal">%</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-outline-variant/20 shadow-xs">
                    <span className="text-[10px] text-tertiary uppercase font-semibold">Blood Pressure</span>
                    <p className="text-lg font-bold text-emerald-600">{receivedPackage.vitals.systolicBp || '--'}/{receivedPackage.vitals.diastolicBp || '--'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-outline-variant/20 shadow-xs">
                    <span className="text-[10px] text-tertiary uppercase font-semibold">Temperature</span>
                    <p className="text-lg font-bold text-amber-600">{receivedPackage.vitals.temperature || '--'} <span className="text-xs font-normal">°C</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Medications & Allergies Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Medications */}
              {receivedPackage.medications && receivedPackage.medications.length > 0 && (
                <div className="bg-surface-container-low/50 border border-outline-variant/20 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2">
                    <Pill className="w-4 h-4 text-secondary" />
                    <span>Active Medications ({receivedPackage.medications.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {receivedPackage.medications.map((m, idx) => (
                      <li key={idx} className="text-xs bg-white p-2.5 rounded-xl border border-outline-variant/20 shadow-xs">
                        <span className="font-bold text-secondary">{m.name}</span> — {m.dosage} ({m.frequency})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Allergies */}
              {receivedPackage.allergies && receivedPackage.allergies.length > 0 && (
                <div className="bg-surface-container-low/50 border border-outline-variant/20 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Known Allergies ({receivedPackage.allergies.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {receivedPackage.allergies.map((a, idx) => (
                      <li key={idx} className="text-xs bg-white p-2.5 rounded-xl border border-outline-variant/20 flex justify-between shadow-xs">
                        <span className="font-bold text-amber-800">{a.allergen}</span>
                        <span className="text-amber-700 font-medium">{a.severity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Offline Doctor Response Writer Form */}
          <div className="bg-white border border-outline-variant/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
            <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              <span>Issue Treatment Plan & Offline Response</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Diagnosis Summary (Optional)</label>
                <input
                  type="text"
                  value={diagnosisSummary}
                  onChange={(e) => setDiagnosisSummary(e.target.value)}
                  placeholder="e.g. Mild upper respiratory tract infection, vitals stable"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Clinical Instructions & Prescriptions *</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter instructions for patient (e.g. Continue hydration, take prescribed medications after food, rest for 3 days)..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Urgency Classification</label>
                  <select
                    value={urgency}
                    onChange={(e: any) => setUrgency(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="ROUTINE">Routine Care</option>
                    <option value="URGENT">Urgent Attention</option>
                    <option value="EMERGENCY">Emergency Service Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Follow-Up Days</label>
                  <input
                    type="number"
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                <button
                  onClick={handleSendResponse}
                  disabled={!instructions.trim() || responseSent}
                  className="flex items-center gap-2 primary-gradient hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{responseSent ? 'Instructions Transmitted Over Bluetooth' : 'Send Instructions to Patient'}</span>
                </button>

                {responseSent && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Response Transmitted & Saved Locally
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-outline-variant/40 rounded-3xl p-12 text-center text-tertiary space-y-3 shadow-xs">
          <Bluetooth className="w-12 h-12 mx-auto text-outline opacity-40 animate-pulse" />
          <h3 className="text-base font-headline font-bold text-on-surface">Awaiting Incoming Patient Pair Request</h3>
          <p className="text-xs text-tertiary max-w-md mx-auto">
            {availabilityState === 'AVAILABLE' 
              ? 'Your device is currently broadcasting availability. Incoming patient requests will display an Accept/Reject prompt above.' 
              : 'Click "Become Available" at the top right to enable Bluetooth discovery.'}
          </p>
        </div>
      )}

    </div>
  );
}
