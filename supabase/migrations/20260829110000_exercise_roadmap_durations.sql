-- Store a full plan for every category × daily time × environment × 1/2/3 month length.

alter table public.exercise_roadmap
  add column if not exists duration_weeks int not null default 8;

alter table public.exercise_roadmap
  add column if not exists days jsonb not null default '[]'::jsonb;

alter table public.exercise_roadmap
  add column if not exists total_days int not null default 28;

alter table public.exercise_roadmap
  drop constraint if exists exercise_roadmap_category_daily_time_environment_key;

drop index if exists exercise_roadmap_lookup_idx;

create unique index if not exists exercise_roadmap_combo_uidx
  on public.exercise_roadmap (category, daily_time, environment, duration_weeks);

create index if not exists exercise_roadmap_lookup_idx
  on public.exercise_roadmap (category, daily_time, environment, duration_weeks);
