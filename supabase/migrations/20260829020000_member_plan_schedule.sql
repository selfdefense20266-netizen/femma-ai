alter table public.member_plans
  add column if not exists watch_courses jsonb not null default '[]'::jsonb;

alter table public.member_plans
  add column if not exists schedule jsonb not null default '[]'::jsonb;
