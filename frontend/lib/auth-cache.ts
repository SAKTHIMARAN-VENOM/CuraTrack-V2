import { createClient } from '@/lib/supabase/client';

export interface CachedUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  blood_group?: string;
  gender?: string;
  allergies?: string;
  chronic_diseases?: string;
  age?: number | string;
  phone?: string;
  [key: string]: any;
}

let inMemoryUser: CachedUser | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute in-memory cache

export async function getCachedUser(forceRefresh = false): Promise<CachedUser | null> {
  const now = Date.now();
  if (!forceRefresh && inMemoryUser && now - lastFetchTime < CACHE_TTL_MS) {
    return inMemoryUser;
  }

  // 1. Check local storage first (instant synchronous fallback)
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('curatrack_auth_user') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryUser = parsed;
      }
    }
  } catch {}

  // 2. Fetch from Supabase or Auth endpoint asynchronously
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const merged: CachedUser = {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.full_name || inMemoryUser?.name || 'User',
        role: profile?.role || user.user_metadata?.role || inMemoryUser?.role || 'patient',
        blood_group: profile?.blood_group || inMemoryUser?.blood_group || '',
        gender: profile?.gender || inMemoryUser?.gender || '',
        allergies: profile?.allergies || inMemoryUser?.allergies || '',
        chronic_diseases: profile?.chronic_diseases || inMemoryUser?.chronic_diseases || '',
        age: profile?.age || inMemoryUser?.age,
        phone: profile?.phone || inMemoryUser?.phone || '',
      };

      inMemoryUser = merged;
      lastFetchTime = now;

      if (typeof window !== 'undefined') {
        localStorage.setItem('curatrack_auth_user', JSON.stringify(merged));
      }
      return inMemoryUser;
    }
  } catch (err) {
    // If offline or network error, fallback to in-memory/localStorage user
  }

  lastFetchTime = now;
  return inMemoryUser;
}

export function setCachedUser(user: CachedUser | null) {
  inMemoryUser = user;
  lastFetchTime = Date.now();
  if (typeof window !== 'undefined' && user) {
    localStorage.setItem('curatrack_auth_user', JSON.stringify(user));
  }
}
