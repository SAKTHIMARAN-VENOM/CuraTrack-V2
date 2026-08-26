import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SelfTriagePage from '../app/(dashboard)/self-triage/page';

describe('Frontend Website: Emergency Self-Triage & Referral Intake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/triage/self-assess')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              urgency: 'RED',
              severity: 4,
              consult_action: 'VISIT_EMERGENCY',
              recommendation: 'Immediate 108 Emergency Ambulance dispatch recommended.',
              color: 'red',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;
  });

  it('renders Emergency Self-Triage assessment page with symptom inputs', () => {
    render(<SelfTriagePage />);
    expect(screen.getByText(/Health Self-Triage & Emergency Routing/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Your Presenting Symptoms/i)).toBeInTheDocument();
  });
});
