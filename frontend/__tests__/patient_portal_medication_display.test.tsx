import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HealthRecordsPage from '../app/(dashboard)/records/page';

// Mock navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key: string) => (key === 'patientId' ? null : null)),
  }),
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, _params?: any, defaultVal?: string) => defaultVal || key,
    locale: 'en',
    setLocale: vi.fn(),
  }),
}));

// Mock API fetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (_url: string, _opts?: any) => {
    return { success: true };
  }),
}));

let mockMedicationsData: any[] = [];
let mockPrescriptionsData: any[] = [];
let mockMedicineOrdersData: any[] = [];

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'patient-test-user-1', email: 'patient@curatrack.in' } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'patient-test-user-1',
                  name: 'Kavita Bai',
                  email: 'patient@curatrack.in',
                  role: 'patient',
                },
                error: null,
              }),
            }),
            neq: () => ({
              neq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'medications') {
        return {
          select: () => ({
            eq: (_col: string, _val: string) =>
              Promise.resolve({ data: mockMedicationsData, error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'prescriptions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockPrescriptionsData, error: null }),
            }),
          }),
        };
      }
      if (table === 'medicine_orders') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockMedicineOrdersData, error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    },
  }),
}));

describe('Patient Portal: Authoritative Inventory vs Non-Inventory Prescription Display', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('curatrack_active_role', 'patient');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'patient-test-user-1',
        name: 'Kavita Bai',
        email: 'patient@curatrack.in',
        role: 'patient',
      })
    );
    mockMedicationsData = [];
    mockPrescriptionsData = [];
    mockMedicineOrdersData = [];
    vi.clearAllMocks();
  });

  it('TEST 1: Inventory medicine prescription appears in Patient Portal and Order button is NOT displayed', async () => {
    mockMedicationsData = [
      {
        id: 'med-inv-1',
        name: 'Paracetamol 500mg (Tablet)',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        time: 'Morning',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'INV-MED-001',
      },
    ];

    render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg (Tablet)')).toBeInTheDocument();
    });

    // Mark Taken button should be present
    expect(screen.getByText('Mark Taken')).toBeInTheDocument();

    // Order button must NOT be present for facility inventory medicine
    const orderButtons = screen.queryAllByRole('button', { name: /Order/i });
    const directOrderButtons = orderButtons.filter((b) => b.textContent?.trim() === 'Order');
    expect(directOrderButtons.length).toBe(0);
  });

  it('TEST 2: Non-inventory medicine prescription appears in Patient Portal and Order button IS displayed', async () => {
    mockMedicationsData = [
      {
        id: 'med-non-inv-1',
        name: 'Cough Syrup XYZ',
        dosage: '10ml',
        frequency: 'TDS',
        time: 'Morning',
        status: 'UPCOMING',
        prescription_type: 'NON-INVENTORY',
        is_inventory: false,
      },
    ];

    render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cough Syrup XYZ')).toBeInTheDocument();
    });

    // Both Order and Mark Taken must be visible for Non-Inventory medicine
    expect(screen.getByText('Mark Taken')).toBeInTheDocument();
    const orderButton = screen.getByRole('button', { name: /Order/i });
    expect(orderButton).toBeInTheDocument();
  });

  it('TEST 3: Inventory medicine later becoming out of stock does NOT show Order button (Classification is authoritative)', async () => {
    // Even if inventory stock changes in facility, stored prescription_type = INVENTORY remains authoritative
    mockMedicationsData = [
      {
        id: 'med-inv-2',
        name: 'Amoxicillin 500mg (Capsule)',
        dosage: '500mg',
        frequency: 'TDS (Three times daily)',
        time: 'Morning',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'INV-MED-002',
      },
    ];

    render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 500mg (Capsule)')).toBeInTheDocument();
    });

    // Authoritative check: Order button is NOT displayed
    const orderButtons = screen.queryAllByRole('button', { name: /Order/i });
    const directOrderButtons = orderButtons.filter((b) => b.textContent?.trim() === 'Order');
    expect(directOrderButtons.length).toBe(0);
    expect(screen.getByText('Mark Taken')).toBeInTheDocument();
  });

  it('TEST 4: Non-inventory medicine does not get reclassified and still shows Order button', async () => {
    mockMedicationsData = [
      {
        id: 'med-non-inv-2',
        name: 'Specialist Compound ABC',
        dosage: '25mg',
        frequency: 'OD (Once daily)',
        time: 'Morning',
        status: 'UPCOMING',
        prescription_type: 'NON-INVENTORY',
        is_inventory: false,
      },
    ];

    render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Specialist Compound ABC')).toBeInTheDocument();
    });

    // Authoritative check: Order button IS displayed
    const orderButton = screen.getByRole('button', { name: /Order/i });
    expect(orderButton).toBeInTheDocument();
    expect(screen.getByText('Mark Taken')).toBeInTheDocument();
  });

  it('TEST 5: Existing Mark Taken functionality continues to toggle medication status', async () => {
    mockMedicationsData = [
      {
        id: 'med-toggle-1',
        name: 'Cetirizine 10mg (Tablet)',
        dosage: '10mg',
        frequency: 'HS (At bedtime)',
        time: 'Night',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];

    render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cetirizine 10mg (Tablet)')).toBeInTheDocument();
    });

    const markTakenBtn = screen.getByText('Mark Taken');
    fireEvent.click(markTakenBtn);

    await waitFor(() => {
      expect(screen.getByText('✓ Taken')).toBeInTheDocument();
    });
  });
});
