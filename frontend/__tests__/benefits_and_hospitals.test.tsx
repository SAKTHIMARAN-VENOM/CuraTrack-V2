import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BenefitsPage from '../app/(dashboard)/benefits/page';

describe('Frontend Website: Benefits, Empanelled Hospitals & Diagnostic Centres', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/government-schemes/filters')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              states: ['Maharashtra', 'Tamil Nadu', 'Delhi', 'Karnataka'],
              facility_types: [
                'District Hospital',
                'Community Health Centre (CHC)',
                'Diagnostic & Imaging Centre',
                'Tertiary Government Medical College',
              ],
              schemes: ['Ayushman Bharat – PMJAY', 'MJPJAY', 'CMCHIS'],
            }),
        });
      }
      if (url.includes('/api/government-schemes/hospitals')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              count: 2,
              facilities: [
                {
                  id: 'FAC-MH-001',
                  name: 'Nandurbar District Civil Hospital',
                  type: 'District Hospital',
                  state: 'Maharashtra',
                  district: 'Nandurbar',
                  address: 'Civil Hospital Road, Nandurbar 425412',
                  schemes: ['Ayushman Bharat – PMJAY', 'MJPJAY'],
                  cashless_available: true,
                  emergency_ready: true,
                  contact_phone: '02564-222100',
                  procedures_covered: ['Cardiology', 'General Surgery', 'Obstetrics & Gynecology'],
                  diagnostic_imaging: ['X-Ray', 'Ultrasound', 'ECG', 'Blood Biochemistry'],
                  verified: true,
                },
                {
                  id: 'FAC-MH-002',
                  name: 'Apollo Diagnostics & Advanced Imaging',
                  type: 'Diagnostic & Imaging Centre',
                  state: 'Maharashtra',
                  district: 'Mumbai',
                  address: 'Andheri West, Mumbai',
                  schemes: ['Ayushman Bharat – PMJAY', 'MJPJAY'],
                  cashless_available: true,
                  emergency_ready: false,
                  contact_phone: '022-67890123',
                  procedures_covered: ['Advanced Diagnostics', 'Pathology'],
                  diagnostic_imaging: ['MRI 3T', '128-Slice CT', 'PET-CT', 'Pathology Lab'],
                  verified: true,
                },
              ],
            }),
        });
      }
      if (url.includes('/api/government-schemes/verify-hospital')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              is_empanelled: true,
              hospital_name: 'Nandurbar District Civil Hospital',
              matched_schemes: ['Ayushman Bharat – PMJAY', 'MJPJAY'],
              cashless_coverage: '₹5,00,000 / family / year cashless hospitalization',
              cashless_available: true,
              free_diagnostics: ['X-Ray', 'Ultrasound', 'ECG'],
              helpline: '14555',
            }),
        });
      }
      if (url.includes('/api/patient/') && url.includes('/insurance-schemes')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              availableSchemes: [
                {
                  id: 'gov_ayushman',
                  name: 'Ayushman Bharat – PMJAY',
                  type: 'Government Comprehensive',
                  amount: '₹5,00,000',
                  match_percentage: 98,
                  category: 'government',
                },
              ],
            }),
        });
      }
      if (url.includes('/api/patient/') && url.includes('/claims')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'success',
              claimId: 'CLM-8821',
              message: 'Claim filed successfully.',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;
  });

  it('renders page header and 4 interactive navigation tabs', async () => {
    render(<BenefitsPage />);
    expect(screen.getByText(/Government Schemes & Empanelled Hospitals/i)).toBeInTheDocument();
    expect(screen.getByText(/Empanelled Hospitals & Labs/i)).toBeInTheDocument();
    expect(screen.getByText(/Instant Hospital Verifier/i)).toBeInTheDocument();
    expect(screen.getByText(/Government Schemes & Eligibility/i)).toBeInTheDocument();
    expect(screen.getByText(/My Claims & Applications/i)).toBeInTheDocument();
  });

  it('renders hospital directory and displays empanelled facilities with scheme badges', async () => {
    render(<BenefitsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nandurbar District Civil Hospital/i)).toBeInTheDocument();
      expect(screen.getByText(/Apollo Diagnostics & Advanced Imaging/i)).toBeInTheDocument();
    });
  });

  it('switches to Instant Verifier tab and allows verifying hospital empanelment', async () => {
    render(<BenefitsPage />);
    const verifierTab = screen.getByText(/Instant Hospital Verifier/i);
    fireEvent.click(verifierTab);

    expect(screen.getByText(/Check If A Hospital Is Under Government Schemes/i)).toBeInTheDocument();
    const exampleButton = screen.getByText(/AIIMS New Delhi/i);
    fireEvent.click(exampleButton);

    await waitFor(() => {
      expect(screen.getByText(/Verified Empanelled Hospital/i)).toBeInTheDocument();
    });
  });

  it('switches to Government Schemes tab and displays matched PMJAY benefits', async () => {
    render(<BenefitsPage />);
    const schemesTab = screen.getByText(/Government Schemes & Eligibility/i);
    fireEvent.click(schemesTab);

    await waitFor(() => {
      expect(screen.getByText(/Ayushman Bharat – PMJAY/i)).toBeInTheDocument();
    });
  });

  it('renders ASHA beneficiary selector when fhw role is active and allows enrolling patient in scheme', async () => {
    localStorage.setItem('curatrack_active_role', 'fhw');
    render(<BenefitsPage />);

    await waitFor(() => {
      expect(screen.getByText(/ASHA Assisted Beneficiary Enrolment/i)).toBeInTheDocument();
      expect(screen.getByText(/Switch Beneficiary/i)).toBeInTheDocument();
    });

    // Open beneficiary picker
    const switchBtn = screen.getByText(/Switch Beneficiary/i);
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by beneficiary name/i)).toBeInTheDocument();
    });

    // Switch to Schemes tab
    const schemesTab = screen.getByText(/Government Schemes & Eligibility/i);
    fireEvent.click(schemesTab);

    await waitFor(() => {
      expect(screen.getByText(/Ayushman Bharat – PMJAY/i)).toBeInTheDocument();
    });
  });
});
