-- 1. Add role column to profiles
alter table public.profiles 
add column if not exists role text check (role in ('client', 'doctor')) default 'client';

-- 2. Create appointments table
create table if not exists public.appointments (
    id uuid primary key default gen_random_uuid(),
    client_id text not null,
    doctor_id text not null,
    doctor_name text,
    scheduled_time timestamp with time zone not null,
    room_id text unique not null,
    date text,
    time text,
    notes text,
    type text default 'video',
    patient_name text,
    beneficiary_id text,
    asha_id text,
    asha_name text,
    village_name text,
    priority text default 'ROUTINE',
    complaint text,
    vitals_bp text,
    vitals_hr text,
    vitals_spo2 text,
    vitals_temp text,
    vitals_bmi text,
    consult_type text default 'standard_teleconsult',
    token text,
    status text check (status in ('active', 'ringing', 'ongoing', 'ended', 'scheduled', 'cancelled')) default 'active',
    created_at timestamp with time zone default now()
);

alter table public.appointments add column if not exists doctor_name text;
alter table public.appointments add column if not exists date text;
alter table public.appointments add column if not exists time text;
alter table public.appointments add column if not exists notes text;
alter table public.appointments add column if not exists type text default 'video';
alter table public.appointments add column if not exists patient_name text;
alter table public.appointments add column if not exists beneficiary_id text;
alter table public.appointments add column if not exists asha_id text;
alter table public.appointments add column if not exists asha_name text;
alter table public.appointments add column if not exists village_name text;
alter table public.appointments add column if not exists priority text default 'ROUTINE';
alter table public.appointments add column if not exists complaint text;
alter table public.appointments add column if not exists vitals_bp text;
alter table public.appointments add column if not exists vitals_hr text;
alter table public.appointments add column if not exists vitals_spo2 text;
alter table public.appointments add column if not exists vitals_temp text;
alter table public.appointments add column if not exists vitals_bmi text;
alter table public.appointments add column if not exists consult_type text default 'standard_teleconsult';
alter table public.appointments add column if not exists token text;

-- 3. Enable RLS
alter table public.appointments enable row level security;

-- 4. RLS Policies for Appointments
-- Users can see appointments where they are either the client or the doctor
create policy "Users can view their own appointments"
on public.appointments for select
using (auth.uid()::text = client_id or auth.uid()::text = doctor_id or auth.uid()::text = asha_id);

-- Clients can create appointments
create policy "Clients can book appointments"
on public.appointments for insert
with check (auth.uid()::text = client_id or asha_id = auth.uid()::text);

-- Both can update status (to end call, etc.)
create policy "Participants can update appointment status"
on public.appointments for update
using (auth.uid()::text = client_id or auth.uid()::text = doctor_id or auth.uid()::text = asha_id);

-- 5. Helper view to see available doctors
create or replace view public.doctors as
select id, name, email, picture
from public.profiles
where role = 'doctor';

-- Grant access to the view
grant select on public.doctors to authenticated;
grant select on public.appointments to authenticated;
grant insert on public.appointments to authenticated;
grant update on public.appointments to authenticated;
