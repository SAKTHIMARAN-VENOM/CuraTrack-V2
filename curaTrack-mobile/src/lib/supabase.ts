import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Storage adapter with SSR safety check for web rendering, while ensuring native AsyncStorage runs on iOS/Android.
 */
const customStorage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
