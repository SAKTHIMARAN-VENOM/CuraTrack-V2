'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import enMessages from '@/messages/en.json';
import { API_BASE } from './api';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta';

export const DICTIONARIES: Record<SupportedLanguage, Record<string, any>> = {
  en: enMessages,
  hi: {},
  mr: {},
  ta: {}
};

export interface I18nContextType {
  language: SupportedLanguage;
  locale: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  setLocale: (lang: SupportedLanguage) => void;
  t: (keyOrText: string, paramsOrFallback?: Record<string, any> | string, maybeFallback?: string) => string;
  translate: (text: string, targetLang?: SupportedLanguage) => Promise<string>;
  translateBatch: (texts: string[], targetLang?: SupportedLanguage) => Promise<string[]>;
  isTranslating: boolean;
  translationError: string | null;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  locale: 'en',
  setLanguage: () => {},
  setLocale: () => {},
  t: (keyOrText: string, paramsOrFallback?: any, maybeFallback?: string) => {
    if (typeof paramsOrFallback === 'string') return paramsOrFallback;
    if (maybeFallback) return maybeFallback;
    return keyOrText;
  },
  translate: async (text: string) => text,
  translateBatch: async (texts: string[]) => texts,
  isTranslating: false,
  translationError: null
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

// Global in-memory cache on the client: "en:tgt:text" -> "translatedText"
const clientTranslationCache = new Map<string, string>();

/**
 * Extracts all leaf string values from the English base message dictionary.
 */
function extractEnglishStrings(obj: any, prefix = ''): { key: string; text: string }[] {
  let list: { key: string; text: string }[] = [];
  if (!obj || typeof obj !== 'object') return list;
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'string' && val.trim()) {
      list.push({ key: fullKey, text: val.trim() });
    } else if (typeof val === 'object' && val !== null) {
      list = list.concat(extractEnglishStrings(val, fullKey));
    }
  }
  return list;
}

