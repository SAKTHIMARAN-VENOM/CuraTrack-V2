import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SchemesPage from '../app/schemes/page';
import { AppProvider } from '../context/AppContext';

describe('Mobile App: Schemes Browsing & Claim Pre-Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/insurance-schemes')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              availableSchemes: [
                {
                  id: 'gov_ayushman',
                  name: 'Ayushman Bharat PM-JAY',
                  type: 'Government Comprehensive',
                  amount: '₹5,00,000',
                  match_percentage: 98,
                  category: 'government',
                },
              ],
            }),
        });
      }
      if (url.includes('/claims')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'success',
              claimId: 'CLM-MOB-901',
              message: 'Mobile claim initiated',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;
  });

  it('renders mobile schemes header and search filter bar', () => {
    render(
      <AppProvider>
        <SchemesPage />
      </AppProvider>
    );
    expect(screen.getByText(/Healthcare Schemes & Grants/i)).toBeInTheDocument();
    expect(screen.getByText(/Ayushman Bharat PM-JAY/i)).toBeInTheDocument();
  });
});
