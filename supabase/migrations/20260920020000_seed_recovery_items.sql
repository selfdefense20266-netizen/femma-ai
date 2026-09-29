-- Add 1 recovery move per day × level on each activity plan
insert into public.daily_plan_items (
  id, plan_id, day_number, intensity_level, item_type, title, tag, subtitle,
  scheduled_time, duration_minutes, rest_minutes, media_url, cue, sort_order
)
select
  format('%s-d%s-%s-rec0', p.id, d.day_n, lv.level_id),
  p.id,
  d.day_n,
  lv.level_id,
  'recovery',
  coalesce(lib.title, 'Breath & Recover'),
  format('%s · Recovery', lv.level_label),
  'Cool down',
  '',
  case lv.level_id when 'beginner' then 5 when 'intermediate' then 8 else 10 end,
  0,
  lib.media_url,
  coalesce(nullif(lib.cue, ''), 'Slow breath. Soften the shoulders.'),
  90
from public.daily_plans p
cross join generate_series(1, least(p.duration_days, 30)) as d(day_n)
cross join (values
  ('beginner', 'Beginner'),
  ('intermediate', 'Intermediate'),
  ('active', 'Active')
) as lv(level_id, level_label)
left join lateral (
  select el.*
  from public.exercise_library el
  where el.item_type = 'exercise' and coalesce(el.status, 'published') = 'published'
  order by abs(hashtext(p.id || lv.level_id || d.day_n::text)) % 1000, el.id
  limit 1
) lib on true
where p.id like 'activity-%'
  and not exists (
    select 1 from public.daily_plan_items i
    where i.plan_id = p.id and i.day_number = d.day_n
      and i.intensity_level = lv.level_id and i.item_type = 'recovery'
  );
