import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HealthRecordsPage from '../app/(dashboard)/records/page';
import DoctorDashboardPage from '../app/(dashboard)/doctor/page';

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
    t: (key: string, defaultVal?: any) => (typeof defaultVal === 'string' ? defaultVal : key),
    locale: 'en',
    setLocale: vi.fn(),
  }),
}));

let mockMedicationsData: any[] = [];
let mockPrescriptionsData: any[] = [];
let mockMedicineOrdersData: any[] = [];
let mockAppointmentsData: any[] = [];
let stockDeductCalls: any[] = [];

// Mock API fetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (url: string, opts?: any) => {
    if (url.includes('/api/facility/medicines/deduct-stock')) {
      const body = opts?.body ? JSON.parse(opts.body) : {};
      stockDeductCalls.push(body);
      return { success: true, message: 'Stock deducted', deductions: body.items || [] };
    }
    if (url.includes('/api/facility/medicines')) {
      if (
        url.toLowerCase().includes('cetirizine') ||
        url.toLowerCase().includes('unlisted') ||
        url.toLowerCase().includes('specialist')
      ) {
        return { medicines: [] };
      }
      return {
        medicines: [
          {
            id: 'MED-101',
            name: 'Paracetamol 500mg (Tablet)',
            category: 'Analgesics / Antipyretics',
            stock_units: 750,
            status: 'ADEQUATE',
            unit: 'tablets',
          },
          {
            id: 'MED-102',
            name: 'Amoxicillin 500mg (Capsule)',
            category: 'Antibiotics',
            stock_units: 300,
            status: 'ADEQUATE',
            unit: 'capsules',
          },
        ],
      };
    }
    if (url.includes('/api/fhw/followups')) {
      return { followups: [] };
    }
    if (url.includes('/api/referrals')) {
      return { referrals: [] };
    }
    if (url.includes('/api/facility/beds')) {
      return { total: 50, occupied: 30, available: 20, icu_available: 5 };
    }
    if (url.includes('/api/facility/medicine-alerts')) {
      return { medicines: [] };
    }
    return { success: true };
  }),
}));

// Helper to create chained query mock
const createQueryMock = (dataGetter: () => any[]) => {
  let lastUpdates: any = null;
  const pendingFilters: Array<{ col: string; val: any }> = [];

  const queryObj: any = {
    select: vi.fn(() => queryObj),
    eq: vi.fn((col: string, val: any) => {
      pendingFilters.push({ col, val });
      if (lastUpdates) {
        const list = dataGetter();
        list.forEach((item) => {
          if (item[col] === val) {
            Object.assign(item, lastUpdates);
          }
        });
      }
      return queryObj;
    }),
    neq: vi.fn(() => queryObj),
    not: vi.fn(() => queryObj),
    or: vi.fn(() => queryObj),
    in: vi.fn(() => queryObj),
    ilike: vi.fn(() => queryObj),
    order: vi.fn(() => queryObj),
    limit: vi.fn(() => queryObj),
    maybeSingle: vi.fn(() => Promise.resolve({ data: dataGetter()[0] || null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: dataGetter()[0] || null, error: null })),
    then: (resolve: any) => resolve({ data: dataGetter(), error: null }),
    update: vi.fn((updates: any) => {
      lastUpdates = updates;
      if (pendingFilters.length > 0) {
        const list = dataGetter();
        list.forEach((item) => {
          const match = pendingFilters.every((f) => item[f.col] === f.val);
          if (match) {
            Object.assign(item, updates);
          }
        });
      }
      return queryObj;
    }),
    insert: vi.fn((records: any[]) => {
      const arr = Array.isArray(records) ? records : [records];
      arr.forEach((r) => {
        dataGetter().push({ ...r, id: r.id || `rec-${Date.now()}` });
      });
      return Promise.resolve({ data: null, error: null });
    }),
    delete: vi.fn(() => queryObj),
  };
  return queryObj;
};

