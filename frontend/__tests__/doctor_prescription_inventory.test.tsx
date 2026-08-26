import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MedicineSearchDropdown, FacilityMedicineItem } from '../components/MedicineSearchDropdown';

// Mock API fetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (url: string) => {
    if (url.includes('search=para')) {
      return {
        medicines: [
          {
            id: 'MED-101',
            name: 'Paracetamol 500mg (Tablet)',
            category: 'Analgesics / Antipyretics',
            stock_units: 750,
            status: 'ADEQUATE',
            unit: 'tablets',
            storage_location: 'Pharmacy Bay A2'
          }
        ]
      };
    }
    return { medicines: [] };
  })
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, defaultVal: string) => defaultVal,
    locale: 'en',
    setLocale: vi.fn(),
  }),
}));

describe('Doctor Prescription → Facility Inventory Search Dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches facility inventory when doctor types a query', async () => {
    const onSelectInventory = vi.fn();
    const onSelectNonInventory = vi.fn();

    render(
      <MedicineSearchDropdown
        onSelectInventoryMedicine={onSelectInventory}
        onSelectNonInventoryMedicine={onSelectNonInventory}
      />
    );

    const input = screen.getByPlaceholderText(/Search facility medicine inventory/i);
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'para' } });

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg (Tablet)')).toBeDefined();
    });

    expect(screen.getByText('MED-101')).toBeDefined();
    expect(screen.getByText(/750/)).toBeDefined();

    // Click to select
    const medCard = screen.getByText('Paracetamol 500mg (Tablet)');
    fireEvent.click(medCard);

    expect(onSelectInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'MED-101',
        name: 'Paracetamol 500mg (Tablet)'
      })
    );
  });

  it('provides a fallback option to prescribe non-inventory medicines', async () => {
    const onSelectInventory = vi.fn();
    const onSelectNonInventory = vi.fn();

    render(
      <MedicineSearchDropdown
        onSelectInventoryMedicine={onSelectInventory}
        onSelectNonInventoryMedicine={onSelectNonInventory}
      />
    );

    const input = screen.getByPlaceholderText(/Search facility medicine inventory/i);
    fireEvent.change(input, { target: { value: 'unlisted-drug-xyz' } });

    await waitFor(() => {
      expect(screen.getByText(/Medicine not available in facility inventory/i)).toBeDefined();
    });

    const nonInvBtn = screen.getByText(/\+ Prescribe Non-Inventory Medicine/i);
    expect(nonInvBtn).toBeDefined();
    fireEvent.click(nonInvBtn);

    expect(onSelectNonInventory).toHaveBeenCalledWith('unlisted-drug-xyz');
  });
});
