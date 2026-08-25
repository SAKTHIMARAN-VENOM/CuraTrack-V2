import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmergencyPage from '../app/emergency/page';
import AppointmentsPage from '../app/appointments/page';
import MedicationsPage from '../app/medications/page';
import { AppProvider } from '../context/AppContext';

describe('Mobile App: Emergency 108 Dispatch, Appointments, and Medications', () => {
  it('renders Emergency 108 Ambulance Dispatch and SOS triggers', () => {
    render(
      <AppProvider>
        <EmergencyPage />
      </AppProvider>
    );
    expect(screen.getByText(/108/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency SOS/i)).toBeInTheDocument();
  });

  it('renders Appointments screen with active appointments tab and booking CTA', () => {
    render(
      <AppProvider>
        <AppointmentsPage />
      </AppProvider>
    );
    expect(screen.getAllByText(/Appointments/i).length).toBeGreaterThan(0);
  });

  it('renders Medications screen with active prescriptions and refill tracker', () => {
    render(
      <AppProvider>
        <MedicationsPage />
      </AppProvider>
    );
    expect(screen.getByText(/Medication Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Active Prescriptions/i)).toBeInTheDocument();
  });
});
