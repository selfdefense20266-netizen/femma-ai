-- Store exercise/rest durations as seconds (was minutes). Enables 30s / 10s rests.
-- Runs once: only if table still looks minute-based (max duration <= 90).
do $$
begin
  if (select coalesce(max(duration_minutes), 0) from public.daily_plan_items) <= 90 then
    update public.daily_plan_items
    set
      duration_minutes = greatest(1, duration_minutes * 60),
      rest_minutes = greatest(0, rest_minutes * 60);
  end if;

  if (select coalesce(max(duration_minutes), 0) from public.exercise_library) <= 90 then
    update public.exercise_library
    set
      duration_minutes = greatest(1, duration_minutes * 60),
      rest_minutes = greatest(0, rest_minutes * 60);
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'recovery_section_items'
  ) and (select coalesce(max(duration_minutes), 0) from public.recovery_section_items) <= 90 then
    update public.recovery_section_items
    set
      duration_minutes = greatest(1, duration_minutes * 60),
      rest_minutes = greatest(0, rest_minutes * 60);
  end if;
end $$;

comment on column public.daily_plan_items.duration_minutes is 'Duration in seconds (column name kept for compatibility)';
comment on column public.daily_plan_items.rest_minutes is 'Rest after exercise in seconds (column name kept for compatibility)';
