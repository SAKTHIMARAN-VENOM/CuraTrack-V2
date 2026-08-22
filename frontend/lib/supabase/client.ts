import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_URL = 'https://pwpbcomeklrxfieaklvq.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cGJjb21la2xyeGZpZWFrbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTcwNDksImV4cCI6MjEwMTY5MzA0OX0.pVxpAV3Qq-4P9-z1_T4j17wYGim3EKu0_00OokyQFKg';

function getValidUrl(urlStr?: string): string {
  if (!urlStr) return DEFAULT_URL;
  const trimmed = urlStr.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed.includes('placeholder')) return DEFAULT_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch (e) {
    // fallback if invalid URL
  }
  return DEFAULT_URL;
}

function getValidKey(keyStr?: string): string {
  if (!keyStr) return DEFAULT_KEY;
  const trimmed = keyStr.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'placeholder') return DEFAULT_KEY;
  return trimmed;
}

export function createClient() {
  const url = getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getValidKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createBrowserClient(url, key);
}

