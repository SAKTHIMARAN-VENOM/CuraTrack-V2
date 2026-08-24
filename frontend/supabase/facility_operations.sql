-- ====================================================================
-- CuraTrack Facility Operations Schema & Mock Data Seed
-- 
-- INSTRUCTION:
-- Copy this entire file, paste it into your Supabase SQL Editor, and click RUN.
-- This script creates the required tables for the Facility Portal and seeds them
-- with initial mock data.
-- ====================================================================

-- 1. DROP EXISTING TABLES IF ANY
drop table if exists public.facility_stats cascade;
drop table if exists public.facility_doctors cascade;
drop table if exists public.facility_beds cascade;
drop table if exists public.facility_medicines cascade;
drop table if exists public.facility_diagnostics cascade;

-- ====================================================================
-- 2. CREATE SCHEMAS & TABLES
-- ====================================================================

-- FACILITY STATS
create table public.facility_stats (
    id uuid default gen_random_uuid() primary key,
    facility_name text,
    facility_type text,
    district text,
    state text,
    opd_total_registered integer default 0,
    opd_consulted integer default 0,
    opd_waiting integer default 0,
    opd_average_wait_minutes integer default 0,
    active_inbound_referrals integer default 0,
    active_outbound_referrals integer default 0,
    updated_at timestamp with time zone default now()
);

-- FACILITY DOCTORS ROSTER
create table public.facility_doctors (
    id text primary key,
    name text,
    specialty text,
    qualification text,
    status text,
    shift text,
    current_opd_token text,
    patients_seen_today integer default 0,
    phone text,
    room text,
    updated_at timestamp with time zone default now()
);

-- FACILITY BEDS
create table public.facility_beds (
    id uuid default gen_random_uuid() primary key,
    ward text not null,
    total integer default 0,
    occupied integer default 0,
    available integer default 0,
    description text,
    updated_at timestamp with time zone default now()
);

-- FACILITY MEDICINES
create table public.facility_medicines (
    id text primary key,
    name text not null,
    category text,
    stock_units integer default 0,
    monthly_consumption integer default 0,
    days_of_supply integer default 0,
    status text,
    unit text,
    storage_location text,
    last_restocked date,
    updated_at timestamp with time zone default now()
);

-- FACILITY DIAGNOSTICS
create table public.facility_diagnostics (
    id text primary key,
    patient_id text,
    patient_name text,
    test_name text,
    category text,
    priority text,
    ordered_by text,
    facility_level text,
    ordered_at timestamp with time zone,
    status text,
    clinical_indication text,
    result_summary text,
    critical_alert boolean default false,
    updated_at timestamp with time zone default now()
);

-- ====================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
alter table public.facility_stats enable row level security;
alter table public.facility_doctors enable row level security;
alter table public.facility_beds enable row level security;
alter table public.facility_medicines enable row level security;
alter table public.facility_diagnostics enable row level security;

-- Create policies allowing read/write access (simplified for MVP/testing)
create policy "Enable read/write for all on facility_stats" on public.facility_stats for all using (true) with check (true);
create policy "Enable read/write for all on facility_doctors" on public.facility_doctors for all using (true) with check (true);
create policy "Enable read/write for all on facility_beds" on public.facility_beds for all using (true) with check (true);
create policy "Enable read/write for all on facility_medicines" on public.facility_medicines for all using (true) with check (true);
create policy "Enable read/write for all on facility_diagnostics" on public.facility_diagnostics for all using (true) with check (true);


-- ====================================================================
-- 4. INSERT SEED DATA
-- ====================================================================

-- Insert Stats
insert into public.facility_stats (facility_name, facility_type, district, state, opd_total_registered, opd_consulted, opd_waiting, opd_average_wait_minutes, active_inbound_referrals, active_outbound_referrals)
values ('Nandurbar Sub-District Hospital & CHC', 'Community Health Centre (CHC)', 'Nandurbar', 'Maharashtra', 142, 98, 44, 22, 8, 3);

-- Insert Doctors
insert into public.facility_doctors (id, name, specialty, qualification, status, shift, current_opd_token, patients_seen_today, phone, room)
values 
('DOC-001', 'Dr. David Ross', 'General Medicine & Internal Medicine', 'MBBS, MD (General Medicine)', 'ON_DUTY', 'Morning (08:00 AM - 02:00 PM)', 'TKN-098', 24, '+91 98230 55441', 'OPD Room 2'),
('DOC-002', 'Dr. Sarah Jenkins', 'Obstetrics & Gynecology', 'MBBS, MS (OB-GYN)', 'ON_DUTY', 'Morning (08:00 AM - 02:00 PM)', 'TKN-045', 18, '+91 98230 66772', 'ANC / Maternity Ward'),
('DOC-003', 'Dr. Michael Chang', 'Pediatrics & Neonatology', 'MBBS, DCH', 'ON_DUTY', 'Afternoon (02:00 PM - 08:00 PM)', null, 0, '+91 98230 77883', 'Pediatric OPD'),
('DOC-004', 'Dr. Elena Rostova', 'Community & Preventive Medicine', 'MBBS, MD (PSM)', 'ON_DUTY', 'Morning (08:00 AM - 02:00 PM)', 'TKN-072', 15, '+91 98230 88994', 'NCD / Screening Room'),
('DOC-005', 'Dr. Arun Patil', 'Emergency & Trauma', 'MBBS, DEMS', 'OFF_DUTY', 'Night (08:00 PM - 08:00 AM)', null, 0, '+91 98230 99105', 'Emergency / Trauma Bay'),
('DOC-006', 'Dr. Meena Bhonsle', 'Dental & Oral Surgery', 'BDS', 'ON_DUTY', 'Morning (08:00 AM - 02:00 PM)', 'TKN-012', 9, '+91 98230 10216', 'Dental OPD');

