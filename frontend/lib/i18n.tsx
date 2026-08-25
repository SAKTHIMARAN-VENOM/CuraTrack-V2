'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import enMessages from '@/messages/en.json';
import hiMessages from '@/messages/hi.json';
import mrMessages from '@/messages/mr.json';
import taMessages from '@/messages/ta.json';
import { API_BASE } from './api';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta';

export interface I18nContextType {
  language: SupportedLanguage;
  locale: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  setLocale: (lang: SupportedLanguage) => void;
  t: (key: string, paramsOrFallback?: Record<string, any> | string, maybeFallback?: string) => string;
  translate: (text: string, targetLang?: SupportedLanguage) => Promise<string>;
  translateBatch: (texts: string[], targetLang?: SupportedLanguage) => Promise<string[]>;
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
  translate: async (text: string) => text,
  translateBatch: async (texts: string[]) => texts
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

// In-memory client-side translation cache across requests
const clientTranslationCache = new Map<string, string>();

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const pendingBatchRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from localStorage or cookie
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

  /**
   * Batch translates strings via FastAPI backend (powered by Sarvam AI).
   */
  const translateBatch = useCallback(async (texts: string[], targetLang?: SupportedLanguage): Promise<string[]> => {
    const target = targetLang || language;
    if (target === 'en' || !texts || texts.length === 0) {
      return texts;
    }

    const results: string[] = new Array(texts.length);
    const toFetchIndices: number[] = [];
    const toFetchTexts: string[] = [];

    // Check client-side memory cache first
    texts.forEach((txt, idx) => {
      if (!txt || !txt.trim()) {
        results[idx] = txt;
        return;
      }
      const cacheKey = `en:${target}:${txt.trim()}`;
      if (clientTranslationCache.has(cacheKey)) {
        results[idx] = clientTranslationCache.get(cacheKey)!;
      } else {
        // Also check if it exists in pre-warmed dictionary
        const dictVal = getNestedValue(DICTIONARIES[target], txt.trim());
        if (dictVal) {
          clientTranslationCache.set(cacheKey, dictVal);
          results[idx] = dictVal;
        } else {
          results[idx] = txt; // Temporary fallback
          toFetchIndices.push(idx);
          toFetchTexts.push(txt.trim());
        }
      }
    });

    if (toFetchTexts.length === 0) {
      return results;
    }

    try {
      const res = await fetch(`${API_BASE}/api/translation/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: toFetchTexts,
          source_language: 'en',
          target_language: target
        })
      });

      if (res.ok) {
        const data = await res.json();
        const translations: string[] = data.translations || [];
        translations.forEach((trans, i) => {
          const originalIdx = toFetchIndices[i];
          const originalText = toFetchTexts[i];
          const cacheKey = `en:${target}:${originalText}`;
          clientTranslationCache.set(cacheKey, trans);
          results[originalIdx] = trans;
        });
      }
    } catch (err) {
      console.warn('Sarvam translation API fetch error:', err);
    }

    return results;
  }, [language]);

  /**
   * Single string translation helper via Sarvam AI backend.
   */
  const translate = useCallback(async (text: string, targetLang?: SupportedLanguage): Promise<string> => {
    if (!text) return text;
    const batch = await translateBatch([text], targetLang);
    return batch[0] || text;
  }, [translateBatch]);

  /**
   * Synchronous translation method for instant UI rendering with fallback and interpolation.
   */
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

      // Check client translation cache (e.g. from Sarvam AI)
      const cacheKey = `en:${language}:${key.trim()}`;
      if (clientTranslationCache.has(cacheKey)) {
        return interpolate(clientTranslationCache.get(cacheKey)!, params);
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
    t,
    translate,
    translateBatch
  }), [language, t, translate, translateBatch]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const useLanguage = useI18n;
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
