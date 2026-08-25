'use client';

import React, { useState, useEffect } from 'react';
import { SupportedLanguage, getStoredLanguage, setStoredLanguage } from '@/lib/i18n';

export function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');

  useEffect(() => {
    setCurrentLang(getStoredLanguage());

    const handleLangChange = () => {
      setCurrentLang(getStoredLanguage());
    };

    window.addEventListener('curatrack_language_change', handleLangChange);
    return () => {
      window.removeEventListener('curatrack_language_change', handleLangChange);
    };
  }, []);

  const handleSelect = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    setStoredLanguage(lang);
  };

  return (
    <div className="inline-flex items-center p-1 bg-surface-container rounded-xl border border-surface-container-high text-xs font-bold shadow-sm">
      <button
        onClick={() => handleSelect('en')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          currentLang === 'en'
            ? 'bg-primary text-white shadow-sm'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        title="English"
      >
        English
      </button>
      <button
        onClick={() => handleSelect('hi')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          currentLang === 'hi'
            ? 'bg-primary text-white shadow-sm'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        title="Hindi / हिन्दी"
      >
        हिन्दी
      </button>
      <button
        onClick={() => handleSelect('mr')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          currentLang === 'mr'
            ? 'bg-primary text-white shadow-sm'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        title="Marathi / मराठी"
      >
        मराठी
      </button>
    </div>
  );
}
