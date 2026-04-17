-- 1. Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  email text unique not null,
  name text,
  picture text,
  
  constraint name_length check (char_length(name) >= 3)
);

-- 2. Create a table for Google Fit tokens
create table google_tokens (
  user_id uuid references auth.users on delete cascade not null primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  token_type text,
  scope text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table google_tokens enable row level security;

-- 4. Create policies
-- Profiles: Users can see their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Tokens: Users can manage their own tokens
create policy "Users can view own tokens" on google_tokens
  for select using (auth.uid() = user_id);

create policy "Users can update own tokens" on google_tokens
  for update using (auth.uid() = user_id);

create policy "Users can insert own tokens" on google_tokens
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own tokens" on google_tokens
  for delete using (auth.uid() = user_id);

-- 5. Trigger for updated_at on google_tokens
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_google_tokens_updated_at
before update on google_tokens
for each row execute procedure handle_updated_at();

-- 6. Trigger for profile creation on auth signup (Optional but recommended)
-- This creates a profile record when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
