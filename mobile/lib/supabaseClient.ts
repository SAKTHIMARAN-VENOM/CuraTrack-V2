import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jouwxykvjjtdgmsfzkgw.supabase.co/';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdXd4eWt2amp0ZGdtc2Z6a2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDY4MDEsImV4cCI6MjA5MTk4MjgwMX0.yzxj2oBpaa4tIMGUTpBAVlZrqqeNZuhDRnUVV7cTYeo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getAuthRedirectUrl = (path: string = '/auth/callback'): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url.startsWith('http') ? `${url}${path}` : `https://${url}${path}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = process.env.NEXT_PUBLIC_VERCEL_URL;
    return url.startsWith('http') ? `${url}${path}` : `https://${url}${path}`;
  }
  return `https://moblie-ui-curatrack.vercel.app${path}`;
};

