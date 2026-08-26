import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DrugCheckerPage from '../app/(dashboard)/drug-checker/page';
import FrontlineHealthWorkerPage from '../app/(dashboard)/fhw/page';

describe('Frontend Website: Clinical Drug Safety & ASHA Frontline Portals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/check-drug-interactions') || urlStr.includes('/api/drug-checker') || urlStr.includes('drug')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              interactions_found: true,
              pairs: [
                {
                  drug_a: 'Warfarin',
                  drug_b: 'Ibuprofen',
                  severity: 'high',
                  description: 'Severe gastrointestinal bleeding risk when combined.',
                  source: 'OpenFDA / Clinical Rulebook'
                }
              ],
              safe_combinations: []
            })
        });
      }
      if (urlStr.includes('/api/fhw/beneficiaries')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              count: 2,
              beneficiaries: [
                {
                  id: 'BEN-001',
                  name: 'Sunita Patil',
                  age: 26,
                  gender: 'Female',
                  category: 'Maternal ANC',
                  risk_level: 'HIGH',
                  village_name: 'Borvihir Pada',
                  contact_phone: '9876543210',
                  next_due_date: '2026-08-28',
                  next_due_service: 'ANC-3 Blood Sugar Check'
                },
                {
                  id: 'BEN-002',
                  name: 'Ramesh Tadvi',
                  age: 58,
                  gender: 'Male',
                  category: 'NCD & Elderly',
                  risk_level: 'MEDIUM',
                  village_name: 'Nandurbar City',
                  contact_phone: '9876543211',
                  next_due_date: '2026-09-02',
                  next_due_service: 'Hypertension Follow-Up'
                }
              ]
            })
        });
      }
      if (urlStr.includes('/api/fhw/followups') || urlStr.includes('/api/fhw/followup-alerts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              total_alerts: 1,
              tasks: [
                {
                  id: 'TASK-101',
                  beneficiary_name: 'Sunita Patil',
                  due_date: '2026-08-28',
                  status: 'OVERDUE',
                  risk_level: 'HIGH',
                  action_required: 'Immediate home visit for BP triage'
                }
              ]
            })
        });
      }
      if (urlStr.includes('/api/facility/medicine-alerts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ medicines: [] })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });
    }) as any;
  });

  it('renders Drug Checker interface with interactive preset combinations', async () => {
    render(<DrugCheckerPage />);
    expect(screen.getByText(/Drug Interaction & EDL Safety Checker/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardio & Antiplatelet/i)).toBeInTheDocument();
    expect(screen.getByText(/High Risk Bleed Alert/i)).toBeInTheDocument();
  });

  it('checks drug interactions and renders high-severity warning banner', async () => {
    render(<DrugCheckerPage />);
    const bleedPreset = screen.getByText(/High Risk Bleed Alert/i);
    fireEvent.click(bleedPreset);

    const checkButton = screen.getByRole('button', { name: /Run Safety Screen/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText(/Severe gastrointestinal bleeding risk/i)).toBeInTheDocument();
    });
  });

  it('renders Frontline Health Worker ASHA dashboard and beneficiary roster', async () => {
    render(<FrontlineHealthWorkerPage />);
    expect(screen.getAllByText(/Village Patient Health Records/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(/Number of Patients/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Sunita Patil/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Ramesh Tadvi/i)).toBeInTheDocument();
    });
  });

  it('correctly prioritizes queue: today emergencies on top, scheduled future meetings lower', async () => {
    const { calculatePatientQueuePriority } = await import('../app/(dashboard)/doctor/page');

    const todayEmergency: any = {
      id: 'p-today-emer',
      name: 'Emergency Patient Today',
      priority: 'EMERGENCY',
      status: 'WAITING',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const todayPriority: any = {
      id: 'p-today-prio',
      name: 'Priority Patient Today',
      priority: 'PRIORITY',
      status: 'WAITING',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const todayRoutine: any = {
      id: 'p-today-rout',
      name: 'Routine Patient Today',
      priority: 'ROUTINE',
      status: 'WAITING',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const futureScheduled: any = {
      id: 'p-future-sched',
      name: 'Future Scheduled Patient',
      priority: 'EMERGENCY',
      status: 'WAITING',
      date: '2029-12-31'
    };

    const completedPatient: any = {
      id: 'p-done',
      name: 'Done Patient',
      priority: 'EMERGENCY',
      status: 'COMPLETED',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const scoreTodayEmer = calculatePatientQueuePriority(todayEmergency);
    const scoreTodayPrio = calculatePatientQueuePriority(todayPriority);
    const scoreTodayRout = calculatePatientQueuePriority(todayRoutine);
    const scoreFuture = calculatePatientQueuePriority(futureScheduled);
    const scoreDone = calculatePatientQueuePriority(completedPatient);

    // Today Emergency < Today Priority < Today Routine < Future Scheduled < Done
    expect(scoreTodayEmer).toBeLessThan(scoreTodayPrio);
    expect(scoreTodayPrio).toBeLessThan(scoreTodayRout);
    expect(scoreTodayRout).toBeLessThan(scoreFuture);
    expect(scoreFuture).toBeLessThan(scoreDone);
  });
});
