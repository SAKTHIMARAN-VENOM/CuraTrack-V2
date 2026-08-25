import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(() => []),
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    language: 'en',
    locale: 'en',
    setLanguage: vi.fn(),
    setLocale: vi.fn(),
    t: (key: string, paramsOrFallback?: any, maybeFallback?: string) => {
      if (typeof paramsOrFallback === 'string') return paramsOrFallback;
      if (maybeFallback) return maybeFallback;
      const parts = key.split('.');
      return parts[parts.length - 1] || key;
    },
  }),
  useTranslation: () => ({
    language: 'en',
    locale: 'en',
    setLanguage: vi.fn(),
    setLocale: vi.fn(),
    t: (key: string, paramsOrFallback?: any, maybeFallback?: string) => {
      if (typeof paramsOrFallback === 'string') return paramsOrFallback;
      if (maybeFallback) return maybeFallback;
      const parts = key.split('.');
      return parts[parts.length - 1] || key;
    },
  }),
  useTranslations: () => (key: string) => key,
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));
