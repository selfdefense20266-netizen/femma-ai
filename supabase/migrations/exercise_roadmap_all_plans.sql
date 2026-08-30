-- Paste this in the Supabase SQL editor, then run:
--   cd Femma-AI/artifacts/unstoppable
--   pnpm seed:roadmap
--
-- Saves a plan for every onboarding category × 15 min / 20–30 / 30–45 / 45–60 / 60+
-- × home / gym / both × 1 month (4w) / 2 months (8w) / 3 months (12w).

drop table if exists public.exercise_roadmap;

create table public.exercise_roadmap (
  id text primary key,
  category text not null,
  daily_time text not null,
  environment text not null,
  duration_weeks int not null default 8,
  plan_name text not null,
  tasks_per_day int not null default 5,
  total_days int not null default 28,
  week_days jsonb not null default '[]'::jsonb,
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercise_roadmap_combo_uidx
  on public.exercise_roadmap (category, daily_time, environment, duration_weeks);

create index exercise_roadmap_lookup_idx
  on public.exercise_roadmap (category, daily_time, environment, duration_weeks);

alter table public.exercise_roadmap enable row level security;

drop policy if exists "public read write exercise_roadmap" on public.exercise_roadmap;
create policy "public read write exercise_roadmap"
  on public.exercise_roadmap for all using (true) with check (true);
