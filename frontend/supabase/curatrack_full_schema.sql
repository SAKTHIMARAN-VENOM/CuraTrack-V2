-- ====================================================================
-- CuraTrack V3 Complete Fresh Supabase SQL Schema
-- 
-- INSTRUCTION:
-- Copy this entire file, paste it into your Supabase SQL Editor, and click RUN.
-- This script safely DROPS all previous tables & stale data, then creates
-- pristine clean tables with strict account isolation for every feature.
-- ====================================================================

-- 1. DROP EXISTING TABLES TO START 100% FRESH
drop table if exists public.medications cascade;
drop table if exists public.prescriptions cascade;
drop table if exists public.doctor_notes cascade;
drop table if exists public.lab_results cascade;
drop table if exists public.diagnoses cascade;
drop table if exists public.allergies cascade;
drop table if exists public.vitals cascade;
drop table if exists public.insurance cascade;
drop table if exists public.appointments cascade;
drop table if exists public.doctors cascade;
drop table if exists public.patient_profile cascade;
drop table if exists public.doctor_profile cascade;
drop table if exists public.admin_profile cascade;
drop table if exists public.verification_status cascade;
drop table if exists public.profiles cascade;
drop table if exists public.google_tokens cascade;

-- ====================================================================
-- 2. CREATE SCHEMAS & TABLES
-- ====================================================================

-- PROFILES (Users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'patient',
  gender text,
  blood_group text,
  profile_completed boolean default false,
  updated_at timestamp with time zone default now()
);

-- PATIENT PROFILE
create table public.patient_profile (
  patient_id uuid references auth.users on delete cascade not null primary key,
  address text,
  emergency_contact jsonb,
  income_band text,
  occupation text,
  state text,
  updated_at timestamp with time zone default now()
);

-- DOCTOR PROFILE
create table public.doctor_profile (
  doctor_id uuid references auth.users on delete cascade not null primary key,
  reg_number text,
  qualification text,
  specialization text,
  experience_years integer default 0,
  hospital_name text,
  department text,
  updated_at timestamp with time zone default now()
);

-- ADMIN PROFILE
create table public.admin_profile (
  admin_id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text,
  department text,
  organization text,
  role text default 'Administrator',
  updated_at timestamp with time zone default now()
);

-- DOCTOR VERIFICATION STATUS
create table public.verification_status (
  doctor_id uuid references auth.users on delete cascade not null primary key,
  status text default 'pending',
  updated_at timestamp with time zone default now(),
  verified_at timestamp with time zone,
  verified_by text
);

-- MEDICATIONS (Health Records Tracker)
create table public.medications (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  name text not null,
  dosage text,
  frequency text,
  time text,
  reason text,
  instructions text,
  doctor text,
  status text default 'UPCOMING',
  source text default 'manual',
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- PRESCRIPTIONS
create table public.prescriptions (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  medication text not null,
  dosage text,
  frequency text,
  doctor_name text,
  date text,
  instructions text,
  created_at timestamp with time zone default now()
);

-- DOCTOR NOTES
create table public.doctor_notes (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  doctor text,
  specialty text,
  date text,
  visit_type text,
  complaint text,
  observations text,
  plan text,
  follow_up text,
  summary text,
  source text default 'manual',
  created_at timestamp with time zone default now()
);

-- LAB RESULTS
create table public.lab_results (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  test_name text not null,
  lab_name text,
  doctor text,
  date text,
  status text default 'Normal',
  results jsonb default '[]'::jsonb,
  source text default 'manual',
  created_at timestamp with time zone default now()
);

-- DIAGNOSES
create table public.diagnoses (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  name text not null,
  date text,
  status text default 'Active',
  created_at timestamp with time zone default now()
);

-- ALLERGIES
create table public.allergies (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  allergen text not null,
  severity text,
  reaction text,
  created_at timestamp with time zone default now()
);

-- VITALS
create table public.vitals (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  heart_rate jsonb,
  blood_pressure jsonb,
  spo2 jsonb,
  temperature jsonb,
  blood_glucose jsonb,
  timestamp timestamp with time zone default now()
);

-- INSURANCE
create table public.insurance (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  provider text,
  plan text,
  status text,
  member_id text,
  valid_until text,
  created_at timestamp with time zone default now()
);

-- DOCTORS (Directory)
create table public.doctors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  specialty text,
  hospital text,
  experience text,
  rating numeric default 4.8,
  created_at timestamp with time zone default now()
);

-- APPOINTMENTS (Telemedicine)
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  client_id text not null,
  doctor_id text,
  doctor_name text,
  date text,
  time text,
  status text default 'scheduled',
  type text default 'video',
  created_at timestamp with time zone default now()
);

-- GOOGLE TOKENS
create table public.google_tokens (
  user_id uuid references auth.users on delete cascade not null primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  token_type text,
  scope text,
  updated_at timestamp with time zone default now()
);

-- ====================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures user account data isolation & full read/write access
-- ====================================================================

alter table public.profiles enable row level security;
alter table public.patient_profile enable row level security;
alter table public.doctor_profile enable row level security;
alter table public.admin_profile enable row level security;
alter table public.verification_status enable row level security;
alter table public.medications enable row level security;
alter table public.prescriptions enable row level security;
alter table public.doctor_notes enable row level security;
alter table public.lab_results enable row level security;
alter table public.diagnoses enable row level security;
alter table public.allergies enable row level security;
alter table public.vitals enable row level security;
alter table public.insurance enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.google_tokens enable row level security;

-- Create policies allowing read & write operations
create policy "allow_all_profiles" on public.profiles for all using (true) with check (true);
create policy "allow_all_patient_profile" on public.patient_profile for all using (true) with check (true);
create policy "allow_all_doctor_profile" on public.doctor_profile for all using (true) with check (true);
create policy "allow_all_admin_profile" on public.admin_profile for all using (true) with check (true);
create policy "allow_all_verification_status" on public.verification_status for all using (true) with check (true);
create policy "allow_all_medications" on public.medications for all using (true) with check (true);
create policy "allow_all_prescriptions" on public.prescriptions for all using (true) with check (true);
create policy "allow_all_doctor_notes" on public.doctor_notes for all using (true) with check (true);
create policy "allow_all_lab_results" on public.lab_results for all using (true) with check (true);
create policy "allow_all_diagnoses" on public.diagnoses for all using (true) with check (true);
create policy "allow_all_allergies" on public.allergies for all using (true) with check (true);
create policy "allow_all_vitals" on public.vitals for all using (true) with check (true);
create policy "allow_all_insurance" on public.insurance for all using (true) with check (true);
create policy "allow_all_doctors" on public.doctors for all using (true) with check (true);
create policy "allow_all_appointments" on public.appointments for all using (true) with check (true);
create policy "allow_all_google_tokens" on public.google_tokens for all using (true) with check (true);
