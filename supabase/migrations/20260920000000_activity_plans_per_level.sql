-- Activity plans: one plan per activity, 1–30 days, exercises tagged by level.

-- Per-item intensity (Beginner / Intermediate / Active)
alter table public.daily_plan_items
  add column if not exists intensity_level text not null default 'beginner';

update public.daily_plan_items dpi
set intensity_level = coalesce(nullif(dp.intensity_level, ''), 'beginner')
from public.daily_plans dp
where dpi.plan_id = dp.id
  and dpi.intensity_level is distinct from coalesce(nullif(dp.intensity_level, ''), 'beginner');

update public.daily_plan_items
set intensity_level = 'beginner'
where intensity_level in ('easy') or intensity_level is null or intensity_level = '';

update public.daily_plan_items
set intensity_level = 'active'
where intensity_level in ('advanced');

alter table public.daily_plan_items drop constraint if exists daily_plan_items_intensity_level_check;
alter table public.daily_plan_items
  add constraint daily_plan_items_intensity_level_check
  check (intensity_level in ('beginner', 'intermediate', 'active'));

create index if not exists daily_plan_items_intensity_idx
  on public.daily_plan_items (plan_id, day_number, intensity_level);

-- Drop combo-era constraints so duration_days can be 1–30 freely
alter table public.daily_plans drop constraint if exists daily_plans_plan_months_check;
alter table public.daily_plans drop constraint if exists daily_plans_session_minutes_check;

-- Remove old combo seeds (category × intensity × session × months)
delete from public.daily_plans where id like 'plan-%';

-- Cap remaining plans to 1–30 days
update public.daily_plans
set duration_days = least(30, greatest(1, coalesce(duration_days, 30))),
    plan_months = 1,
    session_minutes = coalesce(session_minutes, 20),
    intensity_level = case
      when intensity_level in ('intermediate', 'active') then intensity_level
      else 'beginner'
    end;

alter table public.daily_plans drop constraint if exists daily_plans_duration_days_check;
alter table public.daily_plans
  add constraint daily_plans_duration_days_check
  check (duration_days >= 1 and duration_days <= 30);

-- Tag sample yoga items for all three levels (same exercises, scaled duration)
update public.daily_plan_items
set intensity_level = 'beginner'
where plan_id = 'yoga-daily' and intensity_level = 'beginner';
