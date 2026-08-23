import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

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
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
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

  it('should initialize with default user, session, and fetch vitals data', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.user).toBeDefined();
    expect(result.current.user.bloodType).toBe('A+');
    expect(result.current.appointments.length).toBeGreaterThan(0);
    expect(result.current.medications.length).toBeGreaterThan(0);
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

  it('should correctly toggle medication and update remaining pills and adherence', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const initialMeds = result.current.medications;
    const targetMed = initialMeds[1]; // Metformin (taken: false, remaining: 42)
    expect(targetMed.taken).toBe(false);

    act(() => {
      result.current.toggleMedication(targetMed.id);
    });

    const updatedMed = result.current.medications.find((m) => m.id === targetMed.id);
    expect(updatedMed?.taken).toBe(true);
    expect(updatedMed?.remainingPills).toBe(targetMed.remainingPills - 1);
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
    expect(added).toBeDefined();
    expect(added?.title).toBe('Lipid Panel');

    const notif = result.current.notifications.find((n) => n.message.includes('Lipid Panel'));
    expect(notif).toBeDefined();
  });

  it('should add and cancel appointments', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addAppointment({
        doctorName: 'Dr. Test Specialist',
        specialty: 'Neurology',
        date: 'Next Monday',
        time: '03:00 PM',
        location: 'Virtual Care',
        status: 'upcoming',
        avatarUrl: 'https://example.com/doc.jpg',
        type: 'Video Consultation',
      });
    });

    const addedApt = result.current.appointments.find((a) => a.doctorName === 'Dr. Test Specialist');
    expect(addedApt).toBeDefined();
    expect(addedApt?.status).toBe('upcoming');

    act(() => {
      if (addedApt) {
        result.current.cancelAppointment(addedApt.id);
      }
    });

    const cancelledApt = result.current.appointments.find((a) => a.doctorName === 'Dr. Test Specialist');
    expect(cancelledApt?.status).toBe('cancelled');
  });
});
