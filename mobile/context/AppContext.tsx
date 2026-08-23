'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getAuthRedirectUrl } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: 'upcoming' | 'past' | 'cancelled';
  avatarUrl: string;
  notes?: string;
  type: 'In-person' | 'Video Consultation';
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  instructions: string;
  taken: boolean;
  totalPills: number;
  remainingPills: number;
}

export interface MedicalRecord {
  id: string;
  title: string;
  category: 'Lab Report' | 'Imaging' | 'Prescription' | 'Cardiology' | 'General';
  date: string;
  doctor: string;
  facility: string;
  summary: string;
  fileSize: string;
  fileType: string;
  metrics?: { label: string; value: string; status: 'normal' | 'attention' | 'optimal'; range: string }[];
  doctorNotes?: string;
  downloadUrl?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'medication' | 'appointment' | 'record' | 'alert';
  read: boolean;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    expiryDate: string;
  };
  avatarUrl: string;
}

export interface VitalsData {
  steps: number;
  heart_rate: number;
  spo2: number;
  sleep_hours: number;
  sleep?: { totalMinutes: number; formatted: string };
  heartRateData?: Array<{ bpm: number; time: string }>;
  isAuthenticated?: boolean;
}

const defaultVitals: VitalsData = {
  steps: 0,
  heart_rate: 0,
  spo2: 98,
  sleep_hours: 0,
};

interface AppContextType {
  user: UserProfile;
  updateUser: (data: Partial<UserProfile>) => void;
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  cancelAppointment: (id: string) => void;
  medications: Medication[];
  toggleMedication: (id: string) => void;
  addMedication: (med: Omit<Medication, 'id'>) => void;
  records: MedicalRecord[];
  addRecord: (record: Omit<MedicalRecord, 'id'>) => string;
  getRecordById: (id: string) => MedicalRecord | undefined;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  markAllNotificationsRead: () => void;
  medicationAdherence: number;

  // Auth
  session: Session | null;
  supabaseUser: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  // Vitals
  vitals: VitalsData;
  vitalsLoading: boolean;
  fetchVitals: () => Promise<void>;
}

const defaultUser: UserProfile = {
  name: 'Sara Jenkins',
  age: 28,
  gender: 'Female',
  bloodType: 'A+',
  allergies: ['Penicillin', 'Sulfa Drugs', 'Latex'],
  chronicConditions: ['Mild Asthma'],
  phone: '+1 (555) 234-5678',
  email: 'sara.jenkins@example.com',
  emergencyContact: {
    name: 'Michael Jenkins',
    relationship: 'Spouse',
    phone: '+1 (555) 876-5432',
  },
  insurance: {
    provider: 'Blue Cross Shield Platinum',
    policyNumber: 'BCS-99482710',
    groupNumber: 'GRP-44102',
    expiryDate: '12/2027',
  },
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
};

const initialAppointments: Appointment[] = [
  {
    id: 'apt-1',
    doctorName: 'Dr. Aris Thorne',
    specialty: 'Cardiology Specialist',
    date: 'Tomorrow, Aug 17',
    time: '10:00 AM',
    location: 'Metropolitan Heart Center, Suite 402',
    status: 'upcoming',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    type: 'In-person',
    notes: 'Routine 6-month cardiovascular checkup and ECG review.',
  },
  {
    id: 'apt-2',
    doctorName: 'Dr. Elena Rostova',
    specialty: 'Pulmonology',
    date: 'Friday, Aug 22',
    time: '02:30 PM',
    location: 'Online Video Consultation',
    status: 'upcoming',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813594-55be6179427b?w=150&auto=format&fit=crop&q=80',
    type: 'Video Consultation',
    notes: 'Follow-up on seasonal asthma inhaler prescription adjustments.',
  },
  {
    id: 'apt-3',
    doctorName: 'Dr. Marcus Vance',
    specialty: 'General Practitioner',
    date: 'Jul 15, 2026',
    time: '11:15 AM',
    location: 'Downtown Wellness Clinic',
    status: 'past',
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    type: 'In-person',
    notes: 'Annual comprehensive health checkup. Blood work requested.',
  },
];

const initialMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Atorvastatin',
    dosage: '20mg',
    timing: '08:00 AM',
    timeSlot: 'morning',
    instructions: 'Take with or after breakfast with plenty of water',
    taken: true,
    totalPills: 30,
    remainingPills: 18,
  },
  {
    id: 'med-2',
    name: 'Metformin HCl',
    dosage: '500mg',
    timing: '01:00 PM',
    timeSlot: 'afternoon',
    instructions: 'Take with main lunch meal',
    taken: false,
    totalPills: 60,
    remainingPills: 42,
  },
  {
    id: 'med-3',
    name: 'Vitamin D3 & K2',
    dosage: '2000 IU',
    timing: '08:00 PM',
    timeSlot: 'evening',
    instructions: 'Take with evening meal containing healthy fats',
    taken: false,
    totalPills: 90,
    remainingPills: 74,
  },
  {
    id: 'med-4',
    name: 'Albuterol Inhaler',
    dosage: '90mcg (2 puffs)',
    timing: 'As Needed',
    timeSlot: 'morning',
    instructions: 'Inhale 2 puffs 15 minutes before vigorous exercise or when symptomatic',
    taken: true,
    totalPills: 200,
    remainingPills: 140,
  },
];

const initialRecords: MedicalRecord[] = [
  {
    id: 'rec-1',
    title: 'Comprehensive Metabolic Panel (CMP)',
    category: 'Lab Report',
    date: 'Aug 10, 2026',
    doctor: 'Dr. Marcus Vance',
    facility: 'Quest Diagnostic Labs',
    summary: 'All vital liver, kidney, electrolyte, and blood sugar markers are within optimal clinical thresholds.',
    fileSize: '2.4 MB',
    fileType: 'PDF Document',
    metrics: [
      { label: 'Fasting Glucose', value: '88 mg/dL', status: 'optimal', range: '70 - 99 mg/dL' },
      { label: 'eGFR (Kidney)', value: '> 90 mL/min', status: 'optimal', range: '> 60 mL/min' },
      { label: 'Serum Sodium', value: '140 mEq/L', status: 'normal', range: '135 - 145 mEq/L' },
      { label: 'Total Cholesterol', value: '172 mg/dL', status: 'optimal', range: '< 200 mg/dL' },
    ],
    doctorNotes: 'Excellent metabolic markers. Patient maintains good hydration and diet. Continue current maintenance dosage.',
  },
  {
    id: 'rec-2',
    title: 'Chest X-Ray (PA & Lateral Views)',
    category: 'Imaging',
    date: 'Jun 28, 2026',
    doctor: 'Dr. Elena Rostova',
    facility: 'City Imaging Center',
    summary: 'Clear bilateral lung fields. Normal cardiac silhouette. No pleural effusion or active infiltrates.',
    fileSize: '18.7 MB',
    fileType: 'DICOM / PDF',
    metrics: [
      { label: 'Lung Expansion', value: 'Normal', status: 'optimal', range: 'Normal' },
      { label: 'Cardiothoracic Ratio', value: '0.44', status: 'normal', range: '< 0.50' },
    ],
    doctorNotes: 'Asthmatic airway clear of acute bronchial obstruction. No signs of acute infection.',
  },
  {
    id: 'rec-3',
    title: '12-Lead Electrocardiogram (ECG)',
    category: 'Cardiology',
    date: 'May 14, 2026',
    doctor: 'Dr. Aris Thorne',
    facility: 'Metropolitan Heart Center',
    summary: 'Normal sinus rhythm, heart rate 68 bpm. Normal axis, normal PR and QT intervals. No ischemic changes.',
    fileSize: '1.1 MB',
    fileType: 'PDF Document',
    metrics: [
      { label: 'Resting Heart Rate', value: '68 bpm', status: 'optimal', range: '60 - 100 bpm' },
      { label: 'PR Interval', value: '142 ms', status: 'normal', range: '120 - 200 ms' },
      { label: 'QTc Interval', value: '412 ms', status: 'optimal', range: '< 450 ms' },
    ],
    doctorNotes: 'Cardiovascular electrical conduction is completely stable. Continue regular aerobic activity.',
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Appointment Reminder',
    message: 'Dr. Aris Thorne (Cardiology) is scheduled for tomorrow at 10:00 AM at Suite 402.',
    time: '15m ago',
    type: 'appointment',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Medication Due',
    message: 'Time to take Metformin HCl (500mg) with your afternoon meal.',
    time: '1h ago',
    type: 'medication',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'New Lab Report Available',
    message: 'Your Comprehensive Metabolic Panel results from Quest Labs are now ready to view.',
    time: 'Yesterday',
    type: 'record',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Vitals Sync Complete',
    message: 'Continuous heart rate and sleep telemetry successfully synced with smart wearable.',
    time: '2 days ago',
    type: 'alert',
    read: true,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [medications, setMedications] = useState<Medication[]>(initialMedications);
  const [records, setRecords] = useState<MedicalRecord[]>(initialRecords);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Vitals state
  const [vitals, setVitals] = useState<VitalsData>(defaultVitals);
  const [vitalsLoading, setVitalsLoading] = useState(false);

  // Ensure light mode is always active
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // ─── Auth Session Management ─────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          const meta = currentSession.user.user_metadata;
          setUser((prev) => ({
            ...prev,
            name: meta?.full_name || meta?.name || prev.name,
            email: currentSession.user.email || prev.email,
            avatarUrl: meta?.avatar_url || meta?.picture || prev.avatarUrl,
          }));
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      if (newSession?.user) {
        const meta = newSession.user.user_metadata;
        setUser((prev) => ({
          ...prev,
          name: meta?.full_name || meta?.name || prev.name,
          email: newSession.user.email || prev.email,
          avatarUrl: meta?.avatar_url || meta?.picture || prev.avatarUrl,
        }));
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Vitals Fetching ─────────────────────────────────────────────────
  const fetchVitals = useCallback(async () => {
    setVitalsLoading(true);
    try {
      const res = await fetch('/api/fit-data');
      if (res.ok) {
        const data = await res.json();
        setVitals({
          steps: data.steps || 0,
          heart_rate: data.heart_rate || 0,
          spo2: data.spo2 || 98,
          sleep_hours: data.sleep_hours || 0,
          sleep: data.sleep,
          heartRateData: data.heartRateData,
          isAuthenticated: data.isAuthenticated,
        });
      }
    } catch (e) {
      console.error('Error fetching vitals:', e);
    } finally {
      setVitalsLoading(false);
    }
  }, []);

  // Auto-fetch vitals when session is established
  useEffect(() => {
    if (session) {
      fetchVitals();
    }
  }, [session, fetchVitals]);

  // ─── Auth Functions ──────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: getAuthRedirectUrl('/auth/callback'),
        },
      });
      if (error) setAuthError(error.message);
    } catch (e: any) {
      setAuthError(e?.message || 'Google login failed');
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
    setAuthError(null);
    try {
      const emailLower = email.trim().toLowerCase();
      let { data, error } = await supabase.auth.signInWithPassword({ email: emailLower, password });
      
      if (error && (error.message.includes('Invalid login credentials') || emailLower.endsWith('@curatrack.in'))) {
        const isDoc = emailLower.includes('doctor') || emailLower.includes('dr.');
        const isAsha = emailLower.includes('asha') || emailLower.includes('fhw');
        const defaultName = isDoc ? 'Dr. David Ross' : isAsha ? 'Sunita Tai (ASHA)' : 'Kavita Bai';
        const role = isDoc ? 'doctor' : isAsha ? 'fhw' : 'patient';

        const signUpRes = await supabase.auth.signUp({
          email: emailLower,
          password,
          options: {
            data: { full_name: defaultName, role },
            emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
          },
        });

        if (signUpRes.data?.user) {
          const retrySignIn = await supabase.auth.signInWithPassword({ email: emailLower, password });
          if (!retrySignIn.error) {
            error = null;
          }
        }
      }

      if (error && !emailLower.endsWith('@curatrack.in')) {
        setAuthError(error.message);
        return { error: error.message };
      }

      // If demo account, ensure local user profile is set
      if (emailLower.endsWith('@curatrack.in')) {
        const isDoc = emailLower.includes('doctor');
        const isAsha = emailLower.includes('asha');
        setUser((prev) => ({
          ...prev,
          name: isDoc ? 'Dr. David Ross' : isAsha ? 'Sunita Tai (ASHA #402)' : 'Kavita Bai',
          email: emailLower,
        }));
      }

      return {};
    } catch (e: any) {
      const msg = e?.message || 'Login failed';
      setAuthError(msg);
      return { error: msg };
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string): Promise<{ error?: string }> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
        },
      });
      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }
      return {};
    } catch (e: any) {
      const msg = e?.message || 'Registration failed';
      setAuthError(msg);
      return { error: msg };
    }
  };

  const signOutFn = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setSupabaseUser(null);
    setVitals(defaultVitals);
  };

  // ─── Existing App Functions (unchanged) ──────────────────────────────
  const updateUser = (data: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  const addAppointment = (item: Omit<Appointment, 'id'>) => {
    const newApt: Appointment = {
      ...item,
      id: `apt-${Date.now()}`,
    };
    setAppointments((prev) => [newApt, ...prev]);

    // Also trigger notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Appointment Scheduled',
      message: `Confirmed with ${item.doctorName} for ${item.date} at ${item.time}.`,
      time: 'Just now',
      type: 'appointment',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const cancelAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'cancelled' as const } : apt))
    );
  };

  const toggleMedication = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const nextTaken = !med.taken;
          return {
            ...med,
            taken: nextTaken,
            remainingPills: nextTaken ? Math.max(0, med.remainingPills - 1) : med.remainingPills + 1,
          };
        }
        return med;
      })
    );
  };

  const addMedication = (med: Omit<Medication, 'id'>) => {
    const newMed: Medication = {
      ...med,
      id: `med-${Date.now()}`,
    };
    setMedications((prev) => [...prev, newMed]);
  };

  const addRecord = (record: Omit<MedicalRecord, 'id'>): string => {
    const newId = `rec-${Date.now()}`;
    const newRec: MedicalRecord = {
      ...record,
      id: newId,
    };
    setRecords((prev) => [newRec, ...prev]);

    // Also notify
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Document Uploaded',
      message: `"${record.title}" was successfully uploaded and linked to your records.`,
      time: 'Just now',
      type: 'record',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newId;
  };

  const getRecordById = (id: string) => {
    return records.find((r) => r.id === id);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const takenCount = medications.filter((m) => m.taken).length;
  const medicationAdherence = medications.length > 0
    ? Math.round((takenCount / medications.length) * 100)
    : 100;

  return (
    <AppContext.Provider
      value={{
        user,
        updateUser,
        appointments,
        addAppointment,
        cancelAppointment,
        medications,
        toggleMedication,
        addMedication,
        records,
        addRecord,
        getRecordById,
        notifications,
        markNotificationRead,
        dismissNotification,
        markAllNotificationsRead,
        medicationAdherence,

        // Auth
        session,
        supabaseUser,
        isAuthenticated: !!session,
        authLoading,
        authError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut: signOutFn,

        // Vitals
        vitals,
        vitalsLoading,
        fetchVitals,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
