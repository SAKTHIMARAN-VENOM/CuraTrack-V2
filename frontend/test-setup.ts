import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Next.js navigation router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock i18n
vi.mock('@/lib/i18n', () => {
  const useI18n = () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string, defaultVal?: string | Record<string, any>, maybeDefault?: string) => {
      if (typeof defaultVal === 'string') return defaultVal;
      if (maybeDefault) return maybeDefault;
      return key;
    },
  });
  return {
    useI18n,
    useTranslation: useI18n,
    I18nProvider: ({ children }: any) => children,
    DICTIONARIES: { en: {}, hi: {}, mr: {}, ta: {} },
  };
});

// Mock Supabase Client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));
