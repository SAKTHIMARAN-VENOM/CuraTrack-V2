import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import LoginPage from '../app/login/page';
import RegisterPage from '../app/register/page';
import VitalsPage from '../app/vitals/page';
import EmergencyPage from '../app/emergency/page';

const createQueryMock = (returnValue: any = []) => ({
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
});

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => createQueryMock()),
  },
  getAuthRedirectUrl: vi.fn((path) => `https://cura-track-v3.vercel.app${path}`),
}));

describe('Mobile Screen Rendering & UI Components', () => {
  it('LoginPage renders email, password inputs, and Google OAuth button', () => {
    render(
      <AppProvider>
        <LoginPage />
      </AppProvider>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
  });

  it('RegisterPage renders name, email, blood type picker and Google OAuth button', () => {
    render(
      <AppProvider>
        <RegisterPage />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByText('Sign Up with Google')).toBeInTheDocument();
    expect(screen.getByText('A+')).toBeInTheDocument();
    expect(screen.getByText('O+')).toBeInTheDocument();
  });

  it('VitalsPage renders telemetry panels, Sync button, and health indicators', () => {
    render(
      <AppProvider>
        <VitalsPage />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Vitals Overview/i })).toBeInTheDocument();
    expect(screen.getByText(/Sync Wearables/i)).toBeInTheDocument();
    expect(screen.getByText(/Pulse Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Blood Oxygen/i)).toBeInTheDocument();
  });

  it('EmergencyPage renders 108 Indian Ambulance dispatch button', () => {
    render(
      <AppProvider>
        <EmergencyPage />
      </AppProvider>
    );

    expect(screen.getByText(/108 EMERGENCY SOS/i)).toBeInTheDocument();
    expect(screen.getByText(/National Emergency: 112/i)).toBeInTheDocument();
  });
});
