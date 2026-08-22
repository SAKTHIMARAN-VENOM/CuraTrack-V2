/**
 * CuraTrack Mobile - Offline Storage Utility
 * Provides SSR-safe localStorage caching for patient profile, vitals, emergency QR, and records.
 */

const STORAGE_KEYS = {
  USER_PROFILE: 'curatrack_offline_user_profile',
  VITALS_HISTORY: 'curatrack_offline_vitals',
  EMERGENCY_QR: 'curatrack_offline_qr',
  INSURANCE_DATA: 'curatrack_offline_insurance',
  HEALTH_RISKS: 'curatrack_offline_health_risks',
  HEALTH_NEWS: 'curatrack_offline_health_news',
  MEDICATIONS: 'curatrack_offline_medications',
  LAB_REPORTS: 'curatrack_offline_lab_reports',
  INSIGHTS: 'curatrack_offline_insights',
  PENDING_SYNCS: 'curatrack_offline_pending_syncs',
};

export const offlineStorage = {
  // --- Connection Check Helper ---
  isOnline: (): boolean => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  },

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

  // --- Vitals & Fit Data Caching ---
  saveFitData: (data: any) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.VITALS_HISTORY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save vitals offline:', e);
    }
  },

  getFitData: (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VITALS_HISTORY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // --- Seasonal Disease Risks & Health Alerts Caching ---
  saveHealthRisks: (risksData: any) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.HEALTH_RISKS, JSON.stringify(risksData));
    } catch (e) {
      console.warn('Failed to save seasonal health risks offline:', e);
    }
  },

  getHealthRisks: (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HEALTH_RISKS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // --- Health News Caching ---
  saveHealthNews: (newsData: any) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.HEALTH_NEWS, JSON.stringify(newsData));
    } catch (e) {
      console.warn('Failed to save health news offline:', e);
    }
  },

  getHealthNews: (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HEALTH_NEWS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // --- Medication Tracker Caching ---
  saveMedications: (meds: any[], userId?: string) => {
    if (typeof window === 'undefined') return;
    try {
      const key = userId ? `${STORAGE_KEYS.MEDICATIONS}_${userId}` : STORAGE_KEYS.MEDICATIONS;
      localStorage.setItem(key, JSON.stringify(meds));
    } catch (e) {
      console.warn('Failed to save medications offline:', e);
    }
  },

  getMedications: (userId?: string): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const key = userId ? `${STORAGE_KEYS.MEDICATIONS}_${userId}` : STORAGE_KEYS.MEDICATIONS;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // --- Lab Reports Caching ---
  saveLabReports: (reports: any[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.LAB_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Failed to save lab reports offline:', e);
    }
  },

  getLabReports: (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAB_REPORTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // --- AI Health Insights Caching ---
  saveInsights: (insights: any[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(insights));
    } catch (e) {
      console.warn('Failed to save insights offline:', e);
    }
  },

  getInsights: (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INSIGHTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
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

  // --- Insurance Claims Caching ---
  saveClaims: (claims: any[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.INSURANCE_DATA, JSON.stringify(claims));
    } catch (e) {
      console.warn('Failed to save claims offline:', e);
    }
  },

  getClaims: (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INSURANCE_DATA);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
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