const ALL_EN_STRINGS = extractEnglishStrings(enMessages);
const EN_TEXT_TO_KEY_MAP = new Map<string, string>();
ALL_EN_STRINGS.forEach(item => {
  EN_TEXT_TO_KEY_MAP.set(item.text, item.key);
  EN_TEXT_TO_KEY_MAP.set(item.key, item.text);
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [cacheVersion, setCacheVersion] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const pendingQueueRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeLangRef = useRef<SupportedLanguage>('en');

  activeLangRef.current = language;

  /**
   * Request batch translation from the FastAPI backend powered by Sarvam AI.
   */
  const translateBatch = useCallback(
    async (texts: string[], targetLang?: SupportedLanguage): Promise<string[]> => {
      const target = targetLang || activeLangRef.current;
      if (target === 'en' || !texts || texts.length === 0) {
        return texts;
      }

      const results: string[] = new Array(texts.length);
      const toFetchIndices: number[] = [];
      const toFetchTexts: string[] = [];

      texts.forEach((txt, idx) => {
        if (!txt || !txt.trim()) {
          results[idx] = txt || '';
          return;
        }
        const clean = txt.trim();
        const cacheKey = `en:${target}:${clean}`;
        if (clientTranslationCache.has(cacheKey)) {
          results[idx] = clientTranslationCache.get(cacheKey)!;
        } else {
          results[idx] = clean;
          toFetchIndices.push(idx);
          toFetchTexts.push(clean);
        }
      });

      if (toFetchTexts.length === 0) {
        return results;
      }

      try {
        setIsTranslating(true);
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
          const transMap: Record<string, string> = data.translations_map || {};

          // Update client cache with translations
          translations.forEach((trans, i) => {
            const originalIdx = toFetchIndices[i];
            const originalText = toFetchTexts[i];
            if (trans && trans.trim()) {
              clientTranslationCache.set(`en:${target}:${originalText}`, trans);
              const mappedKey = EN_TEXT_TO_KEY_MAP.get(originalText);
              if (mappedKey) {
                clientTranslationCache.set(`en:${target}:${mappedKey}`, trans);
              }
              results[originalIdx] = trans;
            }
          });

          // Also map any entries returned in translations_map
          Object.entries(transMap).forEach(([orig, trans]) => {
            if (orig && trans) {
              clientTranslationCache.set(`en:${target}:${orig.trim()}`, trans);
              const mappedKey = EN_TEXT_TO_KEY_MAP.get(orig.trim());
              if (mappedKey) {
                clientTranslationCache.set(`en:${target}:${mappedKey}`, trans);
              }
            }
          });

          setTranslationError(data.error || null);
          setCacheVersion(v => v + 1);
        } else {
          const errData = await res.json().catch(() => ({}));
          setTranslationError(errData.detail || 'Translation service error');
        }
      } catch (err: any) {
        console.warn('Sarvam translation backend fetch error:', err);
        setTranslationError(err.message || 'Network error fetching translation');
      } finally {
        setIsTranslating(false);
      }

      return results;
    },
    []
  );

  /**
   * Flushes the pending debounced translation queue to the backend.
   */
  const flushPendingQueue = useCallback(() => {
    const target = activeLangRef.current;
    if (target === 'en') {
      pendingQueueRef.current.clear();
      return;
    }

    const pending = Array.from(pendingQueueRef.current).filter(txt => {
      const cacheKey = `en:${target}:${txt.trim()}`;
      return !clientTranslationCache.has(cacheKey);
    });

    pendingQueueRef.current.clear();

    if (pending.length > 0) {
      translateBatch(pending, target);
    }
  }, [translateBatch]);

  /**
   * Pre-fetches the core UI strings when switching to a non-English language.
   */
  const fetchPageTranslations = useCallback(
    async (targetLang: SupportedLanguage) => {
      if (targetLang === 'en') return;

      const uncached = ALL_EN_STRINGS.map(item => item.text).filter(text => {
        const cacheKey = `en:${targetLang}:${text}`;
        return !clientTranslationCache.has(cacheKey);
      });

      if (uncached.length === 0) return;

      // Translate core navigation and visible UI strings in chunks of 25 concurrently
      const chunkSize = 25;
      for (let i = 0; i < uncached.length; i += chunkSize) {
        const chunk = uncached.slice(i, i + chunkSize);
        await translateBatch(chunk, targetLang);
      }
    },
    [translateBatch]
  );

  /**
   * Changes active language and triggers translation for the full page.
   */
  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setLanguageState(lang);
      activeLangRef.current = lang;
      try {
        localStorage.setItem('curatrack_language', lang);
        document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
        if (typeof document !== 'undefined') {
          document.documentElement.lang = lang;
        }
        window.dispatchEvent(new Event('curatrack_language_change'));
      } catch {}

      if (lang !== 'en') {
        fetchPageTranslations(lang);
      }
    },
    [fetchPageTranslations]
  );

  // Initialize from localStorage or cookie on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('curatrack_language') as SupportedLanguage;
      if (saved === 'hi' || saved === 'mr' || saved === 'ta') {
        setLanguageState(saved);
        activeLangRef.current = saved;
        if (typeof document !== 'undefined') {
          document.documentElement.lang = saved;
        }
        fetchPageTranslations(saved);
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'curatrack_language' && e.newValue) {
        const val = e.newValue as SupportedLanguage;
        if (val === 'hi' || val === 'mr' || val === 'ta' || val === 'en') {
          setLanguageState(val);
          activeLangRef.current = val;
          if (typeof document !== 'undefined') {
            document.documentElement.lang = val;
          }
          if (val !== 'en') {
            fetchPageTranslations(val);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchPageTranslations]);

  /**
   * Translates a single text chunk via the Sarvam backend.
   */
  const translate = useCallback(
    async (text: string, targetLang?: SupportedLanguage): Promise<string> => {
      if (!text) return text;
      const batch = await translateBatch([text], targetLang);
      return batch[0] || text;
    },
    [translateBatch]
  );

  /**
   * Synchronous translation function for React components.
   * Looks up in the live client cache; if missing, registers into the auto-batch queue.
   */
  const t = useMemo(() => {
    return (
      keyOrText: string,
      paramsOrFallback?: Record<string, any> | string,
      maybeFallback?: string
    ): string => {
      if (!keyOrText) return '';

      let params: Record<string, any> | undefined;
      let fallback: string | undefined;

      if (typeof paramsOrFallback === 'string') {
        fallback = paramsOrFallback;
      } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        params = paramsOrFallback;
        fallback = maybeFallback;
      }

      // 1. Resolve base English text (from dictionary or fallback or raw key)
      let englishText = getNestedValue(enMessages, keyOrText) || fallback || keyOrText;

      // If language is English, return the English text directly
      if (language === 'en') {
        return interpolate(englishText, params);
      }

      // 2. Check client translation cache (populated by Sarvam AI)
      const cleanEnglish = englishText.trim();
      const textCacheKey = `en:${language}:${cleanEnglish}`;
      if (clientTranslationCache.has(textCacheKey)) {
        return interpolate(clientTranslationCache.get(textCacheKey)!, params);
      }

      const keyCacheKey = `en:${language}:${keyOrText.trim()}`;
      if (clientTranslationCache.has(keyCacheKey)) {
        return interpolate(clientTranslationCache.get(keyCacheKey)!, params);
      }

      // 3. Register uncached string into debounce queue for Sarvam AI backend fetch
      if (cleanEnglish && !pendingQueueRef.current.has(cleanEnglish)) {
        pendingQueueRef.current.add(cleanEnglish);
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(flushPendingQueue, 50);
      }

      // Temporary return before translation finishes
      return interpolate(englishText, params);
    };
  }, [language, cacheVersion, flushPendingQueue]);

  const value = useMemo(
    () => ({
      language,
      locale: language,
      setLanguage,
      setLocale: setLanguage,
      t,
      translate,
      translateBatch,
      isTranslating,
      translationError
    }),
    [language, setLanguage, t, translate, translateBatch, isTranslating, translationError]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
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
