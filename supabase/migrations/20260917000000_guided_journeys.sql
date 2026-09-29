-- Guided Journeys: admin-curated collections of courses shown on the app home/explore screens.

create table if not exists public.journeys (
  id text primary key,
  title text not null,
  eyebrow text default '',
  detail text,
  image_url text,
  color_start text default '#1B6B67',
  color_end text default '#012E2D',
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_courses (
  journey_id text not null references public.journeys (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  sort_order int not null default 0,
  primary key (journey_id, course_id)
);

create index if not exists journey_courses_journey_id_idx on public.journey_courses (journey_id);
create index if not exists journey_courses_course_id_idx on public.journey_courses (course_id);

drop trigger if exists journeys_set_updated_at on public.journeys;
create trigger journeys_set_updated_at before update on public.journeys
for each row execute function public.set_updated_at();

alter table public.journeys enable row level security;
alter table public.journey_courses enable row level security;

drop policy if exists "public read write journeys" on public.journeys;
create policy "public read write journeys" on public.journeys for all using (true) with check (true);

drop policy if exists "public read write journey_courses" on public.journey_courses;
create policy "public read write journey_courses" on public.journey_courses for all using (true) with check (true);

-- Default journeys (mirrors the previous hardcoded Explore screen cards)
insert into public.journeys (id, title, eyebrow, detail, image_url, color_start, color_end, status, sort_order)
values
  (
    'new-mom',
    'New Mom Recovery',
    'RECOVERY',
    'Postpartum + Nutrition + Yoga',
    'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&q=80',
    '#D07258',
    '#E8A15C',
    'published',
    0
  ),
  (
    'confidence-safety',
    'Confidence & Safety',
    'ACTIVE JOURNEY',
    'Self Defence courses',
    'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800&q=80',
    '#1B6B67',
    '#012E2D',
    'published',
    1
  ),
  (
    'fat-loss',
    'Fitness Library',
    'FITNESS',
    'Strength, cardio, yoga & more',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    '#0B3D3B',
    '#012E2D',
    'published',
    2
  ),
  (
    'cycle-aligned',
    'Cycle-Aligned Living',
    'LIFESTYLE',
    'Cycle, pregnancy & health paths',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    '#4F93A3',
    '#1B6B67',
    'published',
    3
  )
on conflict (id) do nothing;

insert into public.journey_courses (journey_id, course_id, sort_order)
select v.journey_id, v.course_id, v.sort_order
from (
  values
    ('new-mom', 'cph-postpartum', 0),
    ('new-mom', 'cph-recovery-wellness', 1),
    ('confidence-safety', 'sd-foundations', 0),
    ('confidence-safety', 'sd-boxing', 1),
    ('confidence-safety', 'sd-jiu-jitsu', 2),
    ('confidence-safety', 'sd-taekwondo', 3),
    ('confidence-safety', 'sd-karate', 4),
    ('confidence-safety', 'sd-mma', 5),
    ('fat-loss', 'fit-foundations', 0),
    ('fat-loss', 'fit-strength', 1),
    ('fat-loss', 'fit-cardio', 2),
    ('fat-loss', 'fit-hiit', 3),
    ('fat-loss', 'fit-yoga', 4),
    ('fat-loss', 'fit-pilates', 5),
    ('fat-loss', 'fit-core', 6),
    ('fat-loss', 'fit-mobility', 7),
    ('fat-loss', 'fit-weight-loss', 8),
    ('fat-loss', 'fit-endurance', 9),
    ('cycle-aligned', 'cph-menstrual-cycle', 0),
    ('cycle-aligned', 'cph-pregnancy', 1),
    ('cycle-aligned', 'cph-postpartum', 2),
    ('cycle-aligned', 'cph-recovery-wellness', 3)
) as v(journey_id, course_id, sort_order)
where exists (select 1 from public.courses c where c.id = v.course_id)
on conflict (journey_id, course_id) do nothing;
