'use client';

import React from 'react';
import { useI18n, SupportedLanguage } from '@/lib/i18n';

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="inline-flex items-center p-1 bg-surface-container rounded-xl border border-surface-container-high text-xs font-bold shadow-xs">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-primary text-white shadow-sm font-black'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        title="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'hi'
            ? 'bg-primary text-white shadow-sm font-black'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        title="Hindi / हिन्दी"
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => setLanguage('mr')}
        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'mr'
            ? 'bg-primary text-white shadow-sm font-black'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        title="Marathi / मराठी"
      >
        मराठी
      </button>
    </div>
  );
}
