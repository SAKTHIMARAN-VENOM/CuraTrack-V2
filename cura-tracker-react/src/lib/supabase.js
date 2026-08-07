import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jouwxykvjjtdgmsfzkgw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdXd4eWt2amp0ZGdtc2Z6a2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDY4MDEsImV4cCI6MjA5MTk4MjgwMX0.yzxj2oBpaa4tIMGUTpBAVlZrqqeNZuhDRnUVV7cTYeo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
