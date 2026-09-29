-- Program cards on Today home (admin creates card → assigns course → tap opens course)

create table if not exists public.program_cards (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  image_url text,
  course_id text not null references public.courses (id) on delete cascade,
  status text not null default 'published' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_cards_status_idx on public.program_cards (status, sort_order);
create index if not exists program_cards_course_idx on public.program_cards (course_id);

alter table public.program_cards enable row level security;

drop policy if exists "public read write program_cards" on public.program_cards;
create policy "public read write program_cards" on public.program_cards for all using (true) with check (true);

drop trigger if exists program_cards_set_updated_at on public.program_cards;
create trigger program_cards_set_updated_at before update on public.program_cards
for each row execute function public.set_updated_at();

alter table public.app_settings
  add column if not exists program_title text not null default 'Program';

update public.app_settings
set program_title = coalesce(nullif(trim(program_title), ''), 'Program')
where id = 'default';
