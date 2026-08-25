-- Admin auth for Fema AI admin panel
-- Only rows in admin_users may access the dashboard after Supabase Auth login.

create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default 'Fema AI Admin',
  role text not null default 'Administrator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admins can read own row" on public.admin_users;
create policy "admins can read own row" on public.admin_users
  for select
  using (auth.uid() = id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active = true
  );
$$;
