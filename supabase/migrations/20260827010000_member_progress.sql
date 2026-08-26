-- Cloud-backed app progress so reinstall/login restores member state
create table if not exists public.member_progress (
  member_id text primary key references public.members (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  completed_lesson_ids jsonb not null default '[]'::jsonb,
  lesson_watch_progress jsonb not null default '{}'::jsonb,
  saved_course_ids jsonb not null default '[]'::jsonb,
  last_viewed_lesson_id text,
  daily_missions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists member_progress_updated_at_idx
  on public.member_progress (updated_at desc);

alter table public.member_progress enable row level security;

drop policy if exists "member progress own row" on public.member_progress;
create policy "member progress own row" on public.member_progress
  for all
  using (
    auth.uid()::text = member_id
    or exists (
      select 1 from public.members m
      where m.id = member_progress.member_id
        and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    auth.uid()::text = member_id
    or exists (
      select 1 from public.members m
      where m.id = member_progress.member_id
        and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
