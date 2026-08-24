'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
}

interface AnimatedSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: string;
  className?: string;
  minWidth?: string;
}

export default function AnimatedSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  icon,
  className = '',
  minWidth = 'min-w-[180px]',
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${minWidth} ${className}`}>
      {/* Hidden native select for accessibility and automated form testing */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-surface-container-low hover:bg-surface-container/80 text-on-surface text-xs font-bold rounded-2xl border transition-all duration-200 shadow-xs cursor-pointer ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-white'
            : 'border-surface-container-high hover:border-primary/40'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {icon && (
            <span className="material-symbols-outlined text-primary text-base shrink-0">
              {icon}
            </span>
          )}
          {selectedOption?.icon && !icon && (
            <span className="material-symbols-outlined text-primary text-base shrink-0">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>

        <span
          className={`material-symbols-outlined text-tertiary text-lg shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : 'rotate-0'
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Floating Animated Dropdown Menu */}
      <div
        className={`absolute left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-surface-container-high shadow-2xl p-1.5 transition-all duration-200 origin-top overflow-hidden ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface hover:bg-surface-container-low hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && (
                    <span className="material-symbols-outlined text-sm shrink-0">
                      {opt.icon}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.badge && (
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                        opt.badgeColor || 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <span className="material-symbols-outlined text-primary text-sm font-bold animate-in zoom-in-50">
                      check
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
