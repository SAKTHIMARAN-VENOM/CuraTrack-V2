import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://pwpbcomeklrxfieaklvq.supabase.co';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cGJjb21la2xyeGZpZWFrbHZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjExNzA0OSwiZXhwIjoyMTAxNjkzMDQ5fQ.4jgE4x-OtVfDKOLquXjBPiV3blb_SKqvGedFE8pUetk';

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
  if (!keyStr) return DEFAULT_SERVICE_ROLE_KEY;
  const trimmed = keyStr.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'placeholder') return DEFAULT_SERVICE_ROLE_KEY;
  return trimmed;
}

export function createAdminClient() {
  const url = getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceKey = getValidKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