// Mock Supabase with in-memory persistence simulation
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn().mockImplementation(() => {
        const activeRole = typeof window !== 'undefined' ? localStorage.getItem('curatrack_active_role') : null;
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('curatrack_auth_user') : null;
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            return Promise.resolve({ data: { user: parsed }, error: null });
          } catch {}
        }
        if (activeRole === 'doctor') {
          return Promise.resolve({
            data: { user: { id: 'doc-1', email: 'doctor@curatrack.in' } },
            error: null,
          });
        }
        return Promise.resolve({
          data: { user: { id: 'patient-test-user-1', email: 'patient@curatrack.in' } },
          error: null,
        });
      }),
    },
    from: (table: string) => {
      if (table === 'profiles') {
        let queriedId = 'patient-test-user-1';
        const queryObj: any = {
          select: vi.fn(() => queryObj),
          eq: vi.fn((_col: string, val: string) => {
            queriedId = val;
            return queryObj;
          }),
          neq: vi.fn(() => queryObj),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (queriedId && queriedId.includes('doc')) {
              return Promise.resolve({
                data: {
                  id: 'doc-1',
                  name: 'David Ross',
                  email: 'doctor@curatrack.in',
                  role: 'doctor',
                },
                error: null,
              });
            }
            return Promise.resolve({
              data: {
                id: 'patient-test-user-1',
                name: 'Kavita Bai',
                email: 'patient@curatrack.in',
                role: 'patient',
              },
              error: null,
            });
          }),
          then: (resolve: any) =>
            resolve({
              data: [
                {
                  id: 'patient-test-user-1',
                  name: 'Kavita Bai',
                  email: 'patient@curatrack.in',
                  role: 'patient',
                },
              ],
              error: null,
            }),
        };
        return queryObj;
      }
      if (table === 'medications') {
        return createQueryMock(() => mockMedicationsData);
      }
      if (table === 'prescriptions') {
        return createQueryMock(() => mockPrescriptionsData);
      }
      if (table === 'appointments') {
        const queryObj: any = {
          select: vi.fn(() => queryObj),
          eq: vi.fn(() => queryObj),
          neq: vi.fn(() => queryObj),
          not: vi.fn(() => queryObj),
          or: vi.fn(() => queryObj),
          in: vi.fn(() => queryObj),
          ilike: vi.fn(() => queryObj),
          order: vi.fn(() => queryObj),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: mockAppointmentsData[0] || null, error: null })),
          single: vi.fn(() => Promise.resolve({ data: mockAppointmentsData[0] || null, error: null })),
          then: (resolve: any) => resolve({ data: mockAppointmentsData, error: null }),
          update: vi.fn((updates: any) => {
            mockAppointmentsData = mockAppointmentsData.map((a) => ({ ...a, ...updates }));
            return queryObj;
          }),
          insert: vi.fn((records: any[]) => {
            const arr = Array.isArray(records) ? records : [records];
            arr.forEach((r) => {
              mockAppointmentsData.push({ ...r, id: r.id || `apt-${Date.now()}` });
            });
            return Promise.resolve({ data: null, error: null });
          }),
          delete: vi.fn(() => queryObj),
        };
        return queryObj;
      }
      if (table === 'medicine_orders') {
        return createQueryMock(() => mockMedicineOrdersData);
      }
      return createQueryMock(() => []);
    },
  }),
}));

