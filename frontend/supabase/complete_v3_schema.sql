-- ====================================================================
-- CuraTrack V3 Complete Supabase SQL Schema
-- Copy and paste this ENTIRE script into your Supabase SQL Editor and click RUN.
-- ====================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'patient',
  gender text,
  blood_group text,
  profile_completed boolean default false,
  updated_at timestamp with time zone default now()
);

-- 2. PATIENT PROFILE TABLE
create table if not exists public.patient_profile (
  patient_id uuid references auth.users on delete cascade not null primary key,
  address text,
  emergency_contact jsonb,
  income_band text,
  occupation text,
  state text,
  updated_at timestamp with time zone default now()
);

-- 3. DOCTOR PROFILE TABLE
create table if not exists public.doctor_profile (
  doctor_id uuid references auth.users on delete cascade not null primary key,
  reg_number text,
  qualification text,
  specialization text,
  experience_years integer default 0,
  hospital_name text,
  department text,
  updated_at timestamp with time zone default now()
);

-- 4. ADMIN PROFILE TABLE
create table if not exists public.admin_profile (
  admin_id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text,
  department text,
  organization text,
  role text default 'Administrator',
  updated_at timestamp with time zone default now()
);

-- 5. DOCTOR VERIFICATION STATUS TABLE
create table if not exists public.verification_status (
  doctor_id uuid references auth.users on delete cascade not null primary key,
  status text default 'pending',
  updated_at timestamp with time zone default now(),
  verified_at timestamp with time zone,
  verified_by text
);

-- 6. MEDICATIONS TABLE
create table if not exists public.medications (
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

-- 7. PRESCRIPTIONS TABLE
create table if not exists public.prescriptions (
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

-- 8. DOCTOR NOTES TABLE
create table if not exists public.doctor_notes (
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

-- 9. LAB RESULTS TABLE
create table if not exists public.lab_results (
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

-- 10. DIAGNOSES TABLE
create table if not exists public.diagnoses (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  name text not null,
  date text,
  status text default 'Active',
  created_at timestamp with time zone default now()
);

-- 11. ALLERGIES TABLE
create table if not exists public.allergies (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  allergen text not null,
  severity text,
  reaction text,
  created_at timestamp with time zone default now()
);

-- 12. VITALS TABLE
create table if not exists public.vitals (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  heart_rate jsonb,
  blood_pressure jsonb,
  spo2 jsonb,
  temperature jsonb,
  blood_glucose jsonb,
  timestamp timestamp with time zone default now()
);

-- 13. INSURANCE TABLE
create table if not exists public.insurance (
  id uuid default gen_random_uuid() primary key,
  patient_id text not null,
  provider text,
  plan text,
  status text,
  member_id text,
  valid_until text,
  created_at timestamp with time zone default now()
);

-- 14. APPOINTMENTS TABLE (Telemedicine & Virtual Consultations)
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  client_id text not null,
  doctor_id text not null,
  scheduled_time timestamp with time zone not null,
  room_id text not null,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ====================================================================

-- Enable RLS on all tables
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
alter table public.appointments enable row level security;

-- Drop existing policies if any to prevent conflicts
drop policy if exists "allow_all_profiles" on public.profiles;
drop policy if exists "allow_all_patient_profile" on public.patient_profile;
drop policy if exists "allow_all_doctor_profile" on public.doctor_profile;
drop policy if exists "allow_all_admin_profile" on public.admin_profile;
drop policy if exists "allow_all_verification_status" on public.verification_status;
drop policy if exists "allow_all_medications" on public.medications;
drop policy if exists "allow_all_prescriptions" on public.prescriptions;
drop policy if exists "allow_all_doctor_notes" on public.doctor_notes;
drop policy if exists "allow_all_lab_results" on public.lab_results;
drop policy if exists "allow_all_diagnoses" on public.diagnoses;
drop policy if exists "allow_all_allergies" on public.allergies;
drop policy if exists "allow_all_vitals" on public.vitals;
drop policy if exists "allow_all_insurance" on public.insurance;
drop policy if exists "allow_all_appointments" on public.appointments;

-- Create policies allowing full read/write access for user records
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
create policy "allow_all_appointments" on public.appointments for all using (true) with check (true);

-- Helper view for available doctors
create or replace view public.doctors as
select id, name, email
from public.profiles
where role = 'doctor';

grant select on public.doctors to authenticated, anon;
