import { createClient } from '@/lib/supabase/client';

/**
 * Central API configuration for FastAPI backend communication.
 * All frontend API calls to the backend MUST use this module.
 */
export const API_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

/**
 * Authenticated fetch wrapper that auto-attaches the Supabase session token
 * as a Bearer token in the Authorization header.
 * 
 * Usage:
 *   const data = await apiFetch('/api/insurance/eligibility', {
 *     method: 'POST',
 *     body: JSON.stringify({ patientId: 'PAT-123', ... })
 *   });
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach Supabase access token if available
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}
