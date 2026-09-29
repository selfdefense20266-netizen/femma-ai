-- Exercise media library (create images/exercises first, then assign to plan days)
create table if not exists public.exercise_library (
  id text primary key,
  title text not null,
  item_type text not null default 'exercise' check (item_type in ('exercise', 'rest', 'recovery', 'food')),
  tag text default '',
  subtitle text default '',
  duration_minutes int not null default 10,
  rest_minutes int not null default 0,
  media_url text,
  cue text default '',
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercise_library_type_idx on public.exercise_library (item_type);
create index if not exists exercise_library_status_idx on public.exercise_library (status);

drop trigger if exists exercise_library_set_updated_at on public.exercise_library;
create trigger exercise_library_set_updated_at before update on public.exercise_library
for each row execute function public.set_updated_at();

alter table public.exercise_library enable row level security;
drop policy if exists "public read write exercise_library" on public.exercise_library;
create policy "public read write exercise_library" on public.exercise_library for all using (true) with check (true);

-- Day number on plan items (Day 1, Day 2, ...)
alter table public.daily_plan_items
  add column if not exists day_number int not null default 1;

alter table public.daily_plans
  add column if not exists duration_days int not null default 7;

create index if not exists daily_plan_items_day_number_idx on public.daily_plan_items (plan_id, day_number);

update public.daily_plan_items set day_number = 1 where day_number is null or day_number < 1;

-- Seed a few library entries admins can pick from
insert into public.exercise_library (id, title, item_type, tag, subtitle, duration_minutes, rest_minutes, media_url, cue, sort_order)
values
  ('lib-squat', 'Bodyweight Squats', 'exercise', 'Fitness • Strength', 'Lower body', 12, 4, 'https://static.exercisedb.dev/media/3xK09Sk.gif', 'Feet shoulder-width. Sit back, knees track toes.', 0),
  ('lib-pushup', 'Push-up Strength Set', 'exercise', 'Fitness • Upper', 'Chest & core', 10, 5, 'https://static.exercisedb.dev/media/hoXt6wv.gif', 'Keep a straight line from head to heels.', 1),
  ('lib-shadowbox', '3-minute Shadowboxing', 'exercise', 'Boxing • Cardio', 'Hands up, light feet', 3, 1, 'https://static.exercisedb.dev/media/hoXt6wv.gif', 'Jab-cross rhythm. Stay light on your toes.', 2),
  ('lib-breath', 'Breath Rest', 'rest', 'Rest • Recovery', 'Nervous system reset', 5, 0, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', 'Sit tall. Inhale 4, exhale 6.', 3),
  ('lib-yoga-flow', 'Morning Sun Salutation', 'exercise', 'Yoga • Guided', 'Warm-up flow', 15, 5, 'https://static.exercisedb.dev/media/9gbyYKk.gif', 'Move with your breath. Keep knees soft.', 4),
  ('lib-recovery', 'Legs Up the Wall', 'recovery', 'Recovery • Guided', 'Full unwind', 10, 0, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80', 'Elevate legs, soft gaze, slow breath.', 5),
  ('lib-smoothie', 'Protein Smoothie Bowl', 'food', 'Food • Recipe', 'Post-practice fuel', 10, 0, 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&q=80', 'Greek yogurt, berries, chia, honey.', 6),
  ('lib-salad', 'Grilled Chicken Salad', 'food', 'Food • Recipe', 'Lunch plate', 20, 0, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', 'Lean protein + colorful greens.', 7)
on conflict (id) do nothing;
