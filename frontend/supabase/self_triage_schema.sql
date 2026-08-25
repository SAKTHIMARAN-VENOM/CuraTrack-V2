-- ====================================================================
-- CuraTrack V3 Self-Triage Schema
-- Stores patient self-assessments, real-time urgency tiers, and triage statuses
-- ====================================================================

create table if not exists public.self_triage (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  patient_name text,
  age integer,
  gender text,
  symptoms text[] default '{}'::text[],
  symptom_description text,
  red_flags text[] default '{}'::text[],
  severity integer default 5,
  duration_days integer default 1,
  vitals jsonb default '{}'::jsonb,
  urgency text default 'GREEN',
  urgency_label text,
  recommended_facility text,
  immediate_actions text[] default '{}'::text[],
  potential_conditions text[] default '{}'::text[],
  teleconsult_recommended boolean default false,
  status text default 'PENDING',
  acknowledged_by text,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.self_triage enable row level security;

-- Policy allowing access
drop policy if exists "allow_all_self_triage" on public.self_triage;
create policy "allow_all_self_triage" on public.self_triage for all using (true) with check (true);
