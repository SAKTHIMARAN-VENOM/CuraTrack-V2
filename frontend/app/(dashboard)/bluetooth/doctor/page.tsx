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
  History
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
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .maybeSingle();

        const { data: docProf } = await supabase
          .from('doctor_profile')
          .select('specialization, hospital_name')
          .eq('doctor_id', user.id)
          .maybeSingle();

        const isDoc = profile?.role === 'doctor' || 
                      user.user_metadata?.role === 'doctor' || 
                      user.email?.toLowerCase().includes('doctor') || 
                      user.email?.toLowerCase().includes('dr.');

        if (!isDoc) {
          console.warn('[DoctorBTPage] Non-doctor role detected on doctor route — redirecting');
          router.push('/bluetooth/patient');
          return;
        }

        const resolvedId = user.id;
        const resolvedName = profile?.name || user.user_metadata?.full_name || 'Dr. David Ross';
        const resolvedSpec = docProf?.specialization || 'Cardiology & Internal Medicine';
        const resolvedHospital = docProf?.hospital_name || 'CuraTrack Clinical Center';

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
    });    const isPollingRef = { current: false };

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
          const latest = realLocalTransfers[0];
          const transferTime = new Date(latest.timestamp).getTime();
          // ONLY load if transferred AFTER current session started (within 5 seconds grace)
          if (latest.package && transferTime >= (sessionStartTimeRef.current - 5000)) {
            setReceivedPackage(latest.package);
            return;
          }
        }

        // Check backend API for new transfers
        const API_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${API_URL}/offline/transfers`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.transfers && Array.isArray(data.transfers) && data.transfers.length > 0) {
            const realApiTransfers = data.transfers.filter((t: any) => 
              t.patientName !== 'Sarah Jenkins' && 
              !t.patientName.includes('Sarah') &&
              (t.doctorId === activeDocId || activeDocId === '' || t.doctorId === 'DOC-BLE-001')
            );
            if (realApiTransfers.length > 0) {
              const latest = realApiTransfers[realApiTransfers.length - 1];
              const transferTime = new Date(latest.timestamp).getTime();
              if (latest.package && transferTime >= (sessionStartTimeRef.current - 5000)) {
                setReceivedPackage(latest.package);
              }
            }
          }
        }
      } catch (e) {
      } finally {
        isPollingRef.current = false;
      }
    };

    checkReceivedTransfers();
    const pollInterval = setInterval(checkReceivedTransfers, 1500);

    return () => {
      clearInterval(pollInterval);
      manager.stopAdvertising();
    };
  }, [router, manager]);

  const toggleBroadcasting = () => {
    if (availabilityState === 'AVAILABLE') {
      manager.stopAdvertising();
      setAvailabilityState('OFFLINE');
      setIncomingRequest(null);
    } else {
      // Start fresh session when becoming available
      sessionStartTimeRef.current = Date.now();
      setReceivedPackage(null);
      setResponseSent(false);
      setInstructions('');
      setDiagnosisSummary('');
      setShowHistoryView(false);

      manager.startAdvertising((req) => {
        setIncomingRequest(req);
      });
      setAvailabilityState('AVAILABLE');
    }
  };

  const handleAcceptRequest = () => {
    if (incomingRequest) {
      incomingRequest.accept();
      setIncomingRequest(null);
      // Reset active view to await fresh transfer payload
      sessionStartTimeRef.current = Date.now();
      setReceivedPackage(null);
      setResponseSent(false);
      setInstructions('');
      setDiagnosisSummary('');
      setShowHistoryView(false);
    }
  };

  const handleRejectRequest = () => {
    if (incomingRequest) {
      incomingRequest.reject();
      setIncomingRequest(null);
    }
  };

  const handleSendResponse = () => {
    if (!receivedPackage || !instructions.trim()) return;

    const responseObj: DoctorOfflineResponse = {
      transferId: receivedPackage.transferId,
      doctorId: doctorId || 'DOC-BLE-001',
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-teal-400">
          <Stethoscope className="w-6 h-6 animate-pulse" />
          <span className="text-sm font-semibold">Verifying Doctor Clinical License...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/bluetooth" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-teal-400" />
                <span>Doctor Offline Consultation Suite</span>
              </h1>
              <p className="text-xs text-slate-400">
                Clinician: <strong className="text-white">{doctorName}</strong> ({specialization})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryView(!showHistoryView)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold px-4 py-2.5 rounded-2xl transition-all"
            >
              <History className="w-4 h-4 text-teal-400" />
              <span>{showHistoryView ? 'Active Consultation' : 'Past Transfers History'}</span>
            </button>

            <button
              onClick={toggleBroadcasting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                availabilityState === 'AVAILABLE'
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-950/50 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
              <span>{availabilityState === 'AVAILABLE' ? 'Broadcasting (Available)' : 'Become Available'}</span>
            </button>
          </div>
        </div>

        {/* Connection Request Authorization Modal */}
        {incomingRequest && (
          <div className="bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/60 p-6 rounded-3xl space-y-4 shadow-2xl animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Incoming Patient Connection Request</h3>
                  <p className="text-xs text-amber-200">Patient: <strong className="text-white">{incomingRequest.patientName}</strong> ({incomingRequest.patientId})</p>
                  <p className="text-[11px] text-amber-300/80">Zero medical data has been sent. Do you accept this consultation?</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  onClick={handleRejectRequest}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleAcceptRequest}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
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
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-teal-400" />
              <span>Past Transfer History ({pastRecords.length})</span>
            </h2>
            {pastRecords.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No past transfers stored on this device.</p>
            ) : (
              <div className="space-y-3">
                {pastRecords.map((rec) => (
                  <div 
                    key={rec.transferId}
                    onClick={() => { setReceivedPackage(rec.package); setShowHistoryView(false); }}
                    className="cursor-pointer bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 p-4 rounded-2xl flex items-center justify-between transition-all"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">Patient: {rec.patientName}</p>
                      <p className="text-xs text-slate-400">{rec.transferId} • {new Date(rec.timestamp).toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-semibold text-teal-400 underline">View Record</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : receivedPackage ? (
          /* Received Patient Medical Record Summary View */
          <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">TRANSFER ID: {receivedPackage.transferId}</span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Patient: {receivedPackage.patient.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Blood Group: {receivedPackage.patient.bloodGroup || 'N/A'} • Gender: {receivedPackage.patient.gender || 'N/A'} • Age: {receivedPackage.patient.age || 'N/A'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500">Transferred At</span>
                  <p className="text-xs font-medium text-slate-300">{new Date(receivedPackage.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {/* Vitals Summary */}
              {receivedPackage.vitals && (
                <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span>Transferred Vitals Telemetry</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Heart Rate</span>
                      <p className="text-lg font-bold text-red-400">{receivedPackage.vitals.heartRate || '--'} <span className="text-xs font-normal">BPM</span></p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">SpO2 Oxygen</span>
                      <p className="text-lg font-bold text-cyan-400">{receivedPackage.vitals.spo2 || '--'} <span className="text-xs font-normal">%</span></p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Pressure</span>
                      <p className="text-lg font-bold text-emerald-400">{receivedPackage.vitals.systolicBp || '--'}/{receivedPackage.vitals.diastolicBp || '--'}</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Temperature</span>
                      <p className="text-lg font-bold text-amber-400">{receivedPackage.vitals.temperature || '--'} <span className="text-xs font-normal">°C</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Medications & Allergies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Medications */}
                {receivedPackage.medications && receivedPackage.medications.length > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Pill className="w-4 h-4 text-teal-400" />
                      <span>Active Medications ({receivedPackage.medications.length})</span>
                    </h3>
                    <ul className="space-y-2">
                      {receivedPackage.medications.map((m, idx) => (
                        <li key={idx} className="text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="font-bold text-teal-300">{m.name}</span> — {m.dosage} ({m.frequency})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Allergies */}
                {receivedPackage.allergies && receivedPackage.allergies.length > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Known Allergies ({receivedPackage.allergies.length})</span>
                    </h3>
                    <ul className="space-y-2">
                      {receivedPackage.allergies.map((a, idx) => (
                        <li key={idx} className="text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between">
                          <span className="font-bold text-amber-300">{a.allergen}</span>
                          <span className="text-amber-400/80">{a.severity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Offline Doctor Response Writer Form */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <span>Issue Treatment Plan & Offline Response</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Diagnosis Summary (Optional)</label>
                  <input
                    type="text"
                    value={diagnosisSummary}
                    onChange={(e) => setDiagnosisSummary(e.target.value)}
                    placeholder="e.g. Mild upper respiratory tract infection, vitals stable"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Instructions & Prescriptions *</label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Enter instructions for patient (e.g. Continue hydration, take prescribed medications after food, rest for 3 days)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Urgency Classification</label>
                    <select
                      value={urgency}
                      onChange={(e: any) => setUrgency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="ROUTINE">Routine Care</option>
                      <option value="URGENT">Urgent Attention</option>
                      <option value="EMERGENCY">Emergency Service Needed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Follow-Up Days</label>
                    <input
                      type="number"
                      value={followUpDays}
                      onChange={(e) => setFollowUpDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleSendResponse}
                    disabled={!instructions.trim() || responseSent}
                    className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold text-sm px-6 py-3 rounded-2xl shadow-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{responseSent ? 'Instructions Transmitted Over Bluetooth' : 'Send Instructions to Patient'}</span>
                  </button>

                  {responseSent && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Response Transmitted & Saved Locally
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
            <Bluetooth className="w-12 h-12 mx-auto text-slate-600 opacity-40 animate-pulse" />
            <h3 className="text-base font-bold text-slate-300">Awaiting Incoming Patient Pair Request</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {availabilityState === 'AVAILABLE' 
                ? 'Your device is currently broadcasting availability. Incoming patient requests will display an Accept/Reject prompt above.' 
                : 'Click "Become Available" at the top right to enable Bluetooth discovery.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
