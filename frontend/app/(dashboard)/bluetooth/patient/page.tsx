"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bluetooth,
  Search,
  Stethoscope,
  CheckSquare,
  Square,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Heart,
  Pill,
  FileSpreadsheet,
  UserCheck,
  Activity,
  Send,
  XCircle,
  Clock,
  Lock,
  PlusCircle
} from 'lucide-react';
import { BluetoothManager } from '@/lib/bluetooth/bluetoothManager';
import { BluetoothProtocol } from '@/lib/bluetooth/bluetoothProtocol';
import { PatientDataService, AuthenticatedPatientFullRecord } from '@/lib/bluetooth/patientDataService';
import { OfflineStorageManager } from '@/lib/bluetooth/offlineStorage';
import {
  BluetoothDevicePeer,
  MedicalDataScope,
  TransferProgressState,
  OfflineMedicalPackage,
  DoctorOfflineResponse
} from '@/lib/bluetooth/bluetoothTypes';
import { createClient } from '@/lib/supabase/client';

export default function PatientBluetoothTransferPage() {
  const router = useRouter();
  const [manager] = useState(() => BluetoothManager.getInstance());

  // Auth & Role check
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [patientRecord, setPatientRecord] = useState<AuthenticatedPatientFullRecord | null>(null);

  // Scanning & discovery state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [discoveredDoctors, setDiscoveredDoctors] = useState<BluetoothDevicePeer[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<BluetoothDevicePeer | null>(null);

  // Scope selection
  const [scope, setScope] = useState<MedicalDataScope>({
    basicProfile: true,
    vitals: true,
    medications: true,
    allergies: true,
    labResults: false,
    doctorNotes: false,
    recentPrescriptions: true,
  });

  // State machine & progress state
  const [progressState, setProgressState] = useState<TransferProgressState | null>(null);
  const [receivedDoctorResponse, setReceivedDoctorResponse] = useState<DoctorOfflineResponse | null>(null);
  const sessionStartTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    async function verifyAndLoadPatientData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const isDoc = profile?.role === 'doctor' ||
          user.user_metadata?.role === 'doctor' ||
          user.email?.toLowerCase().includes('doctor');

        if (isDoc) {
          console.warn('[PatientBTPage] Doctor role detected on patient route — redirecting');
          router.push('/bluetooth/doctor');
          return;
        }

        // Fetch real patient data
        const data = await PatientDataService.getAuthenticatedPatientData();
        if (data) {
          setPatientRecord(data);
          manager.setDeviceIdentity({
            id: data.patient.patientId,
            name: data.patient.name,
            role: 'patient',
          });
        }
      } catch (err) {
        console.error('[PatientBTPage] Error verifying patient access:', err);
      } finally {
        setLoadingAuth(false);
      }
    }

    verifyAndLoadPatientData();

    // Attach manager callbacks
    manager.setOnDoctorResponseReceived((resp) => {
      if (resp && new Date(resp.timestamp).getTime() >= sessionStartTimeRef.current) {
        setReceivedDoctorResponse(resp);
      }
    });

    // Start continuous discovery scanning with stable peer state
    const runScan = () => {
      manager.startScanning(
        (peer) => {
          if (peer.role === 'doctor' && peer.availabilityState === 'AVAILABLE') {
            setDiscoveredDoctors((prev) => {
              if (prev.some((p) => p.id === peer.id)) return prev;
              return [...prev, peer];
            });
          }
        }
      );
    };

    runScan();
    const interval = setInterval(runScan, 3000);

    const isPollingRef = { current: false };

    // Poll backend API & local storage for doctor responses belonging strictly to this session
    const pollDoctorResponse = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        // 1. Check local storage
        const localTransfers = OfflineStorageManager.getLocalTransfers();
        const activeRec = localTransfers.find(
          r => r.doctorResponse && new Date(r.doctorResponse.timestamp).getTime() >= sessionStartTimeRef.current
        );
        if (activeRec?.doctorResponse) {
          setReceivedDoctorResponse(activeRec.doctorResponse);
        }

        // 2. Poll backend API with timeout abort controller
        const API_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${API_URL}/offline/transfers`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.transfers && Array.isArray(data.transfers)) {
            data.transfers.forEach((bRec: any) => {
              if (bRec.doctorResponse && bRec.transferId) {
                const respTime = new Date(bRec.doctorResponse.timestamp).getTime();
                if (respTime >= sessionStartTimeRef.current) {
                  OfflineStorageManager.saveDoctorResponse(bRec.transferId, bRec.doctorResponse, bRec.package);
                  setReceivedDoctorResponse(bRec.doctorResponse);
                }
              }
            });
          }
        }
      } catch (e) {
      } finally {
        isPollingRef.current = false;
      }
    };

    pollDoctorResponse();
    const docPollInterval = setInterval(pollDoctorResponse, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(docPollInterval);
    };
  }, [router, manager]);

  const handleStartScanning = () => {
    setIsScanning(true);
    setDiscoveredDoctors([]);

    manager.startScanning(
      (peer) => {
        if (peer.role === 'doctor' && peer.availabilityState === 'AVAILABLE') {
          setDiscoveredDoctors((prev) => {
            if (prev.some((p) => p.id === peer.id)) return prev;
            return [...prev, peer];
          });
        }
      },
      (lostPeerId) => {
        setDiscoveredDoctors((prev) => prev.filter((p) => p.id !== lostPeerId));
        if (selectedDoctor?.id === lostPeerId) {
          setSelectedDoctor(null);
        }
      }
    );

    setTimeout(() => {
      setIsScanning(false);
    }, 4000);
  };

  const handleSimulateDoctor = () => {
    const simDoc = manager.simulateDoctorPresence();
    setDiscoveredDoctors((prev) => {
      if (prev.some((p) => p.id === simDoc.id)) return prev;
      return [...prev, simDoc];
    });
    setSelectedDoctor(simDoc);
    manager.setConnectionState('AUTHORIZED');
    setProgressState({
      status: 'AUTHORIZED',
      progressPercentage: 50,
      stepMessage: `Simulated Dr. David Ross accepted connection request! Session authorized.`,
    });
  };

  const toggleScope = (key: keyof MedicalDataScope) => {
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // STEP 1: Request Pairing Connection (NO data sent at this stage!)
  const handleRequestConnection = async () => {
    if (!selectedDoctor || !patientRecord) return;

    setProgressState({
      status: 'REQUEST_SENT',
      progressPercentage: 10,
      stepMessage: `Requesting connection with ${selectedDoctor.name}...`,
    });

    const res = await manager.requestConnection(
      selectedDoctor,
      patientRecord.patient.patientId,
      patientRecord.patient.name,
      (state) => setProgressState(state)
    );

    if (!res.accepted) {
      console.log('[PatientBTPage] Doctor rejected connection request.');
    }
  };

  // STEP 2: Execute Transfer after Doctor ACCEPTANCE and Scope Confirmation
  const handleExecuteTransfer = async () => {
    if (!selectedDoctor || !patientRecord) return;

    // Build package from REAL authenticated patient record
    const pkg = await BluetoothProtocol.createMedicalPackage(
      scope,
      patientRecord.patient,
      patientRecord.vitals,
      patientRecord.medications,
      patientRecord.allergies,
      patientRecord.labResults,
      patientRecord.doctorNotes,
      patientRecord.recentPrescriptions
    );

    const result = await manager.executeAuthorizedTransfer(selectedDoctor, pkg, (state) => {
      setProgressState(state);
    });

    if (!result.success) {
      console.error('[PatientBTPage] Authorized transfer error:', result.error);
    }
  };

  // STEP 2B: Send BLE POC Test Message to Doctor and await ACK over BLE Characteristic
  const handleExecuteBLETest = async () => {
    if (!selectedDoctor) return;
    const result = await manager.sendBLETestMessage(selectedDoctor, (state) => {
      setProgressState(state);
    });
    if (result.success) {
      console.log('[PatientBTPage] BLE POC Test Success:', result.ackMessage);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-cyan-400">
          <Bluetooth className="w-6 h-6 animate-pulse" />
          <span className="text-sm font-semibold">Loading Patient Medical Profile...</span>
        </div>
      </div>
    );
  }

  const currentStatus = progressState?.status || 'IDLE';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <Link href="/bluetooth" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bluetooth className="w-6 h-6 text-cyan-400" />
              <span>Patient Offline Transfer</span>
            </h1>
            <p className="text-xs text-slate-400">
              Authenticated Patient: <strong className="text-white">{patientRecord?.patient.name}</strong> ({patientRecord?.patient.patientId})
            </p>
          </div>
        </div>

        {/* Step 1: Scan for Nearby Broadcasting Doctor Devices */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <span>1. Available Nearby Doctors</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Lists active doctors who are currently broadcasting availability over Bluetooth.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSimulateDoctor}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs px-3 py-2 rounded-xl transition-all border border-cyan-500/30"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate Doctor (Test Mode)</span>
              </button>

              <button
                onClick={handleStartScanning}
                disabled={isScanning}
                className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-sm px-5 py-2 rounded-xl shadow-lg transition-all"
              >
                <Bluetooth className={`w-4 h-4 ${isScanning ? 'animate-bounce text-cyan-200' : ''}`} />
                <span>{isScanning ? 'Scanning BLE...' : 'Scan Nearby Devices'}</span>
              </button>
            </div>
          </div>

          {discoveredDoctors.length === 0 ? (
            <div className="py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-2">
              <Stethoscope className="w-8 h-8 mx-auto opacity-40 mb-1" />
              <p className="text-sm font-medium text-slate-300">No active CuraTrack doctor devices broadcasting nearby.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                💡 <strong>How to test:</strong> Open <Link href="/bluetooth/doctor" target="_blank" className="text-cyan-400 underline font-semibold">Doctor Suite</Link> in a 2nd tab/window and click <strong>"Become Available"</strong>, or click <strong>"Simulate Doctor (Test Mode)"</strong> above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {discoveredDoctors.map((doc) => {
                const isSelected = selectedDoctor?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-start justify-between ${isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-lg shadow-cyan-950/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-base font-bold text-white">{doc.name}</h3>
                      </div>
                      <p className="text-xs text-cyan-300 font-medium">{doc.specialization || 'Clinical Specialist'}</p>
                      <p className="text-xs text-slate-400">{doc.hospitalName || 'CuraTrack Network'}</p>
                      <div className="pt-2 flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Broadcasting Available
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-700'
                      }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-current" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Request Connection & Authorization Handshake */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>2. Request Pairing Authorization</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Doctor must explicitly Accept your request before any medical data leaves your device.
              </p>
            </div>

            <button
              onClick={handleRequestConnection}
              disabled={!selectedDoctor || currentStatus === 'REQUEST_SENT' || currentStatus === 'AWAITING_DOCTOR_APPROVAL' || currentStatus === 'AUTHORIZED' || currentStatus === 'COMPLETED'}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm px-6 py-2.5 rounded-2xl shadow-lg transition-all"
            >
              {currentStatus === 'AWAITING_DOCTOR_APPROVAL' ? 'Waiting for Doctor...' : 'Request Doctor Connection'}
            </button>
          </div>

          {/* Connection Status Renderer */}
          {currentStatus === 'AWAITING_DOCTOR_APPROVAL' && (
            <div className="bg-amber-950/50 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 text-amber-200 text-sm animate-pulse">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
              <div>
                <p className="font-bold">Awaiting Doctor Approval...</p>
                <p className="text-xs text-amber-300">Connection request sent to {selectedDoctor?.name}. Zero medical data has been sent.</p>
              </div>
            </div>
          )}

          {currentStatus === 'REJECTED' && (
            <div className="bg-red-950/60 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3 text-red-200 text-sm">
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold">Connection Declined</p>
                <p className="text-xs text-red-300">
                  {selectedDoctor?.name || 'Doctor'} is not accepting the consultation. No medical information was transferred.
                </p>
              </div>
            </div>
          )}

          {(currentStatus === 'AUTHORIZED' || currentStatus === 'CONFIRMING_SCOPE' || currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED') && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-2xl flex items-center gap-3 text-emerald-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">Doctor Accepted Connection!</p>
                <p className="text-xs text-emerald-300">
                  Session authorized with {selectedDoctor?.name}. Review consent scope below and click "Confirm & Transfer".
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Medical Scope Consent & Execute Transfer */}
        {(currentStatus === 'AUTHORIZED' || currentStatus === 'CONFIRMING_SCOPE' || currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED') && (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span>3. Confirm Data Scope & Transfer</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select only the actual records from your profile that you consent to share.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'basicProfile', label: 'Basic Patient Profile', icon: UserCheck, desc: `${patientRecord?.patient.name} (${patientRecord?.patient.bloodGroup})` },
                { key: 'vitals', label: 'Vitals Telemetry', icon: Heart, desc: patientRecord?.vitals ? `HR: ${patientRecord.vitals.heartRate} BPM, SpO2: ${patientRecord.vitals.spo2}%` : 'No vital logs' },
                { key: 'medications', label: 'Active Medications', icon: Pill, desc: `${patientRecord?.medications.length || 0} active prescription(s)` },
                { key: 'allergies', label: 'Known Allergies', icon: AlertTriangle, desc: `${patientRecord?.allergies.length || 0} documented allergy item(s)` },
                { key: 'recentPrescriptions', label: 'Prescription History', icon: FileSpreadsheet, desc: `${patientRecord?.recentPrescriptions.length || 0} recent prescription(s)` },
                { key: 'labResults', label: 'Lab Diagnostic Results', icon: Activity, desc: `${patientRecord?.labResults.length || 0} lab report(s)` },
              ].map((item) => {
                const isChecked = scope[item.key as keyof MedicalDataScope];
                const IconComp = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleScope(item.key as keyof MedicalDataScope)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${isChecked
                        ? 'bg-teal-950/40 border-teal-500/60 text-teal-100'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    <div className="mt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-teal-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                        <IconComp className="w-4 h-4 text-teal-400" />
                        <span>{item.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-300">Ready to transfer to {selectedDoctor?.name}</p>
                <p className="text-[11px] text-slate-500">Only selected items above will be encrypted and transmitted.</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleExecuteBLETest}
                  disabled={currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED'}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 disabled:opacity-40 font-bold text-sm px-5 py-3 rounded-2xl shadow-xl transition-all"
                >
                  <Bluetooth className="w-4 h-4 text-cyan-400" />
                  <span>⚡ Test BLE POC (ACK)</span>
                </button>

                <button
                  onClick={handleExecuteTransfer}
                  disabled={currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED'}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-bold text-sm px-6 py-3 rounded-2xl shadow-xl transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{currentStatus === 'COMPLETED' ? 'Transfer Completed' : 'Confirm & Transfer Data'}</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {progressState && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-300">{progressState.stepMessage}</span>
                  <span className="font-mono font-bold text-white">{progressState.progressPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressState.progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Received Offline Doctor Response UI (Renders only after data transfer completes) */}
            {currentStatus === 'COMPLETED' && receivedDoctorResponse && (
              <div className="bg-gradient-to-r from-teal-950/90 to-slate-900 border-2 border-teal-400 p-6 rounded-3xl space-y-4 mt-6 shadow-2xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-950">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full">
                      Prescription & Clinical Instructions
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">Received Doctor Offline Treatment Instructions</h3>
                    <p className="text-xs text-teal-300/80">Issued by {receivedDoctorResponse.doctorName} • {new Date(receivedDoctorResponse.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {receivedDoctorResponse.diagnosisSummary && (
                  <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block mb-0.5">Diagnosis Summary</span>
                    <p className="text-sm font-semibold text-white">{receivedDoctorResponse.diagnosisSummary}</p>
                  </div>
                )}

                <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Clinical Instructions & Prescriptions</span>
                  <p className="text-sm text-slate-200 font-medium whitespace-pre-wrap">{receivedDoctorResponse.instructions}</p>
                </div>

                {receivedDoctorResponse.followUpRequired && (
                  <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Follow-up consultation required in {receivedDoctorResponse.followUpDays || 3} days.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
