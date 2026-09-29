-- Expand session lengths + reseed every category × intensity × session × month
-- with 5 relevant exercises on every day.

alter table public.daily_plans drop constraint if exists daily_plans_session_minutes_check;
alter table public.daily_plans
  add constraint daily_plans_session_minutes_check
  check (session_minutes in (15, 20, 30, 45, 60));

-- Clear previous combo seeds
delete from public.daily_plan_items where plan_id like 'plan-%';
delete from public.daily_plans where id like 'plan-%';

do $$
declare
  cats text[][] := array[
    array['all', 'All users'],
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
    array['beginner', 'Beginner'],
    array['intermediate', 'Intermediate'],
    array['active', 'Active']
  ];
  sessions int[] := array[15, 20, 30, 45, 60];
  month_days int[][] := array[array[1, 30], array[2, 60], array[3, 90]];
  cat text[];
  inten text[];
  sess int;
  md int[];
  plan_id text;
  plan_title text;
  plan_desc text;
  sort_i int := 0;
  days int;
  months int;
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
    foreach inten slice 1 in array intensities loop
      foreach sess in array sessions loop
        foreach md slice 1 in array month_days loop
          months := md[1];
          days := md[2];
          plan_id := format('plan-%s-%s-%sm-%smo', cat[1], inten[1], sess, months);
          plan_title := format('%s · %s · %s min · %s mo', cat[2], inten[2], sess, months);
          plan_desc := format(
            '%s-day %s plan for %s · %s min sessions · 5 exercises per day.',
            days, lower(inten[2]), lower(cat[2]), sess
          );

          insert into public.daily_plans (
            id, title, description, user_type, status, sort_order,
            plan_months, intensity_level, session_minutes, duration_days
          ) values (
            plan_id, plan_title, plan_desc, cat[1], 'published', sort_i,
            months, inten[1], sess, days
          )
          on conflict (id) do update set
            title = excluded.title,
            description = excluded.description,
            user_type = excluded.user_type,
            status = 'published',
            sort_order = excluded.sort_order,
            plan_months = excluded.plan_months,
            intensity_level = excluded.intensity_level,
            session_minutes = excluded.session_minutes,
            duration_days = excluded.duration_days,
            updated_at = now();

          -- Preferred library subtitles per audience (relevant exercises first)
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
          mins_each := greatest(3, round(sess::numeric / 5.0)::int);

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
              where e.rn = (pick_offset + (day_n - 1) * 5 + slot) % lib_count;

              item_id := format('%s-d%s-s%s', plan_id, day_n, slot);

              insert into public.daily_plan_items (
                id, plan_id, day_number, item_type, title, tag, subtitle,
                scheduled_time, duration_minutes, rest_minutes, media_url, cue, sort_order
              ) values (
                item_id,
                plan_id,
                day_n,
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

          sort_i := sort_i + 1;
        end loop;
      end loop;
    end loop;
  end loop;
end $$;
