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
        let user: any = null;
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user;
        } catch {}

        let savedAuthUser: any = null;
        try {
          const raw = localStorage.getItem('curatrack_auth_user');
          if (raw) savedAuthUser = JSON.parse(raw);
        } catch {}

        const activeRole = localStorage.getItem('curatrack_active_role') || savedAuthUser?.role;

        if (activeRole === 'doctor' || user?.user_metadata?.role === 'doctor' || user?.email?.toLowerCase().includes('doctor')) {
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
        } else {
          const fallbackData: AuthenticatedPatientFullRecord = {
            patient: {
              patientId: user?.id || savedAuthUser?.id || 'PAT-LOCAL-001',
              name: savedAuthUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Authenticated Patient',
              bloodGroup: 'O+',
              gender: 'Female',
            },
            vitals: {
              heartRate: 74,
              spo2: 98,
              temperature: 36.7,
              systolicBp: 120,
              diastolicBp: 80,
              recordedAt: new Date().toISOString(),
            },
            medications: [],
            allergies: [],
            labResults: [],
            doctorNotes: [],
            recentPrescriptions: [],
          };
          setPatientRecord(fallbackData);
          manager.setDeviceIdentity({
            id: fallbackData.patient.patientId,
            name: fallbackData.patient.name,
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
                OfflineStorageManager.saveDoctorResponse(bRec.transferId, bRec.doctorResponse, bRec.package);
                if (new Date(bRec.doctorResponse.timestamp).getTime() >= sessionStartTimeRef.current) {
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

    const pollInterval = setInterval(pollDoctorResponse, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, [manager, router]);

  const handleStartScanning = async () => {
    setIsScanning(true);
    setDiscoveredDoctors([]);
    try {
      await manager.startScanning(
        (peer) => {
          if (peer.role === 'doctor') {
            setDiscoveredDoctors((prev) => {
              if (prev.some((p) => p.id === peer.id)) return prev;
              return [...prev, peer];
            });
          }
        },
        (lostId) => {
          setDiscoveredDoctors((prev) => prev.filter((p) => p.id !== lostId));
        }
      );
    } catch (err) {
      console.error('[PatientBTPage] Scan failed:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 4000);
    }
  };

  const handleSimulateDoctor = () => {
    const simDoc = manager.simulateDoctorPresence();
    setDiscoveredDoctors((prev) => {
      if (prev.some((p) => p.id === simDoc.id)) return prev;
      return [simDoc, ...prev];
    });
    setSelectedDoctor(simDoc);
  };

  const handleRequestConnection = async () => {
    if (!selectedDoctor) return;
    setProgressState({
      stepMessage: `Requesting authorization from ${selectedDoctor.name}...`,
      progressPercentage: 15,
      status: 'AWAITING_DOCTOR_APPROVAL',
    });

    try {
      const authorized = await manager.requestDoctorConnection(selectedDoctor, (state) => {
        setProgressState(state);
      });

      if (!authorized) {
        setProgressState({
          stepMessage: `Doctor ${selectedDoctor.name} declined or timed out the connection request.`,
          progressPercentage: 0,
          status: 'REJECTED',
        });
      }
    } catch (err: any) {
      setProgressState({
        stepMessage: `Connection request error: ${err.message || 'Network failure'}`,
        progressPercentage: 0,
        status: 'ERROR',
      });
    }
  };

  const toggleScope = (key: keyof MedicalDataScope) => {
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExecuteTransfer = async () => {
    if (!selectedDoctor || !patientRecord) return;

    setProgressState({
      stepMessage: 'Packaging and encrypting medical payload...',
      progressPercentage: 25,
      status: 'TRANSFERRING',
    });

    try {
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

      const success = await manager.executeDataTransfer(selectedDoctor, pkg, (state) => {
        setProgressState(state);
      });

      if (success) {
        // Save local transfer
        OfflineStorageManager.saveTransferRecord({
          transferId: pkg.transferId,
          timestamp: pkg.timestamp,
          patientId: pkg.patient.patientId,
          patientName: pkg.patient.name,
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.name,
          sourceDevice: selectedDoctor.name,
          package: pkg,
          status: 'PENDING_SYNC',
          syncAttempts: 0,
        });
      }
    } catch (err: any) {
      setProgressState({
        stepMessage: `Transfer failed: ${err.message || 'Unknown protocol error'}`,
        progressPercentage: 0,
        status: 'ERROR',
      });
    }
  };

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
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-surface">
        <div className="flex flex-col items-center gap-3 text-primary">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-on-surface">Loading Patient Medical Profile...</span>
        </div>
      </div>
    );
  }

  const currentStatus = progressState?.status || 'IDLE';

  return (
    <div className="p-6 md:p-10 font-body space-y-8 max-w-4xl mx-auto">

      {/* Navigation & Header */}
      <div className="flex items-center gap-4">
        <Link href="/bluetooth" className="p-3 bg-white border border-outline-variant/30 rounded-2xl hover:bg-surface-container-low transition-colors shadow-xs">
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </Link>
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
            <Bluetooth className="w-6 h-6 text-primary" />
            <span>Patient Offline Transfer</span>
          </h1>
          <p className="text-xs text-tertiary">
            Authenticated Patient: <strong className="text-on-surface">{patientRecord?.patient.name}</strong> ({patientRecord?.patient.patientId})
          </p>
        </div>
      </div>

      {/* Step 1: Scan for Nearby Broadcasting Doctor Devices */}
      <div className="bg-white border border-outline-variant/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <span>1. Available Nearby Doctors</span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Lists active doctors who are currently broadcasting availability over Bluetooth.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateDoctor}
              className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-primary font-bold text-xs px-3 py-2 rounded-xl transition-all border border-primary/20"
            >
              <PlusCircle className="w-3.5 h-3.5 text-primary" />
              <span>Simulate Doctor (Test Mode)</span>
            </button>

            <button
              onClick={handleStartScanning}
              disabled={isScanning}
              className="flex items-center justify-center gap-2 primary-gradient hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${isScanning ? 'animate-bounce text-white' : ''}`} />
              <span>{isScanning ? 'Scanning BLE...' : 'Scan Nearby Devices'}</span>
            </button>
          </div>
        </div>

        {discoveredDoctors.length === 0 ? (
          <div className="py-10 text-center text-tertiary border border-dashed border-outline-variant/40 rounded-2xl bg-surface-container-low/40 space-y-2">
            <Stethoscope className="w-8 h-8 mx-auto opacity-50 mb-1 text-outline" />
            <p className="text-sm font-bold text-on-surface">No active CuraTrack doctor devices broadcasting nearby.</p>
            <p className="text-xs text-tertiary max-w-md mx-auto">
              💡 <strong>How to test:</strong> Open <Link href="/bluetooth/doctor" target="_blank" className="text-primary underline font-bold">Doctor Suite</Link> in a 2nd tab/window and click <strong>"Become Available"</strong>, or click <strong>"Simulate Doctor (Test Mode)"</strong> above.
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
                      ? 'bg-primary/5 border-2 border-primary shadow-sm'
                      : 'bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40'
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" />
                      <h3 className="text-base font-headline font-bold text-on-surface">{doc.name}</h3>
                    </div>
                    <p className="text-xs text-secondary font-semibold">{doc.specialization || 'Clinical Specialist'}</p>
                    <p className="text-xs text-tertiary">{doc.hospitalName || 'CuraTrack Network'}</p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Broadcasting Available
                      </span>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-outline-variant'
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
      <div className="bg-white border border-outline-variant/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>2. Request Pairing Authorization</span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              Doctor must explicitly Accept your request before any medical data leaves your device.
            </p>
          </div>

          <button
            onClick={handleRequestConnection}
            disabled={!selectedDoctor || currentStatus === 'REQUEST_SENT' || currentStatus === 'AWAITING_DOCTOR_APPROVAL' || currentStatus === 'AUTHORIZED' || currentStatus === 'COMPLETED'}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {currentStatus === 'AWAITING_DOCTOR_APPROVAL' ? 'Waiting for Doctor...' : 'Request Doctor Connection'}
          </button>
        </div>

        {/* Connection Status Renderer */}
        {currentStatus === 'AWAITING_DOCTOR_APPROVAL' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900 text-sm animate-pulse">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
            <div>
              <p className="font-bold">Awaiting Doctor Approval...</p>
              <p className="text-xs text-amber-800">Connection request sent to {selectedDoctor?.name}. Zero medical data has been sent.</p>
            </div>
          </div>
        )}

        {currentStatus === 'REJECTED' && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-900 text-sm">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Connection Declined</p>
              <p className="text-xs text-rose-800">
                {selectedDoctor?.name || 'Doctor'} is not accepting the consultation. No medical information was transferred.
              </p>
            </div>
          </div>
        )}

        {(currentStatus === 'AUTHORIZED' || currentStatus === 'CONFIRMING_SCOPE' || currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED') && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-900 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Doctor Accepted Connection!</p>
              <p className="text-xs text-emerald-800">
                Session authorized with {selectedDoctor?.name}. Review consent scope below and click "Confirm & Transfer".
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Medical Scope Consent & Execute Transfer */}
      {(currentStatus === 'AUTHORIZED' || currentStatus === 'CONFIRMING_SCOPE' || currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED') && (
        <div className="bg-white border border-outline-variant/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              <span>3. Confirm Data Scope & Transfer</span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
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
                      ? 'bg-primary/5 border-primary text-primary'
                      : 'bg-surface-container-lowest border-outline-variant/20 text-tertiary hover:border-outline-variant/40'
                    }`}
                >
                  <div className="mt-0.5">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-outline" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-on-surface">
                      <IconComp className={`w-4 h-4 ${isChecked ? 'text-primary' : 'text-tertiary'}`} />
                      <span>{item.label}</span>
                    </div>
                    <p className="text-[11px] text-tertiary mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold text-on-surface">Ready to transfer to {selectedDoctor?.name}</p>
              <p className="text-[11px] text-tertiary">Only selected items above will be encrypted and transmitted.</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleExecuteBLETest}
                disabled={currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED'}
                className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container text-primary border border-primary/30 disabled:opacity-40 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Bluetooth className="w-4 h-4 text-primary" />
                <span>⚡ Test BLE POC (ACK)</span>
              </button>

              <button
                onClick={handleExecuteTransfer}
                disabled={currentStatus === 'TRANSFERRING' || currentStatus === 'COMPLETED'}
                className="flex items-center gap-2 primary-gradient hover:opacity-90 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{currentStatus === 'COMPLETED' ? 'Transfer Completed' : 'Confirm & Transfer Data'}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {progressState && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-primary">{progressState.stepMessage}</span>
                <span className="font-mono text-on-surface">{progressState.progressPercentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20 p-0.5">
                <div
                  className="h-full primary-gradient rounded-full transition-all duration-300"
                  style={{ width: `${progressState.progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Received Offline Doctor Response UI */}
          {currentStatus === 'COMPLETED' && receivedDoctorResponse && (
            <div className="bg-white border-2 border-secondary/40 p-6 rounded-3xl space-y-4 mt-6 shadow-md animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center font-bold">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <span className="bg-secondary-container text-on-secondary-container text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full">
                    Prescription & Clinical Instructions
                  </span>
                  <h3 className="text-base font-headline font-bold text-on-surface mt-1">Received Doctor Offline Treatment Instructions</h3>
                  <p className="text-xs text-tertiary">Issued by {receivedDoctorResponse.doctorName} • {new Date(receivedDoctorResponse.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {receivedDoctorResponse.diagnosisSummary && (
                <div className="bg-secondary-container/30 p-4 rounded-2xl border border-secondary/20">
                  <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-0.5">Diagnosis Summary</span>
                  <p className="text-sm font-bold text-on-surface">{receivedDoctorResponse.diagnosisSummary}</p>
                </div>
              )}

              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-tertiary tracking-wider block mb-0.5">Clinical Instructions & Prescriptions</span>
                <p className="text-sm text-on-surface font-medium whitespace-pre-wrap">{receivedDoctorResponse.instructions}</p>
              </div>

              {receivedDoctorResponse.followUpRequired && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Follow-up consultation required in {receivedDoctorResponse.followUpDays || 3} days.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
