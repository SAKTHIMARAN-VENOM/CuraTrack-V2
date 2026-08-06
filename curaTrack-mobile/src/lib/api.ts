/**
 * Central API configuration for FastAPI backend communication.
 * Uses the machine's local IP so physical devices on the same WiFi can connect.
 */
import { supabase } from './supabase';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://curatrack-backend.onrender.com';

/**
 * Authenticated fetch wrapper that auto-attaches the Supabase session token
 * as a Bearer token in the Authorization header.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

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
    throw new Error(
      errorData.detail || errorData.message || `API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Upload a file (e.g. medical document image) via multipart/form-data.
 */
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || errorData.message || `Upload error: ${response.status}`
    );
  }

  return response.json();
}
