/**
 * Generate + apply daily plans for every:
 * category × intensity (beginner/intermediate/active) × session (15/20/30) × months (1/2/3)
 */
const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  { id: 'all', label: 'All users' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'flexibility', label: 'Flexibility' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'mma', label: 'MMA' },
  { id: 'self-defense', label: 'Self defense' },
  { id: 'weight-loss', label: 'Weight loss' },
  { id: 'muscle', label: 'Muscle' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'postpartum', label: 'Postpartum' },
  { id: 'stress', label: 'Stress relief' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'general', label: 'General fitness' }
];

const INTENSITIES = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'active', label: 'Active' }
];

const SESSIONS = [15, 20, 30];
const MONTHS = [{ months: 1, days: 30 }];
// 1 exercise per day keeps the seed size reasonable while covering every combo
const EXERCISES_PER_DAY = 1;

// 30 seeded library exercises
const LIB = Array.from({ length: 30 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    id: `lib-seed-${n}`,
    titles: [
      'Shadowboxing Round',
      'Squat Pulses',
      '90/90 Hip Switches',
      'Butterfly Stretch',
      'Reverse Lunges',
      'Bike Bursts',
      'Back Extension',
      'Book Rows',
      'Bag Front Kicks',
      'Balance Holds',
      'Band Rows',
      'Goblet Squat',
      'Battle Rope Slams',
      'Floor Press',
      'March in Place',
      'Bulgarian Split Squat',
      'Burpees',
      'Cable Kickbacks',
      'Cable Woodchops',
      'Ankle Rocks',
      'Dead Bug Core',
      'Curtsy Lunges',
      'Dumbbell Thrusters',
      'Fat-Burn Walk',
      'Mountain Climbers',
      'Forearm Plank',
      'Hamstring Fold',
      'Hip Flexor Stretch',
      'Hip Thrust',
      'Incline Walk'
    ][i],
    media: null // filled from DB at apply time — keep placeholder, items use library join via media lookup in SQL
  };
});

const MEDIA = [
  'hoXt6wv',
  '75Bgtjy',
  'u0cNiij',
  '0mB6wHO',
  'kMzUs9Y',
  'H1PESYI',
  'rUXfn3R',
  'fUBheHs',
  '0br45wL',
  '01qpYSe',
  'TFqbd8t',
  'yn8yg1r',
  'oHg8eop',
  'EIeI8Vf',
  'ealLwvX',
  '9E25EOx',
  'dK9394r',
  'HEJ6DIX',
  '9pa4H5m',
  'm0tCHqc',
  'iny3m5y',
  'gUjqdei',
  'yWxMvB5',
  'qPEzJjA',
  'RJgzwny',
  'hCjGsRQ',
  '99rWm7w',
  'tFGKm99',
  'Pjbc0Kt',
  'rjiM4L3'
].map((id) => `https://static.exercisedb.dev/media/${id}.gif`);

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const plans = [];
const items = [];
let sortOrder = 0;

for (const cat of CATEGORIES) {
  for (const intensity of INTENSITIES) {
    for (const session of SESSIONS) {
      for (const { months, days } of MONTHS) {
        const id = `plan-${cat.id}-${intensity.id}-${session}m-${months}mo`;
        const title = `${cat.label} · ${intensity.label} · ${session} min · ${months} mo`;
        const description = `${days}-day ${intensity.label.toLowerCase()} plan for ${cat.label.toLowerCase()} · ${session} min sessions.`;

        plans.push(
          `  ('${id}', '${esc(title)}', '${esc(description)}', '${cat.id}', 'published', ${sortOrder}, ${months}, '${intensity.id}', ${session}, ${days})`
        );

        // Rotate library exercises across days
        for (let day = 1; day <= days; day += 1) {
          for (let slot = 0; slot < EXERCISES_PER_DAY; slot += 1) {
            const libIdx = (day - 1 + slot + sortOrder) % 30;
            const lib = LIB[libIdx];
            const media = MEDIA[libIdx];
            const itemId = `${id}-d${day}-s${slot}`;
            const mins = session;
            items.push(
              `  ('${itemId}', '${id}', ${day}, 'exercise', '${esc(lib.titles)}', '${esc(intensity.label)} · Guided', '${esc(cat.label)}', '', ${mins}, 2, '${media}', 'Move with control. Match the ${session} min session pace.', ${slot})`
            );
          }
        }
        sortOrder += 1;
      }
    }
  }
}

const sql = `-- Seed plans for every category × intensity × session × month length
-- Intensities: beginner, intermediate, active
-- Sessions: 15, 20, 30 min
-- Lengths: 1 / 2 / 3 months (30 / 60 / 90 days)

-- Relax / update intensity constraint
alter table public.daily_plans drop constraint if exists daily_plans_intensity_level_check;
update public.daily_plans set intensity_level = 'beginner' where intensity_level in ('easy');
update public.daily_plans set intensity_level = 'active' where intensity_level in ('advanced');
alter table public.daily_plans
  add constraint daily_plans_intensity_level_check
  check (intensity_level in ('beginner', 'intermediate', 'active'));

insert into public.daily_plans (
  id, title, description, user_type, status, sort_order,
  plan_months, intensity_level, session_minutes, duration_days
)
values
${plans.join(',\n')}
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  user_type = excluded.user_type,
  status = excluded.status,
  sort_order = excluded.sort_order,
  plan_months = excluded.plan_months,
  intensity_level = excluded.intensity_level,
  session_minutes = excluded.session_minutes,
  duration_days = excluded.duration_days,
  updated_at = now();

-- Replace items for seeded combo plans only
delete from public.daily_plan_items
where plan_id like 'plan-%-%-%m-%mo';

insert into public.daily_plan_items (
  id, plan_id, day_number, item_type, title, tag, subtitle, scheduled_time,
  duration_minutes, rest_minutes, media_url, cue, sort_order
)
values
${items.join(',\n')};
`;

const outPath = path.join(__dirname, '../supabase/migrations/20260919050000_seed_combo_daily_plans.sql');
fs.writeFileSync(outPath, sql);
console.log('plans', plans.length);
console.log('items', items.length);
console.log('wrote', outPath);
console.log('size_mb', (Buffer.byteLength(sql) / 1024 / 1024).toFixed(2));
