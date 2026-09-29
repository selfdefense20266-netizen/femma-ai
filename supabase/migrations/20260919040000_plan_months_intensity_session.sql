-- Plan length (1/2/3 months), intensity level, and session minutes
alter table public.daily_plans
  add column if not exists plan_months int not null default 1;

alter table public.daily_plans
  add column if not exists intensity_level text not null default 'beginner';

alter table public.daily_plans
  add column if not exists session_minutes int not null default 20;

-- Keep duration_days in sync with months (30 / 60 / 90)
update public.daily_plans
set
  plan_months = case
    when coalesce(duration_days, 0) >= 90 then 3
    when coalesce(duration_days, 0) >= 60 then 2
    else greatest(1, least(3, coalesce(plan_months, 1)))
  end
where true;

update public.daily_plans
set duration_days = plan_months * 30
where coalesce(duration_days, 0) <> plan_months * 30
   or duration_days is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_plans_plan_months_check'
  ) then
    alter table public.daily_plans
      add constraint daily_plans_plan_months_check check (plan_months in (1, 2, 3));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'daily_plans_intensity_level_check'
  ) then
    alter table public.daily_plans
      add constraint daily_plans_intensity_level_check
      check (intensity_level in ('easy', 'beginner', 'active', 'advanced'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'daily_plans_session_minutes_check'
  ) then
    alter table public.daily_plans
      add constraint daily_plans_session_minutes_check
      check (session_minutes in (15, 20, 30));
  end if;
end $$;

create index if not exists daily_plans_plan_months_idx on public.daily_plans (plan_months);
create index if not exists daily_plans_intensity_level_idx on public.daily_plans (intensity_level);
create index if not exists daily_plans_session_minutes_idx on public.daily_plans (session_minutes);
