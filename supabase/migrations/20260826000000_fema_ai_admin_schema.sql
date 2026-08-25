-- Fema AI admin schema
-- Project: fema-ai (toxynqgahykpzsbsmpqz)

create extension if not exists "pgcrypto";

-- Categories (Explore pillars)
create table if not exists public.categories (
  id text primary key,
  title text not null,
  subtitle text,
  description text,
  icon text,
  color text default '#F26BB5',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Courses
create table if not exists public.courses (
  id text primary key,
  category_id text not null references public.categories (id) on delete cascade,
  title text not null,
  short_title text,
  description text,
  icon text,
  color text default '#F26BB5',
  level text default 'All levels',
  equipment text default 'None',
  status text not null default 'draft' check (status in ('draft', 'published')),
  disclaimer text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_category_id_idx on public.courses (category_id);

-- Modules
create table if not exists public.modules (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists modules_course_id_idx on public.modules (course_id);

-- Lessons
create table if not exists public.lessons (
  id text primary key,
  module_id text not null references public.modules (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  duration_minutes int not null default 10,
  video_url text,
  thumbnail_url text,
  upload_key text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_module_id_idx on public.lessons (module_id);
create index if not exists lessons_course_id_idx on public.lessons (course_id);

-- Subscription plans
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_monthly numeric(10, 2) not null default 0,
  price_label text not null default '$0',
  description text,
  features jsonb not null default '[]'::jsonb,
  highlighted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- App members (mobile users managed by admin)
create table if not exists public.members (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null unique,
  goal text,
  fitness_level text,
  environment text,
  plan_id text references public.plans (id) on delete set null,
  journey_day int not null default 1,
  streak int not null default 0,
  level int not null default 1,
  points int not null default 0,
  cycle_phase text default 'none',
  cycle_day int not null default 0,
  is_pregnant boolean not null default false,
  pregnancy_week int not null default 0,
  status text not null default 'active' check (status in ('active', 'suspended')),
  completed_lessons int not null default 0,
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_plan_id_idx on public.members (plan_id);
create index if not exists members_status_idx on public.members (status);

-- Member subscriptions
create table if not exists public.subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.members (id) on delete cascade,
  plan_id text not null references public.plans (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'trial', 'cancelled')),
  renew_date date,
  started_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);

-- Push / in-app notifications composed by admin
create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text not null,
  audience text not null default 'all',
  status text not null default 'draft' check (status in ('draft', 'sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- App settings (single-row style, keyed)
create table if not exists public.app_settings (
  id text primary key default 'default',
  app_name text not null default 'Fema AI',
  tagline text,
  primary_color text default '#F26BB5',
  feature_flags jsonb not null default '{}'::jsonb,
  admin_email text,
  updated_at timestamptz not null default now()
);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at before update on public.modules
for each row execute function public.set_updated_at();

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
for each row execute function public.set_updated_at();

-- Seed plans + settings
insert into public.plans (id, name, price_monthly, price_label, description, features, highlighted)
values
  (
    'free',
    'Free',
    0,
    '$0',
    'Explore curated lessons and start your journey.',
    '["Access to selected free lessons","Daily mission basics","Progress tracking","Community tips"]'::jsonb,
    false
  ),
  (
    'premium',
    'Premium',
    14.99,
    '$14.99/mo',
    'Unlock full video library, journeys, and coaching tools.',
    '["Full Safety & Fitness libraries","Pregnancy, Cycle & Nutrition paths","Meal Scanner & Planner","Priority Coach support","Premium journeys & badges"]'::jsonb,
    true
  )
on conflict (id) do nothing;

insert into public.app_settings (id, app_name, tagline, primary_color, feature_flags, admin_email)
values (
  'default',
  'Fema AI',
  'Women''s Transformation Platform',
  '#F26BB5',
  '{"mealScanner":true,"mealPlanner":true,"coachChat":true,"pregnancyContent":false,"pushNotifications":true}'::jsonb,
  'admin@fema.ai'
)
on conflict (id) do nothing;

-- Dev-friendly RLS: enable + allow authenticated/anon full access for admin prototype
-- Tighten before production.
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.plans enable row level security;
alter table public.members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "public read write categories" on public.categories;
create policy "public read write categories" on public.categories for all using (true) with check (true);

drop policy if exists "public read write courses" on public.courses;
create policy "public read write courses" on public.courses for all using (true) with check (true);

drop policy if exists "public read write modules" on public.modules;
create policy "public read write modules" on public.modules for all using (true) with check (true);

drop policy if exists "public read write lessons" on public.lessons;
create policy "public read write lessons" on public.lessons for all using (true) with check (true);

drop policy if exists "public read write plans" on public.plans;
create policy "public read write plans" on public.plans for all using (true) with check (true);

drop policy if exists "public read write members" on public.members;
create policy "public read write members" on public.members for all using (true) with check (true);

drop policy if exists "public read write subscriptions" on public.subscriptions;
create policy "public read write subscriptions" on public.subscriptions for all using (true) with check (true);

drop policy if exists "public read write notifications" on public.notifications;
create policy "public read write notifications" on public.notifications for all using (true) with check (true);

drop policy if exists "public read write app_settings" on public.app_settings;
create policy "public read write app_settings" on public.app_settings for all using (true) with check (true);
