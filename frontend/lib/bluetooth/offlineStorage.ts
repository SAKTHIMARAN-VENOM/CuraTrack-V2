/**
 * CuraTrack V3 — Local Storage & Backend Synchronization Engine
 * Handles offline persistence of medical data packages, doctor responses,
 * queue management, retry logic, and backend synchronization when online.
 */

import { LocalOfflineTransferRecord, DoctorOfflineResponse, OfflineMedicalPackage } from './bluetoothTypes';
import { apiFetch } from '@/lib/api';

const STORAGE_KEY = 'curatrack_offline_transfers_v1';
const DOCTOR_RESPONSES_KEY = 'curatrack_doctor_offline_responses_v1';

export class OfflineStorageManager {
  /**
   * Fetch all local transfer records, filtering out legacy mock entries.
   */
  static getLocalTransfers(): LocalOfflineTransferRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list: LocalOfflineTransferRecord[] = JSON.parse(raw);
      return list.filter(r => r.patientName !== 'Sarah Jenkins' && !r.patientName.includes('Sarah'));
    } catch (err) {
      console.error('[OfflineStorage] Error reading local transfers:', err);
      return [];
    }
  }

  /**
   * Clear legacy mock data entries from localStorage.
   */
  static clearMockData(): void {
    if (typeof window === 'undefined') return;
    try {
      const records = this.getLocalTransfers();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {}
  }

  /**
   * Save or update a transfer record locally.
   */
  static saveTransferRecord(record: LocalOfflineTransferRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const records = this.getLocalTransfers();
      const existingIdx = records.findIndex(r => r.transferId === record.transferId);

      if (existingIdx >= 0) {
        records[existingIdx] = record;
      } else {
        records.unshift(record);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('[OfflineStorage] Error saving transfer record:', err);
    }
  }

  /**
   * Save Doctor's Offline Response to a local transfer record and sync to backend.
   */
  static saveDoctorResponse(transferId: string, response: DoctorOfflineResponse, pkg?: OfflineMedicalPackage): void {
    if (typeof window === 'undefined') return;
    try {
      const records = this.getLocalTransfers();
      let record = records.find(r => r.transferId === transferId);

      if (record) {
        record.doctorResponse = response;
        this.saveTransferRecord(record);
      } else {
        const newRecord: LocalOfflineTransferRecord = {
          transferId,
          timestamp: response.timestamp,
          patientId: pkg?.patient.patientId || 'PATIENT-BLE',
          patientName: pkg?.patient.name || 'Patient',
          doctorId: response.doctorId,
          doctorName: response.doctorName,
          sourceDevice: response.doctorName,
          package: pkg || {} as any,
          doctorResponse: response,
          status: 'PENDING_SYNC',
          syncAttempts: 0,
        };
        this.saveTransferRecord(newRecord);
      }

      // Also save in doctor responses store for standalone access
      const allResponsesRaw = localStorage.getItem(DOCTOR_RESPONSES_KEY);
      const allResponses: DoctorOfflineResponse[] = allResponsesRaw ? JSON.parse(allResponsesRaw) : [];
      const idx = allResponses.findIndex(r => r.transferId === transferId);
      if (idx >= 0) {
        allResponses[idx] = response;
      } else {
        allResponses.unshift(response);
      }
      localStorage.setItem(DOCTOR_RESPONSES_KEY, JSON.stringify(allResponses));
      window.dispatchEvent(new Event('curatrack_doctor_presence_changed'));

      // Immediately sync with FastAPI backend API so all tabs & devices receive the doctor response
      try {
        const API_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;
        const activePkg = pkg || (record ? record.package : null);
        if (activePkg && activePkg.patient) {
          fetch(`${API_URL}/offline/transfers/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transferId,
              timestamp: response.timestamp,
              patientId: activePkg.patient.patientId,
              doctorId: response.doctorId,
              package: activePkg,
              doctorResponse: response,
            }),
          }).catch(() => {});
        }
      } catch (e) {}
    } catch (err) {
      console.error('[OfflineStorage] Error saving doctor response:', err);
    }
  }

  /**
   * Retrieve Doctor's response by Transfer ID.
   */
  static getDoctorResponse(transferId: string): DoctorOfflineResponse | null {
    if (typeof window === 'undefined') return null;
    try {
      const record = this.getLocalTransfers().find(r => r.transferId === transferId);
      if (record?.doctorResponse) return record.doctorResponse;

      const raw = localStorage.getItem(DOCTOR_RESPONSES_KEY);
      if (!raw) return null;
      const responses: DoctorOfflineResponse[] = JSON.parse(raw);
      return responses.find(r => r.transferId === transferId) || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Synchronize all PENDING_SYNC records with the CuraTrack backend API.
   */
  static async syncPendingTransfers(): Promise<{ synced: number; failed: number }> {
    if (typeof window === 'undefined') return { synced: 0, failed: 0 };
    if (!navigator.onLine) {
      console.log('[OfflineStorage] Device is offline. Skipping sync.');
      return { synced: 0, failed: 0 };
    }

    const records = this.getLocalTransfers();
    const pendingRecords = records.filter(r => r.status === 'PENDING_SYNC' || r.status === 'FAILED');

    let syncedCount = 0;
    let failedCount = 0;

    for (const record of pendingRecords) {
      try {
        record.status = 'SYNCING';
        this.saveTransferRecord(record);

        await apiFetch('/api/offline/transfers/sync', {
          method: 'POST',
          body: JSON.stringify({
            transferId: record.transferId,
            timestamp: record.timestamp,
            patientId: record.patientId,
            doctorId: record.doctorId,
            package: record.package,
            doctorResponse: record.doctorResponse,
          }),
        });

        record.status = 'SYNCED';
        record.syncedAt = new Date().toISOString();
        record.lastErrorMessage = undefined;
        this.saveTransferRecord(record);
        syncedCount++;
      } catch (err: any) {
        console.warn(`[OfflineStorage] Temporary network issue syncing transfer ${record.transferId}:`, err?.message || err);
        record.status = 'FAILED';
        record.syncAttempts = (record.syncAttempts || 0) + 1;
        record.lastErrorMessage = err?.message || 'Sync queued for online connection';
        this.saveTransferRecord(record);
        failedCount++;
      }
    }

    return { synced: syncedCount, failed: failedCount };
  }
}
