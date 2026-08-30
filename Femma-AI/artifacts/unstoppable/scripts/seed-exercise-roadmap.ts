import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildExerciseRoadmapRows, runRoadmapTests } from '../lib/exerciseRoadmap';

function loadEnv() {
  const files = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const local = runRoadmapTests();
if (local.failed) {
  console.error(`Local generator failed ${local.failed} checks`);
  process.exit(1);
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!url || !key) {
  console.log('No Supabase credentials — skipped DB seed. Local tests passed.');
  process.exit(0);
}

const supabase = createClient(url, key);
const rows = buildExerciseRoadmapRows();
console.log(`Seeding ${rows.length} exercise_roadmap rows...`);

const chunkSize = 40;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { error } = await supabase.from('exercise_roadmap').upsert(chunk, { onConflict: 'id' });
  if (error) {
    console.error(`Seed failed at row ${i}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  upserted ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`);
}

const { count, error: countError } = await supabase
  .from('exercise_roadmap')
  .select('id', { count: 'exact', head: true });
if (countError) {
  console.error(`Could not verify seed: ${countError.message}`);
  process.exit(1);
}

console.log(`Saved ${count} rows in exercise_roadmap.`);

const { data: boxing, error: boxingError } = await supabase
  .from('exercise_roadmap')
  .select('plan_name, week_days')
  .eq('category', 'boxing')
  .eq('daily_time', '20–30 min')
  .eq('environment', 'home')
  .maybeSingle();

if (boxingError || !boxing?.week_days?.length) {
  console.error('Boxing 20–30 min home row missing after seed.');
  process.exit(1);
}

const monday = boxing.week_days[0];
const slots = monday.items.map((item: { slot: string }) => item.slot).join(',');
if (slots !== 'exercise,exercise,exercise,recipe,meal') {
  console.error(`Boxing Monday slots were ${slots}`);
  process.exit(1);
}
if (!String(monday.items[0].title).toLowerCase().includes('shadow') && !String(monday.items[0].title).toLowerCase().includes('jab')) {
  console.error(`Boxing Monday exercise was ${monday.items[0].title}`);
  process.exit(1);
}

console.log(`DB check: ${boxing.plan_name} Monday starts with "${monday.items[0].title}"`);

for (const category of [
  'weight_loss',
  'tone',
  'muscle',
  'boxing',
  'mma',
  'karate',
  'selfdefense',
  'hiit',
  'yoga',
  'confidence',
  'pregnancy',
  'postpartum',
  'flexibility',
  'stress',
]) {
  const { data, error } = await supabase
    .from('exercise_roadmap')
    .select('plan_name, week_days')
    .eq('category', category)
    .eq('daily_time', '20–30 min')
    .eq('environment', 'home')
    .maybeSingle();
  if (error || !data?.week_days?.length) {
    console.error(`Missing ${category} 20–30 min home roadmap`);
    process.exit(1);
  }
  const firstDay = data.week_days[0];
  if (firstDay.items.length !== 5) {
    console.error(`${category} does not have 5 daily tasks`);
    process.exit(1);
  }
  console.log(`  ${category}: ${data.plan_name} → ${firstDay.items[3].title}`);
}

console.log('Seed + category checks passed.');
