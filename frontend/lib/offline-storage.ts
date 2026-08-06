/**
 * CuraTrack Mobile - Offline Storage Utility
 * Provides SSR-safe localStorage caching for patient profile, vitals, emergency QR, and records.
 */

const STORAGE_KEYS = {
  USER_PROFILE: 'curatrack_offline_user_profile',
  VITALS_HISTORY: 'curatrack_offline_vitals',
  EMERGENCY_QR: 'curatrack_offline_qr',
  INSURANCE_DATA: 'curatrack_offline_insurance',
  PENDING_SYNCS: 'curatrack_offline_pending_syncs',
};

export const offlineStorage = {
  // --- User Profile & Passport Caching ---
  saveProfile: (profile: any) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile offline:', e);
    }
  },

  getProfile: (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // --- Emergency QR Code Caching ---
  saveEmergencyQR: (qrData: any) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.EMERGENCY_QR, JSON.stringify(qrData));
    } catch (e) {
      console.warn('Failed to save QR code offline:', e);
    }
  },

  getEmergencyQR: (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMERGENCY_QR);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // --- Offline Action Queue ---
  queueOfflineAction: (action: { type: string; payload: any; timestamp: number }) => {
    if (typeof window === 'undefined') return;
    try {
      const existing = offlineStorage.getPendingSyncs();
      existing.push(action);
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNCS, JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to queue offline action:', e);
    }
  },

  getPendingSyncs: (): Array<{ type: string; payload: any; timestamp: number }> => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_SYNCS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  clearPendingSyncs: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_SYNCS);
    } catch (e) {}
  },
};
