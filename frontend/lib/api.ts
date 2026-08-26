import { createClient } from '@/lib/supabase/client';

/**
 * Central API configuration for FastAPI backend communication.
 * All frontend API calls to the backend MUST use this module.
 */
export const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_FASTAPI_URL || `${window.location.protocol}//${window.location.hostname}:8000`)
  : (process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000');

export interface ApiFetchOptions extends RequestInit {
  throwOnError?: boolean;
}

/**
 * Authenticated fetch wrapper that auto-attaches the Supabase session token
 * as a Bearer token in the Authorization header.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { throwOnError = false, ...fetchOptions } = options;
  let session = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    session = data?.session;
  } catch (e) {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Ensure relative endpoints target the FastAPI backend API_BASE
  const targetUrl = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      ...fetchOptions,
      headers,
    });
  } catch (err: any) {
    const isNetworkErr = err?.name === 'TypeError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch failed');
    const msg = isNetworkErr
      ? `Backend API server unavailable at ${API_BASE}. Please verify that the FastAPI backend is running.`
      : `Network error reaching ${targetUrl}: ${err?.message || 'Unknown network error'}`;
    console.warn(`[apiFetch Connection Warning]`, msg);
    if (throwOnError) {
      throw new Error(msg);
    }
    return null as unknown as T;
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const msg = `API error ${res.status}: ${res.statusText} - ${errorBody}`;
    console.warn(`[apiFetch HTTP Error]`, msg);
    if (throwOnError) {
      throw new Error(msg);
    }
    return null as unknown as T;
  }

  return res.json().catch(() => (null as unknown as T));
}
