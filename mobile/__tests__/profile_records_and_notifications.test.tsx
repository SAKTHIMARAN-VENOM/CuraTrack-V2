import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfilePage from '../app/profile/page';
import MedicalRecordsPage from '../app/records/page';
import NotificationsPage from '../app/notifications/page';
import { AppProvider } from '../context/AppContext';

describe('Mobile App: Profile, Medical Records, and Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders User Profile page with medical identity and patient details', () => {
    render(
      <AppProvider>
        <UserProfilePage />
      </AppProvider>
    );
    expect(screen.getAllByText(/Citizen Patient/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ayushman Beneficiary/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Blood Group/i).length).toBeGreaterThan(0);
  });

  it('renders Medical Records archive with category filter chips', () => {
    render(
      <AppProvider>
        <MedicalRecordsPage />
      </AppProvider>
    );
    expect(screen.getByText(/Medical Records/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Lab Report/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prescription/i).length).toBeGreaterThan(0);
  });

  it('renders Notifications screen with alerts list and status subheader', () => {
    render(
      <AppProvider>
        <NotificationsPage />
      </AppProvider>
    );
    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Stay informed about appointments/i)).toBeInTheDocument();
  });
});
