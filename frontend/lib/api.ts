import { createClient } from '@/lib/supabase/client';

/**
 * Central API configuration for FastAPI backend communication.
 * All frontend API calls to the backend MUST use this module.
 */
export const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_FASTAPI_URL || `${window.location.protocol}//${window.location.hostname}:8000`)
  : (process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000');

/**
 * Authenticated fetch wrapper that auto-attaches the Supabase session token
 * as a Bearer token in the Authorization header.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let session = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    session = data?.session;
  } catch (e) {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Ensure relative endpoints target the FastAPI backend API_BASE
  const targetUrl = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(targetUrl, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${res.statusText} - ${errorBody}`);
  }

  return res.json();
}