-- Insert Beds
insert into public.facility_beds (ward, total, occupied, available, description)
values 
('General Male Ward', 14, 10, 4, 'Adult male inpatient recovery & observation'),
('General Female Ward', 12, 10, 2, 'Adult female inpatient recovery & observation'),
('Maternal ANC / Postpartum Ward', 8, 4, 4, 'High-risk pregnancy, labour, postnatal care'),
('Pediatric Ward', 6, 5, 1, 'Neonatal observation & childhood illness'),
('Emergency / Trauma ICU', 4, 2, 2, 'Ventilator, oxygen support, hemodynamic monitoring'),
('Isolation Ward', 6, 7, -1, 'TB, vector-borne, respiratory infection isolation');

-- Insert Medicines
insert into public.facility_medicines (id, name, category, stock_units, monthly_consumption, days_of_supply, status, unit, storage_location, last_restocked)
values 
('MED-101', 'Paracetamol 500mg (Tablet)', 'Analgesics / Antipyretics', 12500, 10000, 37, 'ADEQUATE', 'tablets', 'Pharmacy Bay A2', '2026-07-01'),
('MED-102', 'Amoxicillin 500mg (Capsule)', 'Antibiotics', 1800, 2500, 21, 'LOW_STOCK', 'capsules', 'Pharmacy Bay A4', '2026-06-15'),
('MED-103', 'ORS Sachets', 'Fluid & Electrolyte', 150, 2000, 2, 'CRITICAL_STOCKOUT_RISK', 'sachets', 'Pharmacy Bay B1', '2026-05-20'),
('MED-104', 'Iron & Folic Acid (IFA)', 'Maternal Supplements', 22000, 8000, 82, 'ADEQUATE', 'tablets', 'Pharmacy Bay B3', '2026-07-10'),
('MED-105', 'Ceftriaxone 1g (Injection)', 'Antibiotics / Emergency', 45, 300, 4, 'CRITICAL_STOCKOUT_RISK', 'vials', 'Cold Chain Refrigerator 2', '2026-06-25'),
('MED-106', 'Amlodipine 5mg (Tablet)', 'Anti-hypertensive', 5400, 4000, 40, 'ADEQUATE', 'tablets', 'Pharmacy Bay C1', '2026-07-05'),
('MED-107', 'Metformin 500mg (Tablet)', 'Anti-diabetic', 1200, 3500, 10, 'LOW_STOCK', 'tablets', 'Pharmacy Bay C2', '2026-06-10'),
('MED-108', 'Tetanus Toxoid Vaccine', 'Immunization', 80, 200, 12, 'LOW_STOCK', 'doses', 'Cold Chain Refrigerator 1', '2026-07-02');

-- Insert Diagnostics
insert into public.facility_diagnostics (id, patient_id, patient_name, test_name, category, priority, ordered_by, facility_level, ordered_at, status, clinical_indication, result_summary, critical_alert)
values 
('LAB-2026-8901', 'PAT-1045', 'Suresh Kale', 'Complete Blood Count (CBC)', 'Hematology', 'ROUTINE', 'Dr. David Ross', 'CHC', '2026-08-07T09:15:00Z', 'COMPLETED', 'Routine wellness check', 'Hb 11.2 g/dL. All within normal ranges.', false),
('LAB-2026-8902', 'PAT-1092', 'Geeta Pawar', 'Dengue NS1 Antigen', 'Serology', 'STAT', 'Dr. Michael Chang', 'CHC', '2026-08-07T10:45:00Z', 'COMPLETED', 'High fever, joint pain, vector exposure', 'POSITIVE for NS1 Antigen.', true),
('LAB-2026-8903', 'PAT-1156', 'Ramesh Gavit', 'HbA1c & Fasting Glucose', 'Biochemistry', 'ROUTINE', 'Dr. Elena Rostova', 'CHC', '2026-08-07T11:20:00Z', 'PROCESSING', 'Type 2 Diabetes follow-up', null, false),
('LAB-2026-8904', 'PAT-1203', 'Anita Patil', 'Obstetric Ultrasound (T2)', 'Imaging', 'URGENT', 'Dr. Sarah Jenkins', 'District Hospital Referral', '2026-08-07T13:00:00Z', 'AWAITING_SAMPLE', 'Decreased fetal movement reported', null, false);
