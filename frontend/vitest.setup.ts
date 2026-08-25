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

const mockI18nReturn = {
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
  translate: vi.fn(async (t: string) => t),
  translateBatch: vi.fn(async (t: string[]) => t),
};

vi.mock('@/lib/i18n', () => ({
  useI18n: () => mockI18nReturn,
  useLanguage: () => mockI18nReturn,
  useTranslation: () => mockI18nReturn,
  useTranslations: () => (key: string) => key,
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));
