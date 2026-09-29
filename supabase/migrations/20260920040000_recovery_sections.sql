-- Admin-managed Recovery sections (cover image + exercises)

create table if not exists public.recovery_sections (
  id text primary key,
  title text not null,
  section_key text not null default 'stretch',
  is_rest boolean not null default false,
  cover_url text,
  status text not null default 'published' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recovery_section_items (
  id text primary key,
  section_id text not null references public.recovery_sections (id) on delete cascade,
  intensity_level text not null default 'beginner'
    check (intensity_level in ('beginner', 'intermediate', 'active')),
  title text not null,
  duration_minutes int not null default 10,
  rest_minutes int not null default 0,
  media_url text,
  cue text default '',
  steps jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recovery_sections_status_idx on public.recovery_sections (status, sort_order);
create index if not exists recovery_section_items_section_idx
  on public.recovery_section_items (section_id, intensity_level, sort_order);

alter table public.recovery_sections enable row level security;
alter table public.recovery_section_items enable row level security;

drop policy if exists "public read write recovery_sections" on public.recovery_sections;
create policy "public read write recovery_sections" on public.recovery_sections for all using (true) with check (true);

drop policy if exists "public read write recovery_section_items" on public.recovery_section_items;
create policy "public read write recovery_section_items" on public.recovery_section_items for all using (true) with check (true);

drop trigger if exists recovery_sections_set_updated_at on public.recovery_sections;
create trigger recovery_sections_set_updated_at before update on public.recovery_sections
for each row execute function public.set_updated_at();

drop trigger if exists recovery_section_items_set_updated_at on public.recovery_section_items;
create trigger recovery_section_items_set_updated_at before update on public.recovery_section_items
for each row execute function public.set_updated_at();

insert into public.recovery_sections (id, title, section_key, is_rest, cover_url, status, sort_order)
values
  (
    'rec-rest',
    'Rest',
    'rest',
    true,
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80',
    'published',
    0
  ),
  (
    'rec-full-body',
    'Full Body Stretch',
    'full-body',
    false,
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',
    'published',
    1
  ),
  (
    'rec-upper-body',
    'Upper Body Stretch',
    'upper-body',
    false,
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80',
    'published',
    2
  ),
  (
    'rec-lower-body',
    'Lower Body Stretch',
    'lower-body',
    false,
    'https://images.unsplash.com/photo-1599058945522-28d584b6f14d?w=900&q=80',
    'published',
    3
  ),
  (
    'rec-breath',
    'Breath & Calm',
    'breath',
    false,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&q=80',
    'published',
    4
  )
on conflict (id) do update set
  title = excluded.title,
  cover_url = coalesce(nullif(public.recovery_sections.cover_url, ''), excluded.cover_url),
  status = 'published';

-- Seed a few starter moves from exercise_library into stretch sections (all levels)
insert into public.recovery_section_items (
  id, section_id, intensity_level, title, duration_minutes, rest_minutes, media_url, cue, steps, sort_order
)
select
  format('%s-%s-%s', s.id, lv.level_id, el.id),
  s.id,
  lv.level_id,
  el.title,
  greatest(5, least(15, coalesce(el.duration_minutes, 8))),
  coalesce(el.rest_minutes, 0),
  el.media_url,
  coalesce(el.cue, 'Move slowly. Breathe steadily.'),
  coalesce(el.steps, '[]'::jsonb),
  (row_number() over (partition by s.id, lv.level_id order by el.sort_order, el.id) - 1)
from public.recovery_sections s
cross join (values ('beginner'), ('intermediate'), ('active')) as lv(level_id)
cross join lateral (
  select *
  from public.exercise_library el
  where el.item_type = 'exercise' and coalesce(el.status, 'published') = 'published'
  order by el.sort_order, el.id
  limit 6
) el
where s.is_rest = false
on conflict (id) do nothing;
