-- 1. Add role column to profiles
alter table public.profiles 
add column if not exists role text check (role in ('client', 'doctor')) default 'client';

-- 2. Create appointments table
create table if not exists public.appointments (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references auth.users(id) not null,
    doctor_id uuid references auth.users(id) not null,
    scheduled_time timestamp with time zone not null,
    room_id text unique not null,
    status text check (status in ('active', 'ringing', 'ongoing', 'ended')) default 'active',
    created_at timestamp with time zone default now()
);

-- 3. Enable RLS
alter table public.appointments enable row level security;

-- 4. RLS Policies for Appointments
-- Users can see appointments where they are either the client or the doctor
create policy "Users can view their own appointments"
on public.appointments for select
using (auth.uid() = client_id or auth.uid() = doctor_id);

-- Clients can create appointments
create policy "Clients can book appointments"
on public.appointments for insert
with check (auth.uid() = client_id);

-- Both can update status (to end call, etc.)
create policy "Participants can update appointment status"
on public.appointments for update
using (auth.uid() = client_id or auth.uid() = doctor_id);

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
