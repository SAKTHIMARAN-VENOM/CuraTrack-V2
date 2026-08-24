import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

const createQueryMock = (returnValue: any = []) => {
  const queryObj: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve) => resolve({ data: returnValue, error: null })),
  };
  return queryObj;
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@curatrack.com',
              user_metadata: { full_name: 'Test Patient', avatar_url: 'https://example.com/avatar.jpg' },
            },
            access_token: 'mock-token',
          },
        },
      }),
      onAuthStateChange: vi.fn((callback) => {
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@curatrack.com' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => createQueryMock()),
  },
  getAuthRedirectUrl: vi.fn((path) => `https://cura-track-v3.vercel.app${path}`),
}));

describe('AppContext & State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: 8450,
        heart_rate: 72,
        spo2: 99,
        sleep_hours: 7.5,
        isAuthenticated: true,
      }),
    } as Response);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  );

  it('should initialize with user, session, and fetch vitals data', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.user).toBeDefined();
    expect(result.current.user.bloodType).toBeDefined();
  });

  it('should invoke signInWithGoogle with proper OAuth scopes and redirect URI', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          scopes: expect.stringContaining('fitness.activity.read'),
          redirectTo: 'https://cura-track-v3.vercel.app/auth/callback',
        }),
      })
    );
  });

  it('should handle signInWithEmail and signUpWithEmail', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await act(async () => {
      const loginRes = await result.current.signInWithEmail('test@curatrack.com', 'password123');
      expect(loginRes.error).toBeUndefined();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@curatrack.com',
      password: 'password123',
    });

    await act(async () => {
      const signupRes = await result.current.signUpWithEmail('new@curatrack.com', 'pass123', 'New User');
      expect(signupRes.error).toBeUndefined();
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@curatrack.com',
        password: 'pass123',
      })
    );
  });

  it('should correctly add and toggle medication', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await act(async () => {
      await result.current.addMedication({
        name: 'Metformin',
        dosage: '500mg',
        timing: '01:00 PM',
        timeSlot: 'afternoon',
        instructions: 'Take with meal',
        taken: false,
        totalPills: 60,
        remainingPills: 42,
      });
    });

    expect(result.current.medications.length).toBe(1);
    const medId = result.current.medications[0].id;

    await act(async () => {
      await result.current.toggleMedication(medId);
    });

    const updated = result.current.medications.find(m => m.id === medId);
    expect(updated?.taken).toBe(true);
  });

  it('should add medical record and generate notification alert', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    let newId: string = '';
    act(() => {
      newId = result.current.addRecord({
        title: 'Lipid Panel',
        category: 'Lab Report',
        date: 'Aug 23, 2026',
        doctor: 'Dr. Thorne',
        facility: 'Metropolitan Hospital',
        summary: 'Total cholesterol optimal',
        fileSize: '1.5 MB',
        fileType: 'PDF Document',
      });
    });

    expect(newId).toMatch(/^rec-/);
    const added = result.current.getRecordById(newId);
    expect(added?.title).toBe('Lipid Panel');
    expect(result.current.notifications.length).toBeGreaterThan(0);
  });

  it('should schedule and cancel appointments with database synchronization', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    await act(async () => {
      await result.current.addAppointment({
        doctorName: 'Dr. Test Physician',
        specialty: 'General Practitioner',
        date: 'Aug 26, 2026',
        time: '03:00 PM',
        location: 'District Health Center',
        status: 'upcoming',
        avatarUrl: 'https://example.com/doc.jpg',
        type: 'In-person',
      });
    });

    const created = result.current.appointments[0];
    expect(created.doctorName).toBe('Dr. Test Physician');

    await act(async () => {
      await result.current.cancelAppointment(created.id);
    });

    const cancelled = result.current.appointments.find((a) => a.id === created.id);
    expect(cancelled?.status).toBe('cancelled');
  });
});
