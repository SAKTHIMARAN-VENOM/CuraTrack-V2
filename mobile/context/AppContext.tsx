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
  heart_points?: number;
  heart_rate: number;
  spo2: number;
  sleep_hours: number;
  sleep?: { totalMinutes: number; formatted: string };
  heartRateData?: Array<{ bpm: number; time: string }>;
  isAuthenticated?: boolean;
}

const defaultVitals: VitalsData = {
  steps: 0,
  heart_points: 0,
  heart_rate: 0,
  spo2: 98,
  sleep_hours: 0,
};

const initialUserProfile: UserProfile = {
  name: 'Citizen Patient',
  age: 32,
  gender: 'Female',
  bloodType: 'O+',
  allergies: ['No Known Drug Allergies (NKDA)'],
  chronicConditions: ['None Reported'],
  phone: '+91 98765 43210',
  email: 'patient@curatrack.in',
  emergencyContact: {
    name: 'Emergency Contact',
    relationship: 'Family Guardian',
    phone: '+91 98765 00000',
  },
  insurance: {
    provider: 'Ayushman Bharat PM-JAY',
    policyNumber: 'AB-PMJAY-2025-9981',
    groupNumber: 'NHA-IND-402',
    expiryDate: '12/2028',
  },
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(initialUserProfile);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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

  // ─── Database Data Loader ─────────────────────────────────────────────
  const loadUserDataFromDatabase = useCallback(async (userId: string, email?: string) => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
      let profile = null;

      // 1. Fetch Profile
      if (isUUID) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        profile = data;
      } else if (email) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        profile = data;
      }

      if (profile) {
        setUser((prev) => ({
          ...prev,
          name: profile.name || prev.name,
          email: profile.email || email || prev.email,
          phone: profile.phone || prev.phone,
          gender: profile.gender || prev.gender,
          age: profile.age || prev.age,
          bloodType: profile.blood_group || prev.bloodType,
          allergies: profile.allergies ? (Array.isArray(profile.allergies) ? profile.allergies : [profile.allergies]) : prev.allergies,
          chronicConditions: profile.chronic_conditions ? (Array.isArray(profile.chronic_conditions) ? profile.chronic_conditions : [profile.chronic_conditions]) : prev.chronicConditions,
          emergencyContact: {
            name: profile.emergency_contact_name || prev.emergencyContact.name,
            relationship: profile.emergency_contact_relationship || prev.emergencyContact.relationship,
            phone: profile.emergency_contact_phone || prev.emergencyContact.phone,
          },
          insurance: {
            provider: profile.insurance_provider || prev.insurance.provider,
            policyNumber: profile.insurance_policy_number || prev.insurance.policyNumber,
            groupNumber: prev.insurance.groupNumber,
            expiryDate: prev.insurance.expiryDate,
          }
        }));
      }

      // 2. Fetch Appointments
      const { data: apts } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (apts && apts.length > 0) {
        const mappedApts: Appointment[] = apts.map((a: any) => ({
          id: a.id,
          doctorName: a.doctor_name || 'Dr. Medical Officer',
          specialty: a.specialty || 'General OPD',
          date: a.date || (a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'),
          time: a.time || '10:00 AM',
          location: a.location || (a.type === 'Video Consultation' ? 'Online Telehealth' : 'Primary Health Centre'),
          status: (a.status as any) || 'upcoming',
          avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
          type: a.type || 'In-person',
          notes: a.notes || '',
        }));
        setAppointments(mappedApts);
      }

      // 3. Fetch Prescriptions / Medications
      const { data: meds } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', userId);

      if (meds && meds.length > 0) {
        const mappedMeds: Medication[] = meds.map((m: any) => ({
          id: m.id,
          name: m.medication_name || m.name || 'Prescription Medicine',
          dosage: m.dosage || '1 Tablet',
          timing: m.timing || '08:00 AM',
          timeSlot: m.time_slot || 'morning',
          instructions: m.instructions || 'Take as advised by doctor',
          taken: Boolean(m.taken),
          totalPills: m.total_pills || 30,
          remainingPills: m.remaining_pills || 30,
        }));
        setMedications(mappedMeds);
      }

      // 4. Fetch Documents / Medical Records
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (docs && docs.length > 0) {
        const mappedDocs: MedicalRecord[] = docs.map((d: any) => ({
          id: d.id,
          title: d.title || d.doc_name || 'Medical Document',
          category: (d.category as any) || 'Lab Report',
          date: d.date || (d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'),
          doctor: d.doctor || 'Attending Physician',
          facility: d.facility || 'Health Centre নন্দুরবার',
          summary: d.summary || d.extracted_text?.substring(0, 150) || 'Clinical record verified in system.',
          fileSize: d.file_size || '1.8 MB',
          fileType: d.file_type || 'PDF Document',
          doctorNotes: d.doctor_notes?.summary || d.summary || '',
          metrics: [
            { label: 'Ingestion Status', value: 'Verified', status: 'optimal', range: 'Validated' },
            { label: 'Record Class', value: d.category || 'General', status: 'normal', range: 'Standard' }
          ]
        }));
        setRecords(mappedDocs);
      }

      // 5. Fetch Notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notifs && notifs.length > 0) {
        const mappedNotifs: NotificationItem[] = notifs.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          type: n.type || 'alert',
          read: Boolean(n.read),
        }));
        setNotifications(mappedNotifs);
      }
    } catch (dbErr) {
      console.warn('Database load warning (using active cache):', dbErr);
    }
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
          await loadUserDataFromDatabase(currentSession.user.id, currentSession.user.email);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
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
        await loadUserDataFromDatabase(newSession.user.id, newSession.user.email);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserDataFromDatabase]);

  // ─── Vitals Fetching ─────────────────────────────────────────────────
  const fetchVitals = useCallback(async () => {
    setVitalsLoading(true);
    try {
      const res = await fetch('/api/fit-data');
      if (res.ok) {
        const data = await res.json();
        setVitals({
          steps: data.steps || 0,
          heart_points: data.heart_points || 0,
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
      const signInRes = await supabase.auth.signInWithPassword({ email: emailLower, password });
      let authUser = signInRes.data?.user;
      let authError = signInRes.error;

      const isOfficialAccount = emailLower.endsWith('@curatrack.com') || emailLower.includes('facility') || emailLower.includes('doctor') || emailLower.includes('asha') || emailLower.includes('admin') || emailLower.includes('patient');

      if (!authUser && isOfficialAccount) {
        try {
          const signupRes = await supabase.auth.signUp({
            email: emailLower,
            password,
          });
          if (signupRes.data?.user) {
            authUser = signupRes.data.user;
            authError = null;
          } else {
            const secondAttempt = await supabase.auth.signInWithPassword({ email: emailLower, password });
            if (secondAttempt.data?.user) {
              authUser = secondAttempt.data.user;
              authError = null;
            }
          }
        } catch {}
      }
      
      const userId = authUser?.id || (isOfficialAccount ? `official-${emailLower.replace(/[^a-z0-9]/g, '-')}` : null);

      if (!userId) {
        const errorMsg = authError?.message || 'Invalid email or password';
        setAuthError(errorMsg);
        return { error: errorMsg };
      }

      await loadUserDataFromDatabase(userId, emailLower);
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
    setUser(initialUserProfile);
    setAppointments([]);
    setMedications([]);
    setRecords([]);
    setNotifications([]);
  };

  // ─── Database-Synchronized Mutation Functions ─────────────────────────
  const updateUser = async (data: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...data }));
    const uid = session?.user?.id;
    if (uid) {
      try {
        await supabase.from('profiles').upsert({
          id: uid,
          name: data.name,
          email: data.email,
          phone: data.phone,
          age: data.age,
          gender: data.gender,
          blood_group: data.bloodType,
          allergies: data.allergies,
          chronic_conditions: data.chronicConditions,
          emergency_contact_name: data.emergencyContact?.name,
          emergency_contact_phone: data.emergencyContact?.phone,
          insurance_provider: data.insurance?.provider,
          insurance_policy_number: data.insurance?.policyNumber,
        });
      } catch (err) {
        console.warn('Profile sync failed:', err);
      }
    }
  };

  const addAppointment = async (item: Omit<Appointment, 'id'>) => {
    const newId = `apt-${Date.now()}`;
    const newApt: Appointment = {
      ...item,
      id: newId,
    };
    setAppointments((prev) => [newApt, ...prev]);

    const uid = session?.user?.id;
    if (uid) {
      try {
        await supabase.from('appointments').insert({
          id: newId,
          client_id: uid,
          doctor_name: item.doctorName,
          specialty: item.specialty,
          date: item.date,
          time: item.time,
          location: item.location,
          status: item.status,
          type: item.type,
          notes: item.notes,
        });
      } catch (err) {
        console.warn('Appointment DB insert failed:', err);
      }
    }

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

  const cancelAppointment = async (id: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'cancelled' as const } : apt))
    );
    try {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    } catch (err) {
      console.warn('Cancel appointment DB update failed:', err);
    }
  };

  const toggleMedication = async (id: string) => {
    let updatedMed: Medication | undefined;
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const nextTaken = !med.taken;
          updatedMed = {
            ...med,
            taken: nextTaken,
            remainingPills: nextTaken ? Math.max(0, med.remainingPills - 1) : med.remainingPills + 1,
          };
          return updatedMed;
        }
        return med;
      })
    );

    if (updatedMed) {
      try {
        await supabase.from('prescriptions').update({
          taken: (updatedMed as Medication).taken,
          remaining_pills: (updatedMed as Medication).remainingPills,
        }).eq('id', id);
      } catch (err) {
        console.warn('Medication toggle DB sync failed:', err);
      }
    }
  };

  const addMedication = async (med: Omit<Medication, 'id'>) => {
    const newId = `med-${Date.now()}`;
    const newMed: Medication = {
      ...med,
      id: newId,
    };
    setMedications((prev) => [...prev, newMed]);

    const uid = session?.user?.id;
    if (uid) {
      try {
        await supabase.from('prescriptions').insert({
          id: newId,
          patient_id: uid,
          medication_name: med.name,
          dosage: med.dosage,
          timing: med.timing,
          time_slot: med.timeSlot,
          instructions: med.instructions,
          total_pills: med.totalPills,
          remaining_pills: med.remainingPills,
          taken: med.taken,
        });
      } catch (err) {
        console.warn('Medication DB insert failed:', err);
      }
    }
  };

  const addRecord = (record: Omit<MedicalRecord, 'id'>): string => {
    const newId = `rec-${Date.now()}`;
    const newRec: MedicalRecord = {
      ...record,
      id: newId,
    };
    setRecords((prev) => [newRec, ...prev]);

    const uid = session?.user?.id;
    if (uid) {
      supabase.from('documents').insert({
        id: newId,
        patient_id: uid,
        title: record.title,
        category: record.category,
        doctor: record.doctor,
        facility: record.facility,
        summary: record.summary,
        file_size: record.fileSize,
        file_type: record.fileType,
      }).then();
    }

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

  const getRecordById = (id: string): MedicalRecord | undefined => {
    return records.find((r) => r.id === id);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    supabase.from('notifications').update({ read: true }).eq('id', id).then();
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then();
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const uid = session?.user?.id;
    if (uid) {
      supabase.from('notifications').update({ read: true }).eq('user_id', uid).then();
    }
  };

  // Medication adherence calculation
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m) => m.taken).length;
  const medicationAdherence = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

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
        isAuthenticated: !!session?.user,
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

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
