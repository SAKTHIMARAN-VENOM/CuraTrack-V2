'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export interface FacilityMedicineItem {
  id: string; // e.g. "MED-101"
  name: string; // e.g. "Paracetamol 500mg (Tablet)"
  category: string;
  stock_units: number;
  monthly_consumption?: number;
  days_of_supply?: number;
  status: 'ADEQUATE' | 'LOW_STOCK' | 'CRITICAL_STOCKOUT_RISK';
  unit: string;
  storage_location?: string;
  last_restocked?: string;
}

interface MedicineSearchDropdownProps {
  onSelectInventoryMedicine: (medicine: FacilityMedicineItem) => void;
  onSelectNonInventoryMedicine: (medicineName: string) => void;
  selectedInventoryId?: string;
  selectedName?: string;
  isNonInventory?: boolean;
}

export function MedicineSearchDropdown({
  onSelectInventoryMedicine,
  onSelectNonInventoryMedicine,
  selectedInventoryId,
  selectedName,
  isNonInventory = false
}: MedicineSearchDropdownProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState<string>(selectedName || '');
  const [results, setResults] = useState<FacilityMedicineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with prop changes
  useEffect(() => {
    if (selectedName !== undefined) {
      setSearchTerm(selectedName);
    }
  }, [selectedName]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (isNonInventory) return;
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/facility/medicines?search=${encodeURIComponent(trimmed)}`);
        if (res?.medicines) {
          setResults(res.medicines);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.warn('Facility medicine search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, isNonInventory]);

  const handleSelectInventory = (med: FacilityMedicineItem) => {
    setSearchTerm(med.name);
    setIsOpen(false);
    onSelectInventoryMedicine(med);
  };

  const handleStartNonInventory = () => {
    setIsOpen(false);
    onSelectNonInventoryMedicine(searchTerm.trim());
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">
          {loading ? 'sync' : 'search'}
        </span>
        <input
          suppressHydrationWarning
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (searchTerm.trim() && !isNonInventory) {
              setIsOpen(true);
            }
          }}
          placeholder={t('doctor.searchMedicinePlaceholder', 'Search facility medicine inventory (e.g. Paracetamol)...')}
          className={`w-full pl-9 pr-8 py-2 bg-white rounded-xl text-xs font-bold border transition-all outline-none ${
            isNonInventory
              ? 'border-purple-300 focus:border-purple-500 bg-purple-50/20 text-purple-950'
              : 'border-surface-container-high focus:border-primary text-on-surface'
          }`}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-on-surface text-xs"
            title={t('common.clear', 'Clear')}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && !isNonInventory && searchTerm.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-surface-container-high rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-surface-container-high animate-in fade-in slide-in-from-top-1 duration-150">
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-tertiary flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base animate-spin text-primary">sync</span>
              <span>{t('doctor.searchingInventory', 'Searching facility inventory...')}</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="px-3 py-1.5 bg-surface-container-low/70 text-[10px] font-black uppercase tracking-wider text-tertiary">
                {t('doctor.facilityInventoryResults', 'Facility Formulary Stock')}
              </div>
              {results.map((med) => {
                const isSelected = selectedInventoryId === med.id;
                const statusColor =
                  med.status === 'ADEQUATE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : med.status === 'LOW_STOCK'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-800 border-red-200';

                return (
                  <div
                    key={med.id}
                    onClick={() => handleSelectInventory(med)}
                    className={`p-3 hover:bg-teal-50/50 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/80 border-l-4 border-primary' : ''
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface truncate block">
                          {med.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-tertiary shrink-0">
                          {med.id}
                        </span>
                      </div>
                      <span className="text-[10px] text-tertiary block truncate">
                        {med.category} • {med.storage_location || 'Pharmacy Bay'}
                      </span>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-on-surface">
                          {med.stock_units.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-tertiary">{med.unit}</span>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {med.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center space-y-2">
              <span className="material-symbols-outlined text-2xl text-amber-500 block">inventory_2</span>
              <p className="text-xs font-bold text-on-surface">
                {t('doctor.medicineNotFound', 'Medicine not available in facility inventory')}
              </p>
              <p className="text-[11px] text-tertiary">
                {t('doctor.noStockDetail', 'No matching Essential Drug List (EDL) item found for this search.')}
              </p>
            </div>
          )}

          {/* Non-Inventory Fallback CTA */}
          <div className="p-2.5 bg-surface-container-low/50 border-t border-surface-container flex items-center justify-between gap-2">
            <span className="text-[11px] text-tertiary font-medium">
              {t('doctor.notInInventoryPrompt', 'Need an external or non-EDL medicine?')}
            </span>
            <button
              type="button"
              onClick={handleStartNonInventory}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>{t('doctor.prescribeNonInventory', '+ Prescribe Non-Inventory Medicine')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicineSearchDropdown;
