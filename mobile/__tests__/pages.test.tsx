import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import LoginPage from '../app/login/page';
import RegisterPage from '../app/register/page';
import VitalsPage from '../app/vitals/page';
import EmergencyPage from '../app/emergency/page';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
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
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
    expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    expect(screen.getByText(/Blood Oxygen/i)).toBeInTheDocument();
    expect(screen.getByText(/Sleep Duration/i)).toBeInTheDocument();
    expect(screen.getByText('Sync')).toBeInTheDocument();
  });

  it('EmergencyPage renders emergency dispatch, Medical ID, and GPS status', () => {
    render(
      <AppProvider>
        <EmergencyPage />
      </AppProvider>
    );

    expect(screen.getByText(/Connecting to 108 Ambulance & 112 Emergency/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel Auto-Call/i)).toBeInTheDocument();
    expect(screen.getByText(/Paramedic Medical ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Sara Jenkins/i)).toBeInTheDocument();
    expect(screen.getByText(/Acquiring GPS lock.../i)).toBeInTheDocument();
  });
});
