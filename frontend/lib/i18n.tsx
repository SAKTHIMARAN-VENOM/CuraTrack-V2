'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { NextIntlClientProvider, useTranslations as useNextIntlTranslations } from 'next-intl';
import enMessages from '@/messages/en.json';
import hiMessages from '@/messages/hi.json';
import mrMessages from '@/messages/mr.json';
import taMessages from '@/messages/ta.json';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta';

export interface I18nContextType {
  language: SupportedLanguage;
  locale: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  setLocale: (lang: SupportedLanguage) => void;
  t: (key: string, paramsOrFallback?: Record<string, any> | string, maybeFallback?: string) => string;
}

export const DICTIONARIES: Record<SupportedLanguage, Record<string, any>> = {
  en: enMessages,
  hi: hiMessages,
  mr: mrMessages,
  ta: taMessages
};

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  locale: 'en',
  setLanguage: () => {},
  setLocale: () => {},
  t: (key: string, paramsOrFallback?: any, maybeFallback?: string) => {
    if (typeof paramsOrFallback === 'string') return paramsOrFallback;
    if (maybeFallback) return maybeFallback;
    return key;
  },
});

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, any>): string {
  if (!template || !params) return template || '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('curatrack_language') as SupportedLanguage;
      if (saved === 'hi' || saved === 'mr' || saved === 'ta' || saved === 'en') {
        setLanguageState(saved);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = saved;
        }
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'curatrack_language' && e.newValue) {
        const val = e.newValue as SupportedLanguage;
        if (val === 'hi' || val === 'mr' || val === 'ta' || val === 'en') {
          setLanguageState(val);
          if (typeof document !== 'undefined') {
            document.documentElement.lang = val;
          }
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('curatrack_language', lang);
      document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
      window.dispatchEvent(new Event('curatrack_language_change'));
    } catch {}
  };

  const t = useMemo(() => {
    return (
      key: string,
      paramsOrFallback?: Record<string, any> | string,
      maybeFallback?: string
    ): string => {
      if (!key) return '';

      let params: Record<string, any> | undefined;
      let fallback: string | undefined;

      if (typeof paramsOrFallback === 'string') {
        fallback = paramsOrFallback;
      } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        params = paramsOrFallback;
        fallback = maybeFallback;
      }

      // 1. Try current language dictionary
      let rawText = getNestedValue(DICTIONARIES[language], key);

      // 2. Fallback to English dictionary
      if (!rawText && language !== 'en') {
        rawText = getNestedValue(DICTIONARIES.en, key);
      }

      // 3. Fallback to provided fallback string or last segment
      if (!rawText) {
        if (fallback) {
          return interpolate(fallback, params);
        }
        const tokens = key.split('.');
        return interpolate(tokens[tokens.length - 1] || key, params);
      }

      return interpolate(rawText, params);
    };
  }, [language]);

  const value = useMemo(() => ({
    language,
    locale: language,
    setLanguage,
    setLocale: setLanguage,
    t
  }), [language, t]);

  return (
    <I18nContext.Provider value={value}>
      <NextIntlClientProvider locale={language} messages={DICTIONARIES[language]}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const useTranslation = useI18n;

export function useTranslations(namespace?: string) {
  const { t } = useI18n();
  return useMemo(() => {
    return (key: string, values?: Record<string, any>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return t(fullKey, values);
    };
  }, [namespace, t]);
}
