-- Lock down Row Level Security.
--
-- Before this migration nearly every table had `for all using (true) with check (true)`
-- and the `thumbnails` bucket allowed anonymous upload/update/delete. Anyone holding the
-- public anon key could dump members, edit content, grant themselves premium, etc.
--
-- Policy model after this migration:
--   * Content/catalog tables ........ read: anon + authenticated; write: public.is_admin() only
--   * notifications ................. read: anon + authenticated; write: admin only
--   * members ....................... own row (id = auth.uid() or email = JWT email) + admin;
--                                     no anon; plan_id/status/id/email are server/admin-managed
--   * subscriptions ................. read own + admin; writes admin/service_role only
--   * member_plans / member_diet_plans / member_progress
--                                     own rows (via public.owns_member) + admin
--   * storage bucket `thumbnails` ... public read; insert/update/delete admin only
--   * service_role (edge functions, webhooks) bypasses RLS as before.
--
-- Idempotent: every pre-existing policy on the affected tables is dropped and recreated,
-- and tables that may be missing on the live DB are created with `if not exists`.

-- ---------------------------------------------------------------------------
-- 0. Make sure tables that the live DB may lack exist (mirrors earlier migrations)
-- ---------------------------------------------------------------------------

-- 20260829010000_member_plans + 20260829020000 + 20260829030000
create table if not exists public.member_plans (
  id text primary key,
  member_id text not null references public.members (id) on delete cascade,
  plan_name text,
  goal text,
  duration_weeks int not null default 8,
  food_preference text,
  fitness_level text,
  environment text,
  course_ids jsonb not null default '[]'::jsonb,
  course_names jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed')),
  performance jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_plans add column if not exists watch_courses jsonb not null default '[]'::jsonb;
alter table public.member_plans add column if not exists schedule jsonb not null default '[]'::jsonb;
alter table public.member_plans add column if not exists generated_by text;
create index if not exists member_plans_member_id_idx on public.member_plans (member_id);
alter table public.members add column if not exists food_preference text;

-- 20260827010000_member_progress + 20260827020000_coach_chat_history
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
alter table public.member_progress add column if not exists coach_chat_history jsonb not null default '[]'::jsonb;
create index if not exists member_progress_updated_at_idx on public.member_progress (updated_at desc);

-- 20261003120000_member_diet_plans
create table if not exists public.member_diet_plans (
  member_id text primary key references public.members (id) on delete cascade,
  goal text,
  fitness_level text,
  food_preference text,
  height_cm numeric,
  weight_kg numeric,
  calorie_target int,
  bmi numeric,
  fingerprint text,
  days jsonb not null default '[]'::jsonb,
  source text not null default 'ai',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_diet_plans_updated_at_idx on public.member_diet_plans (updated_at desc);

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

-- is_admin() is defined in 20260826010000_admin_users.sql; re-declared here unchanged so
-- this migration is self-sufficient.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active = true
  );
$$;

-- True when the given members.id belongs to the calling auth user (by auth uid or by JWT
-- email, which covers legacy rows whose id is 'member-<ts>'). SECURITY DEFINER so policies
-- on child tables can look at members without recursing through members' own RLS.
create or replace function public.owns_member(p_member_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_member_id is not null
    and (
      p_member_id = auth.uid()::text
      or exists (
        select 1
        from public.members m
        where m.id = p_member_id
          and (
            m.id = auth.uid()::text
            or (
              coalesce(auth.jwt() ->> 'email', '') <> ''
              and lower(m.email) = lower(auth.jwt() ->> 'email')
            )
          )
      )
    );
$$;

revoke all on function public.owns_member(text) from public;
grant execute on function public.owns_member(text) to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Drops every policy on a table (removes the old permissive ones and any created by hand).
create or replace function public._lockdown_drop_all_policies(p_table text)
returns void
language plpgsql
as $$
declare
  r record;
begin
  if to_regclass('public.' || p_table) is null then
    return;
  end if;
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = p_table
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, p_table);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Content / catalog tables: public read, admin write
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'courses', 'modules', 'lessons', 'plans',
    'journeys', 'journey_courses',
    'daily_plans', 'daily_plan_items',
    'exercise_library', 'exercise_roadmap',
    'recovery_sections', 'recovery_section_items',
    'program_cards', 'app_settings', 'notifications'
  ]
  loop
    if to_regclass('public.' || t) is null then
      raise notice 'lock_down_rls: table public.% does not exist, skipping', t;
      continue;
    end if;

    perform public._lockdown_drop_all_policies(t);
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || ' public read', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_admin())',
      t || ' admin insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || ' admin update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t || ' admin delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. members: own row + admin; no anon
