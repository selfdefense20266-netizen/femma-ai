-- Spread existing recovery rows across stretch types (per plan + level)
with ranked as (
  select
    id,
    row_number() over (partition by plan_id, intensity_level order by sort_order, id) as rn
  from public.daily_plan_items
  where item_type = 'recovery'
)
update public.daily_plan_items dpi
set recovery_type = case (ranked.rn % 4)
  when 1 then 'full-body'
  when 2 then 'upper-body'
  when 3 then 'lower-body'
  else 'breath'
end
from ranked
where dpi.id = ranked.id;
