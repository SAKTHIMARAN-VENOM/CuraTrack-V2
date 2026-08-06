/**
 * CuraTrack color system — matches the web frontend's design tokens.
 */
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1C20',
    background: '#F8FAFB',
    backgroundElement: '#EEF2F5',
    backgroundSelected: '#E0E5EA',
    textSecondary: '#6B7280',
    // CuraTrack brand colors
    primary: '#0D8AED',
    primaryLight: '#E6F4FE',
    secondary: '#10B981',
    secondaryLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    tertiary: '#8B5CF6',
    tertiaryLight: '#EDE9FE',
    surface: '#FFFFFF',
    surfaceContainer: '#F3F5F7',
    surfaceContainerLow: '#F8F9FA',
    border: '#E5E7EB',
    card: '#FFFFFF',
  },
  dark: {
    text: '#F0F2F5',
    background: '#0F1117',
    backgroundElement: '#1A1D24',
    backgroundSelected: '#252830',
    textSecondary: '#9CA3AF',
    primary: '#3B9EF5',
    primaryLight: '#0D2847',
    secondary: '#34D399',
    secondaryLight: '#064E3B',
    error: '#F87171',
    errorLight: '#450A0A',
    tertiary: '#A78BFA',
    tertiaryLight: '#2E1065',
    surface: '#1A1D24',
    surfaceContainer: '#252830',
    surfaceContainerLow: '#1E2028',
    border: '#374151',
    card: '#1E2028',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
