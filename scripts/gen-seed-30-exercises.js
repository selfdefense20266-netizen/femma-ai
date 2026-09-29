const fs = require('fs');
const path = require('path');

const mapPath = path.join(
  __dirname,
  '../Femma-AI/artifacts/unstoppable/scripts/.gif-out/data/exerciseGifMap.json'
);
const m = require(mapPath);

const seen = new Set();
const out = [];
for (const e of m.exercises) {
  if (e.gifUrl && !seen.has(e.gifUrl)) {
    seen.add(e.gifUrl);
    out.push(e);
  }
}

const pick = out.slice(0, 30);
const titles = [
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
];

const cues = [
  'Hands up, light feet, jab-cross rhythm.',
  'Stay low. Pulse through the bottom of the squat.',
  'Move slowly. Keep both hips square to the floor.',
  'Breathe into the stretch. Soft knees.',
  'Long stride back. Front knee tracks over toes.',
  'Drive the legs. Easy upper body.',
  'Squeeze glutes at the top. Do not hyperextend.',
  'Pull elbows back. Soften the shoulders.',
  'Hips square. Snap the kick and reset.',
  'Find a still point. Soft gaze.',
  'Pull to ribs. Keep elbows close.',
  'Chest up. Sit between the heels.',
  'Power from the hips. Soft knees.',
  'Wrists stacked. Controlled lower.',
  'Pump the arms. Keep a brisk pace.',
  'Rear foot elevated. Front knee tracks toes.',
  'Chest to floor option or step-back.',
  'Squeeze glute at the top of each rep.',
  'Rotate from the ribs. Soft knees.',
  'Slow circles. Keep weight even.',
  'Press lower back into the floor.',
  'Cross the back leg behind. Tall chest.',
  'Drive up explosively. Soft landing.',
  'Easy conversational pace.',
  'Hips low. Quick feet.',
  'Brace core. Long body line.',
  'Hinge from hips. Soft knees.',
  'Tuck pelvis. Feel the front of the hip open.',
  'Drive through heels. Squeeze at the top.',
  'Slight incline. Steady cadence.'
];

const mins = [8, 10, 12, 10, 12, 8, 10, 10, 8, 6, 10, 12, 8, 10, 15, 12, 10, 10, 10, 8, 8, 10, 10, 20, 8, 5, 10, 8, 12, 15];
const rests = [2, 3, 2, 0, 3, 2, 2, 2, 2, 1, 2, 4, 2, 3, 0, 3, 2, 2, 2, 0, 1, 2, 3, 0, 2, 1, 0, 0, 3, 0];

const esc = (s) => String(s).replace(/'/g, "''");

const lines = pick.map((e, i) => {
  const id = `lib-seed-${String(i + 1).padStart(2, '0')}`;
  const title = titles[i];
  const cat = (e.categories || ['Fitness'])[0].replace(/_/g, ' ');
  const tag = `${cat.charAt(0).toUpperCase()}${cat.slice(1)} • Guided`;
  return `  ('${id}', '${esc(title)}', 'exercise', '${esc(tag)}', '${esc(cat)}', ${mins[i]}, ${rests[i]}, '${e.gifUrl}', '${esc(cues[i])}', ${i})`;
});

const sql = `-- Seed 30 unique exercises with distinct GIFs for Daily Plans library
insert into public.exercise_library (id, title, item_type, tag, subtitle, duration_minutes, rest_minutes, media_url, cue, sort_order)
values
${lines.join(',\n')}
on conflict (id) do update set
  title = excluded.title,
  item_type = excluded.item_type,
  tag = excluded.tag,
  subtitle = excluded.subtitle,
  duration_minutes = excluded.duration_minutes,
  rest_minutes = excluded.rest_minutes,
  media_url = excluded.media_url,
  cue = excluded.cue,
  sort_order = excluded.sort_order,
  status = 'published',
  updated_at = now();
`;

const outPath = path.join(__dirname, '../supabase/migrations/20260919030000_seed_30_exercises.sql');
fs.writeFileSync(outPath, sql);
console.log('wrote', lines.length, 'rows to', outPath);
