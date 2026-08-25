'use client';

import React from 'react';
import { useI18n, useLanguage, SupportedLanguage } from '@/lib/i18n';

const LANGUAGES: { code: SupportedLanguage; label: string; nativeName: string }[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'हिन्दी', nativeName: 'Hindi' },
  { code: 'mr', label: 'मराठी', nativeName: 'Marathi' },
  { code: 'ta', label: 'தமிழ்', nativeName: 'Tamil' }
];

export function LanguageToggle() {
  const i18n = typeof useI18n === 'function' ? useI18n() : (typeof useLanguage === 'function' ? useLanguage() : { language: 'en', setLanguage: () => {} });
  const language = i18n?.language || 'en';
  const setLanguage = i18n?.setLanguage || (() => {});

  return (
    <div className="inline-flex items-center p-1 bg-surface-container rounded-2xl border border-surface-container-high text-xs font-bold shadow-xs">
      <span className="material-symbols-outlined text-tertiary text-base ml-1.5 mr-1" aria-hidden="true">
        translate
      </span>
      <div className="flex items-center gap-0.5">
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer text-xs ${
                isActive
                  ? 'bg-primary text-white shadow-sm font-black'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/50'
              }`}
              title={lang.nativeName}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageToggle;
