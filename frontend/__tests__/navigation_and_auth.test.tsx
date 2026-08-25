import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SideNavBar } from '../components/layout/SideNavBar';
import { TopNavBar } from '../components/layout/TopNavBar';

describe('Frontend Website: Navigation & Role-Based Workspaces', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Patient portal navigation items by default', async () => {
    localStorage.setItem('curatrack_active_role', 'patient');
    render(<SideNavBar />);
    await waitFor(() => {
      expect(screen.getByText(/My Health Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Gov Schemes & Hospitals/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Self-Triage/i)).toBeInTheDocument();
      expect(screen.getByText(/My Medical Records/i)).toBeInTheDocument();
    });
  });

  it('renders Doctor clinical navigation items when doctor role is active', async () => {
    localStorage.setItem('curatrack_active_role', 'doctor');
    render(<SideNavBar />);
    await waitFor(() => {
      expect(screen.getByText(/Clinical OPD Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Consultation Schedule/i)).toBeInTheDocument();
      expect(screen.getByText(/Referral Pipeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Drug Safety/i)).toBeInTheDocument();
    });
  });

  it('renders ASHA frontline worker navigation when fhw role is active', async () => {
    localStorage.setItem('curatrack_active_role', 'fhw');
    render(<SideNavBar />);
    await waitFor(() => {
      expect(screen.getByText(/ASHA Catchment Center/i)).toBeInTheDocument();
      expect(screen.getByText(/Community Triage/i)).toBeInTheDocument();
    });
  });

  it('renders Facility Operations navigation when facility role is active', async () => {
    localStorage.setItem('curatrack_active_role', 'facility_manager');
    render(<SideNavBar />);
    await waitFor(() => {
      const facilityElements = screen.getAllByText(/Facility Operations/i);
      expect(facilityElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Facility Archive/i)).toBeInTheDocument();
    });
  });

  it('renders TopNavBar header with user greeting and notifications', () => {
    render(<TopNavBar />);
    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Notifications/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Profile/i)).toBeInTheDocument();
  });
});
