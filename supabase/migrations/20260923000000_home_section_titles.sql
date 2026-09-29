-- Admin-editable Today home section headings (Today Tasks / Recovery / Food)

alter table public.app_settings
  add column if not exists today_tasks_title text not null default 'Today Tasks',
  add column if not exists recovery_title text not null default 'Recovery',
  add column if not exists food_title text not null default 'Food';

update public.app_settings
set
  today_tasks_title = coalesce(nullif(trim(today_tasks_title), ''), 'Today Tasks'),
  recovery_title = coalesce(nullif(trim(recovery_title), ''), 'Recovery'),
  food_title = coalesce(nullif(trim(food_title), ''), 'Food')
where id = 'default';
