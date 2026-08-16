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

  const [userRole, setUserRole] = useState<'patient' | 'doctor'>('doctor');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    async function checkUserAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
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
        }
      } catch (err) {
        console.error('[BluetoothHub] Auth check error:', err);
      } finally {
        setLoadingAuth(false);
      }
    }

    checkUserAuth();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    loadLocalRecords();

    const pollTimer = setInterval(() => {
      loadLocalRecords();
    }, 1500);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      clearInterval(pollTimer);
    };
  }, [currentUserId, userRole]);

  const loadLocalRecords = () => {
    const updatedData = OfflineStorageManager.getLocalTransfers();
    setRecords(updatedData);
  };

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
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setUserRole('doctor')}
                    className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                      userRole === 'doctor' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🩺 Doctor Suite
                  </button>
                  <button
                    onClick={() => setUserRole('patient')}
                    className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                      userRole === 'patient' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👤 Patient Mode
                  </button>
                </div>
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
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
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

        {/* BOTH MODE OPTIONS DISPLAYED PROMINENTLY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor Mode Card */}
          <Link href="/bluetooth/doctor" className="group">
            <div className={`h-full bg-gradient-to-br from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border p-8 rounded-3xl transition-all shadow-xl relative overflow-hidden flex flex-col justify-between ${
              userRole === 'doctor' ? 'border-teal-500/80 ring-2 ring-teal-500/30 shadow-teal-950/40' : 'border-slate-800 hover:border-teal-500/50'
            }`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-950 text-teal-400 border border-teal-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest bg-teal-950 px-2.5 py-1 rounded-full border border-teal-800">Doctor Portal</span>
                </div>
                <h2 className="text-2xl font-bold text-white group-hover:text-teal-300 transition-colors">
                  Doctor Mode — Offline Consultation Suite
                </h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Broadcast availability, approve incoming patient pair requests, inspect received medical summaries, and issue offline treatment instructions.
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between text-teal-400 font-bold text-base pt-6 border-t border-slate-800">
                <span>Open Doctor Consultation Suite</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Patient Mode Card */}
          <Link href="/bluetooth/patient" className="group">
            <div className={`h-full bg-gradient-to-br from-slate-900 to-slate-900/80 hover:from-slate-850 hover:to-slate-900 border p-8 rounded-3xl transition-all shadow-xl relative overflow-hidden flex flex-col justify-between ${
              userRole === 'patient' ? 'border-cyan-500/80 ring-2 ring-cyan-500/30 shadow-cyan-950/40' : 'border-slate-800 hover:border-cyan-500/50'
            }`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-950 px-2.5 py-1 rounded-full border border-cyan-800">Patient Portal</span>
                </div>
                <h2 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Patient Mode — Share Offline Medical Package
                </h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Scan for nearby broadcasting doctors, request pairing authorization, select consent items, and transfer encrypted records offline.
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between text-cyan-400 font-bold text-base pt-6 border-t border-slate-800">
                <span>Find Nearby Doctor & Start Transfer</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Local Transfer History & Treatment Plan Viewer */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>Local Offline Transfer Records & Treatment Plans</span>
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
              <p className="text-sm font-medium">No transfer records found on this device.</p>
              <p className="text-xs mt-1">Transfers will appear here after completing an offline medical exchange.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => {
                const isExpanded = expandedRecordId === rec.transferId;
                return (
                  <div 
                    key={rec.transferId}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                  >
                    <div 
                      onClick={() => setExpandedRecordId(isExpanded ? null : rec.transferId)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-cyan-400 font-bold">{rec.transferId}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            rec.status === 'SYNCED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {rec.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          Patient: <strong className="text-slate-200">{rec.patientName}</strong> • Doctor: <strong className="text-slate-200">{rec.doctorName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {rec.doctorResponse ? '✅ Instructions Issued' : 'No instructions issued yet'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 bg-slate-900/40 border-t border-slate-800 space-y-4">
                        {rec.doctorResponse ? (
                          <div className="space-y-3 bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl">
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4" />
                              <span>Doctor Treatment Plan ({rec.doctorResponse.doctorName})</span>
                            </h4>
                            {rec.doctorResponse.diagnosisSummary && (
                              <p className="text-xs text-slate-300">
                                <strong>Diagnosis:</strong> {rec.doctorResponse.diagnosisSummary}
                              </p>
                            )}
                            <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800">
                              {rec.doctorResponse.instructions}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No offline response recorded yet.</p>
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
