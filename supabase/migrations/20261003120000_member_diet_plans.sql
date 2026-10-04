-- AI-generated 30-day diet plans per member (breakfast / lunch / dinner).

create table if not exists public.member_diet_plans (
  member_id text primary key references public.members (id) on delete cascade,
  goal text,
  fitness_level text,
  food_preference text,
  height_cm numeric,
  weight_kg numeric,
  calorie_target int,
  bmi numeric,
  fingerprint text,
  days jsonb not null default '[]'::jsonb,
  source text not null default 'ai',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_diet_plans_updated_at_idx
  on public.member_diet_plans (updated_at desc);

alter table public.member_diet_plans enable row level security;

drop policy if exists "public read write member_diet_plans" on public.member_diet_plans;
create policy "public read write member_diet_plans" on public.member_diet_plans
  for all using (true) with check (true);
