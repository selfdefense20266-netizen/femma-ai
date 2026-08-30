-- Training plans chosen at onboarding (duration, courses, food, performance).

create table if not exists public.member_plans (
  id text primary key,
  member_id text not null references public.members (id) on delete cascade,
  plan_name text,
  goal text,
  duration_weeks int not null default 8,
  food_preference text,
  fitness_level text,
  environment text,
  course_ids jsonb not null default '[]'::jsonb,
  course_names jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed')),
  performance jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_plans_member_id_idx on public.member_plans (member_id);

alter table public.members
  add column if not exists food_preference text;

alter table public.member_plans enable row level security;

drop policy if exists "public read write member_plans" on public.member_plans;
create policy "public read write member_plans" on public.member_plans for all using (true) with check (true);