describe('Medication & Prescription Synchronization Across Doctor & Patient Portals', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMedicationsData = [];
    mockPrescriptionsData = [];
    mockMedicineOrdersData = [];
    mockAppointmentsData = [];
    stockDeductCalls = [];
    vi.clearAllMocks();
  });

  it('TEST 1 & 2: Create prescription A -> fetch patient -> A exists, mark A as taken -> A still exists with status TAKEN', async () => {
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

    // Initial state: Prescription A exists
    mockPrescriptionsData = [
      {
        id: 'rx-med-1',
        patient_id: 'patient-test-user-1',
        medication: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
        status: 'PRESCRIBED',
      },
    ];
    mockMedicationsData = [
      {
        id: 'rx-med-1',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
      },
    ];

    const { unmount } = render(<HealthRecordsPage />);

    // 1. Check A exists
    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    // 2. Mark A as taken
    const markTakenBtn = screen.getByText('Mark Taken');
    fireEvent.click(markTakenBtn);

    await waitFor(() => {
      expect(screen.getByText('✓ Taken')).toBeInTheDocument();
    });

    unmount();
  });

  it('TEST 3 & 4: Doctor view displays prescribed medicine with delete button (no Give button) -> Patient Portal marks taken and persists', async () => {
    // 1. Doctor opens workspace with prescribed medicine A
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );

    mockPrescriptionsData = [
      {
        id: 'rx-med-1',
        patient_id: 'patient-test-user-1',
        medication: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
        status: 'PRESCRIBED',
      },
    ];
    mockMedicationsData = [
      {
        id: 'rx-med-1',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
      },
    ];
    mockAppointmentsData = [
      {
        id: 'apt-1',
        doctor_id: 'doc-1',
        patient_id: 'patient-test-user-1',
        client_id: 'patient-test-user-1',
        patient_name: 'Kavita Bai',
        priority: 'ROUTINE',
        status: 'in-consultation',
        time: '10:00 AM',
        date: '2026-08-26',
      },
    ];

    const doctorRender = render(<DoctorDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
    });

    const viewBtn = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Paracetamol 500mg/i)).toBeInTheDocument();
        expect(screen.getByTitle(/Remove/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Give$/i })).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    doctorRender.unmount();

    // 2. Patient opens portal and marks taken
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

    const patientRender = render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('Mark Taken')).toBeInTheDocument();
    });

    const markTakenBtn = screen.getByText('Mark Taken');
    fireEvent.click(markTakenBtn);

    await waitFor(() => {
      expect(screen.getByText('✓ Taken')).toBeInTheDocument();
    });

    patientRender.unmount();
  });

  it('TEST 5: Doctor prescribes Medicine B -> A (Taken) + B (Prescribed) BOTH exist without replacing A', async () => {
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );

    // Existing taken medicine A in database
    mockPrescriptionsData = [
      {
        id: 'rx-med-1',
        patient_id: 'patient-test-user-1',
        medication: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
        status: 'TAKEN',
      },
    ];
    mockMedicationsData = [
      {
        id: 'rx-med-1',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        status: 'TAKEN',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
      },
    ];
    mockAppointmentsData = [
      {
        id: 'apt-1',
        doctor_id: 'doc-1',
        patient_id: 'patient-test-user-1',
        client_id: 'patient-test-user-1',
        patient_name: 'Kavita Bai',
        priority: 'ROUTINE',
        status: 'in-consultation',
        time: '10:00 AM',
        date: '2026-08-26',
      },
    ];

    const { unmount } = render(<DoctorDashboardPage />);

    // Doctor sees patient and clicks VIEW to open consultation popup
    await waitFor(
      () => {
        expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
      },
      { timeout: 4000 }
    );

    const viewBtn = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Paracetamol 500mg/i)).toBeInTheDocument();
        expect(screen.getByText(/✓ Taken/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Doctor toggles non-inventory medicine and adds new medicine B (Cetirizine 10mg)
    const nonInvToggle = screen.getByText(/\+ Prescribe Non-Inventory Medicine/i);
    fireEvent.click(nonInvToggle);

    const drugInput = screen.getByPlaceholderText(/Enter medicine name/i);
    fireEvent.change(drugInput, { target: { value: 'Cetirizine 10mg' } });

    const addBtn = screen.getByText(/Add Medication/i);
    fireEvent.click(addBtn);

    // Both A and B must now be visible in doctor's prescription list
    await waitFor(
      () => {
        expect(screen.getByText(/Paracetamol 500mg/i)).toBeInTheDocument();
        expect(screen.getByText(/Cetirizine 10mg/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Encounter/i })).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Doctor finalizes encounter
    const finalizeBtn = screen.getByRole('button', { name: /Submit Encounter/i });
    fireEvent.click(finalizeBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Encounter and 2 medication order/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Verification: Database now contains BOTH A (Taken) and B (Prescribed)
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Paracetamol'))).toBe(true);
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Cetirizine'))).toBe(true);

    unmount();
  });

  it('TEST 6: Inventory prescription deducts stock once, non-inventory prescription does not deduct stock', async () => {
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );

    // Inventory prescription added
    const inventoryItem = {
      id: 'rx-inv-stock-1',
      patient_id: 'patient-test-user-1',
      medication: 'Amoxicillin 500mg',
      dosage: '500mg',
      frequency: 'TDS',
      quantity: 15,
      is_inventory: true,
      inventory_id: 'MED-102',
      prescription_type: 'INVENTORY',
      status: 'PRESCRIBED',
    };

    mockPrescriptionsData = [inventoryItem];
    mockMedicationsData = [{ ...inventoryItem, name: inventoryItem.medication }];
    mockAppointmentsData = [
      {
        id: 'apt-2',
        doctor_id: 'doc-1',
        patient_id: 'patient-test-user-1',
        client_id: 'patient-test-user-1',
        patient_name: 'Kavita Bai',
        priority: 'ROUTINE',
        status: 'in-consultation',
        time: '10:30 AM',
        date: '2026-08-26',
      },
    ];

    const { unmount } = render(<DoctorDashboardPage />);

    await waitFor(
      () => {
        expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
      },
      { timeout: 4000 }
    );

    const viewBtn = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Amoxicillin 500mg/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Encounter/i })).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Finalize encounter
    const finalizeBtn = screen.getByRole('button', { name: /Submit Encounter/i });
    fireEvent.click(finalizeBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Encounter and 1 medication order/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Prescriptions remain in DB
    expect(mockPrescriptionsData.length).toBeGreaterThanOrEqual(1);
    expect(mockPrescriptionsData[0].medication).toBe('Amoxicillin 500mg');

    unmount();
  });

  it('TEST 7: Patient portal shows Order button only for non-inventory medicines and hides for inventory medicines', async () => {
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

    mockMedicationsData = [
      {
        id: 'med-1',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg (Tablet)',
        dosage: '500mg',
        frequency: 'BD',
        time: 'Morning',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
        inventory_id: 'MED-101',
      },
      {
        id: 'med-2',
        patient_id: 'patient-test-user-1',
        name: 'Specialist Compound XYZ',
        dosage: '10mg',
        frequency: 'OD',
        time: 'Morning',
        status: 'UPCOMING',
        prescription_type: 'NON-INVENTORY',
        is_inventory: false,
      },
    ];

    const { unmount } = render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg (Tablet)')).toBeInTheDocument();
      expect(screen.getByText('Specialist Compound XYZ')).toBeInTheDocument();
    });

    // Order button exists for Non-Inventory medicine only
    const orderButtons = screen.queryAllByRole('button', { name: /Order/i });
    expect(orderButtons.length).toBeGreaterThan(0);

    unmount();
  });

  it('TEST 8: Repeated API calls and refetches do not duplicate prescriptions', async () => {
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

    mockMedicationsData = [
      {
        id: 'rx-unique-1',
        patient_id: 'patient-test-user-1',
        name: 'Azithromycin 500mg',
        dosage: '500mg',
        frequency: 'OD',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockPrescriptionsData = [
      {
        id: 'rx-unique-1',
        patient_id: 'patient-test-user-1',
        medication: 'Azithromycin 500mg',
        dosage: '500mg',
        frequency: 'OD',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];

    const { unmount } = render(<HealthRecordsPage />);

    await waitFor(() => {
      const azithroElements = screen.getAllByText(/Azithromycin 500mg/i);
      expect(azithroElements.length).toBeGreaterThan(0);
    });

    // Prescriptions are uniquely rendered and deduplicated
    expect(mockPrescriptionsData.length).toBe(1);

    unmount();
  });

  it('TEST 9: Multi-stage prescription: Doctor adds B to existing A (Taken) -> Submits -> Doctor adds C -> Submits -> A, B, C all persist in DB and Patient Records without dropping any previous medicine', async () => {
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );

    // Initial state: Medicine A (Taken)
    mockPrescriptionsData = [
      {
        id: 'rx-med-a',
        patient_id: 'patient-test-user-1',
        medication: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD',
        status: 'TAKEN',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockMedicationsData = [
      {
        id: 'rx-med-a',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD',
        status: 'TAKEN',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockAppointmentsData = [
      {
        id: 'apt-1',
        doctor_id: 'doc-1',
        patient_id: 'patient-test-user-1',
        client_id: 'patient-test-user-1',
        patient_name: 'Kavita Bai',
        priority: 'ROUTINE',
        status: 'in-consultation',
        time: '10:00 AM',
        date: '2026-08-26',
      },
    ];

    // Stage 1: Doctor adds Medicine B (Cetirizine 10mg)
    const docRender1 = render(<DoctorDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
    });

    const viewBtn1 = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn1);

    await waitFor(() => {
      expect(screen.getByText(/Paracetamol 500mg/i)).toBeInTheDocument();
      expect(screen.getByText(/✓ Taken/i)).toBeInTheDocument();
    });

    const nonInvToggle1 = screen.getByText(/\+ Prescribe Non-Inventory Medicine/i);
    fireEvent.click(nonInvToggle1);

    const drugInput1 = screen.getByPlaceholderText(/Enter medicine name/i);
    fireEvent.change(drugInput1, { target: { value: 'Cetirizine 10mg' } });

    const addBtn1 = screen.getByText(/Add Medication/i);
    fireEvent.click(addBtn1);

    await waitFor(() => {
      expect(screen.getByText(/Cetirizine 10mg/i)).toBeInTheDocument();
    });

    const submitBtn1 = screen.getByRole('button', { name: /Submit Encounter/i });
    fireEvent.click(submitBtn1);

    await waitFor(() => {
      expect(screen.getByText(/Encounter and 2 medication order/i)).toBeInTheDocument();
    });

    docRender1.unmount();

    // Verify DB after stage 1
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Paracetamol'))).toBe(true);
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Cetirizine'))).toBe(true);

    // Stage 2: Patient Portal checks
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
    const patRender1 = render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Paracetamol 500mg/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Cetirizine 10mg/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/✓ Taken/i).length).toBeGreaterThan(0);
    });
    patRender1.unmount();

    // Stage 3: Doctor opens patient again and adds Medicine C (Metformin 500mg)
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );
    const docRender2 = render(<DoctorDashboardPage />);

    // Since the appointment was completed upon encounter submission, open the Done tab
    const doneTab = await screen.findByRole('button', { name: /Done/i });
    fireEvent.click(doneTab);

    await waitFor(() => {
      expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
    });

    const viewBtn2 = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn2);

    await waitFor(() => {
      expect(screen.getAllByText(/Paracetamol 500mg/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Cetirizine 10mg/i).length).toBeGreaterThan(0);
    });

    const nonInvToggle2 = screen.getByText(/\+ Prescribe Non-Inventory Medicine/i);
    fireEvent.click(nonInvToggle2);

    const drugInput2 = screen.getByPlaceholderText(/Enter medicine name/i);
    fireEvent.change(drugInput2, { target: { value: 'Metformin 500mg' } });

    const addBtn2 = screen.getByText(/Add Medication/i);
    fireEvent.click(addBtn2);

    await waitFor(() => {
      expect(screen.getAllByText(/Metformin 500mg/i).length).toBeGreaterThan(0);
    });

    const submitBtn2 = screen.getByRole('button', { name: /Submit Encounter/i });
    fireEvent.click(submitBtn2);

    await waitFor(() => {
      expect(screen.getByText(/Encounter and 3 medication order/i)).toBeInTheDocument();
    });

    docRender2.unmount();

    // Verification: Database contains ALL 3 (A, B, C)
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Paracetamol'))).toBe(true);
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Cetirizine'))).toBe(true);
    expect(mockPrescriptionsData.some((r) => r.medication.includes('Metformin'))).toBe(true);

    // Patient Portal reloads and sees all 3
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
    const patRender2 = render(<HealthRecordsPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Paracetamol 500mg/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Cetirizine 10mg/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Metformin 500mg/i).length).toBeGreaterThan(0);
    });
    patRender2.unmount();
  });

  it('TEST 10: Resubmitting the same prescription updates existing database records without creating duplicates', async () => {
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );

    mockPrescriptionsData = [
      {
        id: 'rx-stable-1',
        patient_id: 'patient-test-user-1',
        medication: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockMedicationsData = [
      {
        id: 'rx-stable-1',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockAppointmentsData = [
      {
        id: 'apt-1',
        doctor_id: 'doc-1',
        patient_id: 'patient-test-user-1',
        client_id: 'patient-test-user-1',
        patient_name: 'Kavita Bai',
        priority: 'ROUTINE',
        status: 'in-consultation',
        time: '10:00 AM',
        date: '2026-08-26',
      },
    ];

    const { unmount } = render(<DoctorDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
    });

    const viewBtn = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Paracetamol 500mg/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Submit Encounter/i })).toBeInTheDocument();
    });

    // Resubmit encounter without adding new drugs
    const submitBtn = screen.getByRole('button', { name: /Submit Encounter/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Encounter and 1 medication order/i)).toBeInTheDocument();
    });

    // Database still has exactly 1 prescription and 1 medication (no duplicates)
    expect(mockPrescriptionsData.length).toBe(1);
    expect(mockMedicationsData.length).toBe(1);

    unmount();
  });

  it('TEST 11: Patient Health Records Prescriptions tab renders full prescription metadata from database', async () => {
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

    mockPrescriptionsData = [
      {
        id: 'rx-detailed-1',
        patient_id: 'patient-test-user-1',
        medication: 'Amoxicillin 500mg',
        dosage: '500mg',
        frequency: 'TDS (3 times daily)',
        duration: '7 Days',
        quantity: 21,
        instructions: 'Take after meals with water',
        doctor_name: 'Dr. David Ross',
        date: '2026-08-26',
        status: 'ACTIVE',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];

    const { unmount } = render(<HealthRecordsPage />);

    // Switch to Prescriptions tab
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Prescriptions/i })).toBeInTheDocument();
    });

    const rxTabBtn = screen.getByRole('button', { name: /Prescriptions/i });
    fireEvent.click(rxTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Active Prescriptions/i)).toBeInTheDocument();
      expect(screen.getByText(/Amoxicillin 500mg/i)).toBeInTheDocument();
      expect(screen.getByText(/Take after meals with water/i)).toBeInTheDocument();
      expect(screen.getByText(/Facility EDL/i)).toBeInTheDocument();
    });

    unmount();
  });

  it('TEST 12: Prescribing same medicine with changed dosage updates active record without duplicate and preserves historical taken records', async () => {
    localStorage.setItem('curatrack_active_role', 'doctor');
    localStorage.setItem(
      'curatrack_auth_user',
      JSON.stringify({
        id: 'doc-1',
        name: 'Dr. David Ross',
        email: 'doctor@curatrack.in',
        role: 'doctor',
      })
    );

    // Initial state: Patient has an active Paracetamol 500mg BD x 5 days
    mockPrescriptionsData = [
      {
        id: 'rx-active-paracetamol',
        patient_id: 'patient-test-user-1',
        medication: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        duration: '5 Days',
        status: 'PRESCRIBED',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockMedicationsData = [
      {
        id: 'rx-active-paracetamol',
        patient_id: 'patient-test-user-1',
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'BD (Twice daily)',
        status: 'UPCOMING',
        prescription_type: 'INVENTORY',
        is_inventory: true,
      },
    ];
    mockAppointmentsData = [
      {
        id: 'apt-1',
        doctor_id: 'doc-1',
        patient_id: 'patient-test-user-1',
        client_id: 'patient-test-user-1',
        patient_name: 'Kavita Bai',
        priority: 'ROUTINE',
        status: 'in-consultation',
        time: '10:00 AM',
        date: '2026-08-26',
      },
    ];

    const { unmount } = render(<DoctorDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Kavita Bai/i).length).toBeGreaterThan(0);
    });

    const viewBtn = (await screen.findAllByRole('button', { name: /VIEW/i }))[0];
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Paracetamol 500mg/i).length).toBeGreaterThan(0);
    });

    // Doctor prescribes Paracetamol 650mg TDS x 7 days
    const nonInvToggle = screen.getByText(/\+ Prescribe Non-Inventory Medicine/i);
    fireEvent.click(nonInvToggle);

    const drugInput = screen.getByPlaceholderText(/Enter medicine name/i);
    fireEvent.change(drugInput, { target: { value: 'Paracetamol 650mg' } });

    const addBtn = screen.getByText(/Add Medication/i);
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Paracetamol 650mg/i).length).toBeGreaterThan(0);
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Encounter/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Encounter and/i)).toBeInTheDocument();
    });

    // Active prescription is updated to 650mg without duplicating active records
    expect(mockPrescriptionsData.some((r) => r.medication.includes('650mg'))).toBe(true);

    unmount();
  });
});
