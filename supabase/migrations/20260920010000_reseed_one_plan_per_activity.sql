-- Wipe combo-era plans and seed ONE plan per activity (1–30 days),
-- with Beginner / Intermediate / Active exercises on every day.

-- Ensure per-item intensity exists
alter table public.daily_plan_items
  add column if not exists intensity_level text not null default 'beginner';

alter table public.daily_plan_items drop constraint if exists daily_plan_items_intensity_level_check;
alter table public.daily_plan_items
  add constraint daily_plan_items_intensity_level_check
  check (intensity_level in ('beginner', 'intermediate', 'active'));

create index if not exists daily_plan_items_intensity_idx
  on public.daily_plan_items (plan_id, day_number, intensity_level);

-- Relax plan constraints from the months/session model
alter table public.daily_plans drop constraint if exists daily_plans_plan_months_check;
alter table public.daily_plans drop constraint if exists daily_plans_session_minutes_check;
alter table public.daily_plans drop constraint if exists daily_plans_duration_days_check;

-- Clear ALL old combo + sample plans so admin list shows only activity plans
delete from public.daily_plans where id like 'plan-%';
delete from public.daily_plans where id in ('yoga-daily');
-- Also clear any leftover activity-* from a prior run of this migration
delete from public.daily_plans where id like 'activity-%';

alter table public.daily_plans
  add constraint daily_plans_duration_days_check
  check (duration_days >= 1 and duration_days <= 30);

do $$
declare
  cats text[][] := array[
    array['yoga', 'Yoga'],
    array['flexibility', 'Flexibility'],
    array['pilates', 'Pilates'],
    array['boxing', 'Boxing'],
    array['mma', 'MMA'],
    array['self-defense', 'Self defense'],
    array['weight-loss', 'Weight loss'],
    array['muscle', 'Muscle'],
    array['hiit', 'HIIT'],
    array['cardio', 'Cardio'],
    array['pregnancy', 'Pregnancy'],
    array['postpartum', 'Postpartum'],
    array['stress', 'Stress relief'],
    array['recovery', 'Recovery'],
    array['general', 'General fitness']
  ];
  intensities text[][] := array[
    array['beginner', 'Beginner', '5'],
    array['intermediate', 'Intermediate', '10'],
    array['active', 'Active', '15']
  ];
  cat text[];
  inten text[];
  plan_id text;
  plan_title text;
  plan_desc text;
  sort_i int := 0;
  days int := 30;
  day_n int;
  slot int;
  lib record;
  lib_count int;
  pick_offset int;
  mins_each int;
  item_id text;
  prefs text[];
begin
  select count(*)::int into lib_count
    from public.exercise_library
    where item_type = 'exercise' and coalesce(status, 'published') = 'published';

  if lib_count < 5 then
    raise exception 'Need at least 5 published exercises in exercise_library';
  end if;

  foreach cat slice 1 in array cats loop
    plan_id := format('activity-%s', cat[1]);
    plan_title := format('%s Plan', cat[2]);
    plan_desc := format(
      '30-day %s plan. Exercises and durations set separately for Beginner, Intermediate, and Active.',
      lower(cat[2])
    );

    insert into public.daily_plans (
      id, title, description, user_type, status, sort_order,
      plan_months, intensity_level, session_minutes, duration_days
    ) values (
      plan_id, plan_title, plan_desc, cat[1], 'published', sort_i,
      1, 'beginner', 20, days
    )
    on conflict (id) do update set
      title = excluded.title,
      description = excluded.description,
      user_type = excluded.user_type,
      status = 'published',
      sort_order = excluded.sort_order,
      plan_months = 1,
      intensity_level = 'beginner',
      session_minutes = 20,
      duration_days = excluded.duration_days,
      updated_at = now();

    prefs := case cat[1]
      when 'yoga' then array['flexibility', 'pregnancy', 'tone', 'confidence']
      when 'flexibility' then array['flexibility', 'pregnancy', 'tone']
      when 'pilates' then array['tone', 'flexibility', 'muscle']
      when 'boxing' then array['boxing', 'karate', 'hiit']
      when 'mma' then array['karate', 'boxing', 'hiit', 'muscle']
      when 'self-defense' then array['karate', 'boxing', 'confidence', 'hiit']
      when 'weight-loss' then array['weight loss', 'hiit', 'cardio', 'tone']
      when 'muscle' then array['muscle', 'tone', 'hiit']
      when 'hiit' then array['hiit', 'weight loss', 'tone']
      when 'cardio' then array['weight loss', 'hiit', 'boxing']
      when 'pregnancy' then array['pregnancy', 'flexibility', 'confidence']
      when 'postpartum' then array['pregnancy', 'flexibility', 'tone', 'confidence']
      when 'stress' then array['flexibility', 'confidence', 'pregnancy']
      when 'recovery' then array['flexibility', 'pregnancy', 'confidence']
      when 'general' then array['weight loss', 'tone', 'hiit', 'muscle', 'flexibility']
      else array['hiit', 'tone', 'muscle', 'flexibility', 'weight loss']
    end;

    pick_offset := abs(hashtext(plan_id)) % lib_count;

    foreach inten slice 1 in array intensities loop
      mins_each := inten[3]::int;

      for day_n in 1..days loop
        for slot in 0..4 loop
          select e.* into lib
          from (
            select
              el.*,
              row_number() over (
                order by
                  case when lower(coalesce(el.subtitle, '')) = any (prefs) then 0 else 1 end,
                  el.sort_order,
                  el.id
              ) - 1 as rn
            from public.exercise_library el
            where el.item_type = 'exercise'
              and coalesce(el.status, 'published') = 'published'
          ) e
          where e.rn = (pick_offset + (day_n - 1) * 5 + slot + (case inten[1]
            when 'beginner' then 0
            when 'intermediate' then 2
            else 4
          end)) % lib_count;

          item_id := format('%s-d%s-%s-s%s', plan_id, day_n, inten[1], slot);

          insert into public.daily_plan_items (
            id, plan_id, day_number, intensity_level, item_type, title, tag, subtitle,
            scheduled_time, duration_minutes, rest_minutes, media_url, cue, sort_order
          ) values (
            item_id,
            plan_id,
            day_n,
            inten[1],
            'exercise',
            lib.title,
            inten[2] || ' · Guided',
            coalesce(nullif(lib.subtitle, ''), cat[2]),
            '',
            mins_each,
            1,
            lib.media_url,
            coalesce(nullif(lib.cue, ''), 'Move with control. Keep form steady.'),
            slot
          );
        end loop;
      end loop;
    end loop;

    sort_i := sort_i + 1;
  end loop;
end $$;
