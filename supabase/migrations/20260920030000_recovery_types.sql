-- Recovery stretch kinds for plan items (Rest is app-only, no DB rows).
alter table public.daily_plan_items
  add column if not exists recovery_type text;

update public.daily_plan_items
set recovery_type = 'full-body'
where item_type = 'recovery' and (recovery_type is null or recovery_type = '');

alter table public.daily_plan_items drop constraint if exists daily_plan_items_recovery_type_check;
alter table public.daily_plan_items
  add constraint daily_plan_items_recovery_type_check
  check (
    recovery_type is null
    or recovery_type in ('full-body', 'upper-body', 'lower-body', 'breath')
  );

create index if not exists daily_plan_items_recovery_type_idx
  on public.daily_plan_items (plan_id, recovery_type, intensity_level);