-- ---------------------------------------------------------------------------
select public._lockdown_drop_all_policies('members');
alter table public.members enable row level security;

create policy "members select own" on public.members
  for select to authenticated
  using (
    id = auth.uid()::text
    or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "members insert own" on public.members
  for insert to authenticated
  with check (
    id = auth.uid()::text
    or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "members update own" on public.members
  for update to authenticated
  using (
    id = auth.uid()::text
    or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(email) = lower(auth.jwt() ->> 'email'))
  )
  with check (
    id = auth.uid()::text
    or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "members admin all" on public.members
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members cannot grant themselves premium, un-suspend themselves, or re-key their row.
-- plan_id / status are managed by admins and by service-role edge functions
-- (revenuecat-webhook, app-signup). Changes from anon/authenticated non-admins are
-- silently reverted so the app's other column updates still succeed.
create or replace function public.members_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_claim_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  -- Only requests coming through PostgREST as anon/authenticated are restricted.
  -- service_role, postgres (migrations / SQL editor) and SECURITY DEFINER functions
  -- such as handle_new_member() run as other roles and pass through.
  if current_user not in ('anon', 'authenticated') or v_claim_role = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan_id := null;
    new.status := 'active';
  elsif tg_op = 'UPDATE' then
    new.plan_id := old.plan_id;
    new.status := old.status;
    new.id := old.id;
    new.email := old.email;
  end if;

  return new;
end;
$$;

drop trigger if exists members_guard_privileged_columns on public.members;
create trigger members_guard_privileged_columns
  before insert or update on public.members
  for each row execute function public.members_guard_privileged_columns();

-- ---------------------------------------------------------------------------
-- 4. subscriptions: read own + admin; no member writes (RevenueCat webhook = service role)
-- ---------------------------------------------------------------------------
select public._lockdown_drop_all_policies('subscriptions');
alter table public.subscriptions enable row level security;

create policy "subscriptions select own" on public.subscriptions
  for select to authenticated
  using (public.owns_member(user_id));

create policy "subscriptions admin all" on public.subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Per-member data: own rows + admin
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['member_plans', 'member_diet_plans', 'member_progress']
  loop
    perform public._lockdown_drop_all_policies(t);
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.owns_member(member_id)) with check (public.owns_member(member_id))',
      t || ' own rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || ' admin all', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Storage: thumbnails bucket public read, admin-only writes
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Drop the known permissive policies plus any other policy scoped to this bucket.
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname in (
          'Public read thumbnails', 'Public upload thumbnails', 'Public insert thumbnails',
          'Public update thumbnails', 'Public delete thumbnails'
        )
        or coalesce(qual, '') like '%thumbnails%'
        or coalesce(with_check, '') like '%thumbnails%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end;
$$;

create policy "Public read thumbnails"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'thumbnails');

create policy "Admin insert thumbnails"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'thumbnails' and public.is_admin());

create policy "Admin update thumbnails"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'thumbnails' and public.is_admin())
  with check (bucket_id = 'thumbnails' and public.is_admin());

create policy "Admin delete thumbnails"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'thumbnails' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Cleanup migration-only helper
-- ---------------------------------------------------------------------------
drop function if exists public._lockdown_drop_all_policies(text);
