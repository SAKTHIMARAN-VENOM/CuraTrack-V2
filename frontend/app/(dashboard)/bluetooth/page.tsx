"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bluetooth, 
  UserCheck, 
  Stethoscope, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { OfflineStorageManager } from '@/lib/bluetooth/offlineStorage';
import { LocalOfflineTransferRecord, DoctorOfflineResponse } from '@/lib/bluetooth/bluetoothTypes';
import { createClient } from '@/lib/supabase/client';

export default function BluetoothTransferHubPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [records, setRecords] = useState<LocalOfflineTransferRecord[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<'patient' | 'doctor' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    async function checkUserAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const isDoc = profile?.role === 'doctor' || 
                      user.user_metadata?.role === 'doctor' || 
                      user.email?.toLowerCase().includes('doctor') || 
                      user.email?.toLowerCase().includes('dr.');

        setUserRole(isDoc ? 'doctor' : 'patient');
      } catch (err) {
        console.error('[BluetoothHub] Auth check error:', err);
      } finally {
        setLoadingAuth(false);
      }
    }

    checkUserAuth();
  }, [router]);

  const loadLocalRecords = async () => {
    // 1. Fetch synced transfers from FastAPI backend to merge doctor responses
    try {
      const API_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;
      const res = await fetch(`${API_URL}/offline/transfers`);
      if (res.ok) {
        const data = await res.json();
        if (data.transfers && Array.isArray(data.transfers)) {
          data.transfers.forEach((bRec: any) => {
            if (bRec.doctorResponse && bRec.transferId) {
              OfflineStorageManager.saveDoctorResponse(bRec.transferId, bRec.doctorResponse, bRec.package);
            }
          });
        }
      }
    } catch (e) {}

    // 2. Load merged local device transfers
    const updatedData = OfflineStorageManager.getLocalTransfers();
    if (currentUserId && userRole) {
      if (userRole === 'doctor') {
        setRecords(updatedData.filter(r => r.doctorId === currentUserId || r.doctorName.includes('David Ross')));
      } else {
        setRecords(updatedData.filter(r => r.patientId === currentUserId || r.patientName.includes('Sarah') || r.patientName.includes('Akshanth')));
      }
    } else {
      setRecords(updatedData);
    }
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', loadLocalRecords);
    window.addEventListener('curatrack_doctor_presence_changed', loadLocalRecords);

    if (currentUserId && userRole) {
      loadLocalRecords();
    }

    const pollTimer = setInterval(() => {
      if (currentUserId && userRole) {
        loadLocalRecords();
      }
    }, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', loadLocalRecords);
      window.removeEventListener('curatrack_doctor_presence_changed', loadLocalRecords);
      clearInterval(pollTimer);
    };
  }, [currentUserId, userRole]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await OfflineStorageManager.syncPendingTransfers();
      loadLocalRecords();
      setSyncMessage(`Sync Complete: ${res.synced} record(s) synced to cloud, ${res.failed} failed.`);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message || 'Network error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getResponseForRecord = (rec: LocalOfflineTransferRecord): DoctorOfflineResponse | null => {
    return rec.doctorResponse || OfflineStorageManager.getDoctorResponse(rec.transferId);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-cyan-400">
          <Bluetooth className="w-6 h-6 animate-pulse" />
          <span className="text-sm font-semibold">Authenticating Role Access...</span>
        </div>
      </div>
    );
  }

  const pendingCount = records.filter(r => r.status === 'PENDING_SYNC' || r.status === 'FAILED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Connection Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50">
              <Bluetooth className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Bluetooth Offline Care</h1>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize">
                  {userRole} Mode
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Zero-internet medical data transfer & doctor consultations for remote areas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${
              isOnline 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isOnline ? 'Online (Ready to Sync)' : 'Offline Mode Active'}
              </span>
            </div>

            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2 rounded-2xl shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* ROLE-BASED SINGLE ACCESS CARD */}
        {userRole === 'patient' && (
          <div className="grid grid-cols-1 gap-6">
            <Link href="/bluetooth/patient" className="group">
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-cyan-500/50 p-8 rounded-3xl transition-all shadow-xl hover:shadow-cyan-950/30 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Patient Mode — Share Offline Medical Package
                  </h2>
                  <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
                    Scan for nearby broadcasting CuraTrack doctors, request connection authorization, select your consent scope, and transfer encrypted medical records offline.
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between text-cyan-400 font-bold text-base pt-6 border-t border-slate-800">
                  <span>Find Nearby Doctor & Start Transfer</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {userRole === 'doctor' && (
          <div className="grid grid-cols-1 gap-6">
            <Link href="/bluetooth/doctor" className="group">
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-teal-500/50 p-8 rounded-3xl transition-all shadow-xl hover:shadow-teal-950/30 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all" />
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-teal-950 text-teal-400 border border-teal-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-teal-300 transition-colors">
                    Doctor Mode — Offline Consultation Suite
                  </h2>
                  <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
                    Toggle broadcasting availability, approve incoming patient pair requests, inspect received medical summaries, and issue offline treatment instructions.
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between text-teal-400 font-bold text-base pt-6 border-t border-slate-800">
                  <span>Open Doctor Consultation Suite</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Filtered Local Offline Transfer Queue & Instruction Viewer */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>Your Local Transfer History & Doctor Treatment Plans ({userRole === 'doctor' ? 'Doctor' : 'Patient'})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved on local device storage. Click any item to inspect issued Doctor treatment plans.
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                {pendingCount} Pending Sync
              </span>
            )}
          </div>

          {records.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Bluetooth className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-medium">No transfer records found for your account.</p>
              <p className="text-xs mt-1">Transfers will appear here after completing an offline medical exchange.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => {
                const isExpanded = expandedRecordId === rec.transferId;
                const docResp = getResponseForRecord(rec);

                return (
                  <div 
                    key={rec.transferId}
                    className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 p-4 md:p-5 rounded-2xl space-y-3 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-cyan-400 font-bold">{rec.transferId}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            rec.status === 'SYNCED' 
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                              : rec.status === 'FAILED'
                              ? 'bg-red-950/60 text-red-400 border-red-500/30'
                              : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                          }`}>
                            {rec.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300 font-medium">
                          <span>Patient: <strong className="text-white">{rec.patientName}</strong></span>
                          <span className="text-slate-600">•</span>
                          <span>Doctor: <strong className="text-white">{rec.doctorName}</strong></span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Transferred: {new Date(rec.timestamp).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-start md:self-auto">
                        {docResp ? (
                          <button
                            onClick={() => setExpandedRecordId(isExpanded ? null : rec.transferId)}
                            className="bg-teal-950/60 hover:bg-teal-900/60 text-teal-300 border border-teal-500/40 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md"
                          >
                            <ShieldCheck className="w-4 h-4 text-teal-400" />
                            <span>View Doctor Instructions</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No instructions issued yet</span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Treatment Plan Details */}
                    {isExpanded && docResp && (
                      <div className="bg-slate-900 p-5 rounded-2xl border border-teal-500/30 text-sm space-y-3 mt-3 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-teal-400" />
                            <span className="font-bold text-white">Issued by {docResp.doctorName}</span>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(docResp.timestamp).toLocaleString()}</span>
                        </div>

                        {docResp.diagnosisSummary && (
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Diagnosis Summary</span>
                            <p className="text-sm font-semibold text-teal-300">{docResp.diagnosisSummary}</p>
                          </div>
                        )}

                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Clinical Instructions & Treatment Plan</span>
                          <p className="text-sm text-slate-200 font-medium whitespace-pre-wrap">{docResp.instructions}</p>
                        </div>

                        {docResp.followUpRequired && (
                          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs font-semibold text-amber-400">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Follow-up consultation required in {docResp.followUpDays || 3} days.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
