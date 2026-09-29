-- Admin-curated daily plans that drive Today Tasks / Recovery / Food carousels.

create table if not exists public.daily_plans (
  id text primary key,
  title text not null,
  description text default '',
  user_type text not null default 'all',
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_plan_items (
  id text primary key,
  plan_id text not null references public.daily_plans (id) on delete cascade,
  item_type text not null check (item_type in ('exercise', 'rest', 'recovery', 'food')),
  title text not null,
  tag text default '',
  subtitle text default '',
  scheduled_time text default '',
  duration_minutes int not null default 10,
  rest_minutes int not null default 0,
  media_url text,
  cue text default '',
  steps jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_plan_items_plan_id_idx on public.daily_plan_items (plan_id);
create index if not exists daily_plans_user_type_idx on public.daily_plans (user_type);
create index if not exists daily_plans_status_idx on public.daily_plans (status);

alter table public.members
  add column if not exists daily_plan_id text references public.daily_plans (id) on delete set null;

create index if not exists members_daily_plan_id_idx on public.members (daily_plan_id);

drop trigger if exists daily_plans_set_updated_at on public.daily_plans;
create trigger daily_plans_set_updated_at before update on public.daily_plans
for each row execute function public.set_updated_at();

drop trigger if exists daily_plan_items_set_updated_at on public.daily_plan_items;
create trigger daily_plan_items_set_updated_at before update on public.daily_plan_items
for each row execute function public.set_updated_at();

alter table public.daily_plans enable row level security;
alter table public.daily_plan_items enable row level security;

drop policy if exists "public read write daily_plans" on public.daily_plans;
create policy "public read write daily_plans" on public.daily_plans for all using (true) with check (true);

drop policy if exists "public read write daily_plan_items" on public.daily_plan_items;
create policy "public read write daily_plan_items" on public.daily_plan_items for all using (true) with check (true);

-- Seed: Yoga user sample plan
insert into public.daily_plans (id, title, description, user_type, status, sort_order)
values
  (
    'yoga-daily',
    'Yoga Daily Flow',
    'Exercises, rest, recovery and food suggestions for yoga-focused members.',
    'yoga',
    'published',
    0
  )
on conflict (id) do nothing;

insert into public.daily_plan_items (id, plan_id, item_type, title, tag, subtitle, scheduled_time, duration_minutes, rest_minutes, media_url, cue, sort_order)
values
  (
    'yoga-daily-ex-1',
    'yoga-daily',
    'exercise',
    'Morning Sun Salutation',
    'Yoga • Guided',
    'Warm-up flow',
    '07:00',
    15,
    5,
    'https://static.exercisedb.dev/media/9gbyYKk.gif',
    'Move with your breath. Keep knees soft.',
    0
  ),
  (
    'yoga-daily-rest-1',
    'yoga-daily',
    'rest',
    'Breath Rest',
    'Rest • Recovery',
    'Pause between sets',
    '07:15',
    5,
    0,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    'Sit tall. Inhale 4, exhale 6.',
    1
  ),
  (
    'yoga-daily-ex-2',
    'yoga-daily',
    'exercise',
    'Hip Opener Sequence',
    'Yoga • Mobility',
    'Lower body mobility',
    '07:20',
    12,
    3,
    'https://static.exercisedb.dev/media/3xK09Sk.gif',
    'Never force the stretch — ease into it.',
    2
  ),
  (
    'yoga-daily-rec-1',
    'yoga-daily',
    'recovery',
    'Legs Up the Wall',
    'Recovery • Guided',
    'Nervous system reset',
    '19:00',
    10,
    0,
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    'Elevate legs, soft gaze, slow breath.',
    3
  ),
  (
    'yoga-daily-food-1',
    'yoga-daily',
    'food',
    'Protein Smoothie Bowl',
    'Food • Recipe',
    'Post-practice fuel',
    '08:00',
    10,
    0,
    'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&q=80',
    'Greek yogurt, berries, chia, honey.',
    4
  ),
  (
    'yoga-daily-food-2',
    'yoga-daily',
    'food',
    'Warm Lentil Bowl',
    'Food • Recipe',
    'Evening recovery meal',
    '18:30',
    25,
    0,
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    'Lentils, roasted veg, olive oil, lemon.',
    5
  )
on conflict (id) do nothing;
