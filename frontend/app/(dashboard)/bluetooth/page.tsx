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
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-surface">
        <div className="flex flex-col items-center gap-3 text-primary">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-on-surface">Authenticating Role Access...</span>
        </div>
      </div>
    );
  }

  const pendingCount = records.filter(r => r.status === 'PENDING_SYNC' || r.status === 'FAILED').length;

  return (
    <div className="p-6 md:p-10 font-body space-y-8 max-w-6xl mx-auto">
      
      {/* Top Header & Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl primary-gradient flex items-center justify-center text-white shadow-sm">
            <Bluetooth className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-headline font-bold text-on-surface">Bluetooth Offline Care</h1>
              <span className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-0.5 rounded-full font-bold capitalize">
                {userRole} Mode
              </span>
            </div>
            <p className="text-tertiary text-sm mt-0.5">
              Zero-internet medical data transfer & doctor consultations for remote areas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold ${
            isOnline 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="uppercase tracking-wider">
              {isOnline ? 'Online (Ready to Sync)' : 'Offline Mode Active'}
            </span>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-2 primary-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="bg-primary/10 border border-primary/20 text-primary text-sm px-4 py-3 rounded-2xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* ROLE-BASED ACCESS CARD */}
      {userRole === 'patient' && (
        <div className="grid grid-cols-1 gap-6">
          <Link href="/bluetooth/patient" className="group">
            <div className="bg-white hover:bg-surface-container-low/50 border border-outline-variant/30 hover:border-primary/40 p-8 rounded-3xl transition-all shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors">
                  Patient Mode — Share Offline Medical Package
                </h2>
                <p className="text-tertiary text-sm mt-2 max-w-2xl leading-relaxed">
                  Scan for nearby broadcasting CuraTrack doctors, request connection authorization, select your consent scope, and transfer encrypted medical records offline.
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between text-primary font-bold text-sm pt-6 border-t border-slate-100">
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
            <div className="bg-white hover:bg-surface-container-low/50 border border-outline-variant/30 hover:border-secondary/40 p-8 rounded-3xl transition-all shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-headline font-bold text-on-surface group-hover:text-secondary transition-colors">
                  Doctor Mode — Offline Consultation Suite
                </h2>
                <p className="text-tertiary text-sm mt-2 max-w-2xl leading-relaxed">
                  Toggle broadcasting availability, approve incoming patient pair requests, inspect received medical summaries, and issue offline treatment instructions.
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between text-secondary font-bold text-sm pt-6 border-t border-slate-100">
                <span>Open Doctor Consultation Suite</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Local Offline Transfer Queue & Instruction Viewer */}
      <div className="bg-white rounded-3xl border border-outline-variant/30 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Your Local Transfer History & Doctor Treatment Plans ({userRole === 'doctor' ? 'Doctor' : 'Patient'})</span>
            </h3>
            <p className="text-xs text-tertiary mt-0.5">
              Saved on local device storage. Click any item to inspect issued Doctor treatment plans.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              {pendingCount} Pending Sync
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center text-tertiary border border-dashed border-outline-variant/40 rounded-2xl bg-surface-container-low/40">
            <Bluetooth className="w-10 h-10 mx-auto text-outline mb-2 opacity-60" />
            <p className="text-sm font-bold text-on-surface">No transfer records found for your account.</p>
            <p className="text-xs text-tertiary mt-1">Transfers will appear here after completing an offline medical exchange.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => {
              const isExpanded = expandedRecordId === rec.transferId;
              const docResp = getResponseForRecord(rec);

              return (
                <div 
                  key={rec.transferId}
                  className="bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant/40 p-4 md:p-5 rounded-2xl space-y-3 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-primary font-bold">{rec.transferId}</span>
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                          rec.status === 'SYNCED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : rec.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tertiary font-medium">
                        <span>Patient: <strong className="text-on-surface">{rec.patientName}</strong></span>
                        <span className="text-outline-variant">•</span>
                        <span>Doctor: <strong className="text-on-surface">{rec.doctorName}</strong></span>
                      </div>

                      <p className="text-xs text-tertiary">
                        Transferred: {new Date(rec.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                      {docResp ? (
                        <button
                          onClick={() => setExpandedRecordId(isExpanded ? null : rec.transferId)}
                          className="bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-secondary" />
                          <span>View Doctor Instructions</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="text-xs text-tertiary italic">No instructions issued yet</span>
                      )}
                    </div>
                  </div>

                  {/* Expandable Treatment Plan Details */}
                  {isExpanded && docResp && (
                    <div className="bg-secondary-container/40 p-5 rounded-2xl border border-secondary/30 text-sm space-y-3 mt-3 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-secondary/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-secondary" />
                          <span className="font-bold text-on-surface">Issued by {docResp.doctorName}</span>
                        </div>
                        <span className="text-xs text-tertiary">{new Date(docResp.timestamp).toLocaleString()}</span>
                      </div>

                      {docResp.diagnosisSummary && (
                        <div>
                          <span className="text-xs font-bold text-tertiary uppercase tracking-wider block mb-0.5">Diagnosis Summary</span>
                          <p className="text-sm font-bold text-secondary">{docResp.diagnosisSummary}</p>
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-bold text-tertiary uppercase tracking-wider block mb-0.5">Clinical Instructions & Treatment Plan</span>
                        <p className="text-sm text-on-surface font-medium whitespace-pre-wrap">{docResp.instructions}</p>
                      </div>

                      {docResp.followUpRequired && (
                        <div className="pt-2 border-t border-secondary/20 flex items-center gap-2 text-xs font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
  );
}
