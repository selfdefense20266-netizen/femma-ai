const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const {
  buildExerciseRoadmapRows,
  ROADMAP_CATEGORIES,
  ROADMAP_TIMES,
  ROADMAP_WEEKS,
  runRoadmapTests,
} = require('./.roadmap-out/lib/exerciseRoadmap');

function loadEnv() {
  const files = [resolve(process.cwd(), '.env'), resolve(__dirname, '../.env')];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  loadEnv();
  const local = runRoadmapTests();
  if (local.failed) {
    console.error(`Local generator failed ${local.failed} checks`);
    process.exit(1);
  }
  console.log(`Local tests passed: ${local.checked} plans / ${local.rows} saved rows.`);

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!url || !key) {
    console.log('No Supabase credentials — skipped DB seed. Local tests passed.');
    return;
  }

  const supabase = createClient(url, key);
  const rows = buildExerciseRoadmapRows();
  console.log(
    `Seeding ${rows.length} exercise_roadmap rows (14 categories × 5 times × 3 places × 3 durations)...`
  );

  const { error: clearError } = await supabase.from('exercise_roadmap').delete().neq('id', '');
  if (clearError) {
    console.error(`Could not clear old roadmap rows: ${clearError.message}`);
    process.exit(1);
  }
  console.log('Cleared old exercise_roadmap rows.');

  const chunkSize = 15;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('exercise_roadmap').upsert(chunk, {
      onConflict: 'category,daily_time,environment,duration_weeks',
    });
    if (error) {
      console.error(`Seed failed at row ${i}: ${error.message}`);
      console.error('If the table is missing columns, run both SQL files in supabase/migrations/ for exercise_roadmap.');
      process.exit(1);
    }
    console.log(`  upserted ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`);
  }

  const { count, error: countError } = await supabase.from('exercise_roadmap').select('id', { count: 'exact', head: true });
  if (countError) {
    console.error(`Could not verify seed: ${countError.message}`);
    process.exit(1);
  }
  console.log(`Saved ${count} rows in exercise_roadmap.`);

  for (const category of ROADMAP_CATEGORIES) {
    for (const dailyTime of ROADMAP_TIMES) {
      for (const weeks of ROADMAP_WEEKS) {
        const { data, error } = await supabase
          .from('exercise_roadmap')
          .select('plan_name, total_days, days, week_days')
          .eq('category', category)
          .eq('daily_time', dailyTime)
          .eq('environment', 'home')
          .eq('duration_weeks', weeks)
          .maybeSingle();
        if (error || !data) {
          console.error(`Missing ${category} | ${dailyTime} | home | ${weeks}w`);
          process.exit(1);
        }
        const expectedDays = weeks * 7;
        const savedDays = Array.isArray(data.days) ? data.days.length : 0;
        if (data.total_days !== expectedDays || savedDays !== expectedDays) {
          console.error(`${category} ${dailyTime} ${weeks}w has ${savedDays} days, expected ${expectedDays}`);
          process.exit(1);
        }
      }
    }
    const sample = await supabase
      .from('exercise_roadmap')
      .select('plan_name, total_days')
      .eq('category', category)
      .eq('daily_time', '15 min')
      .eq('environment', 'home')
      .eq('duration_weeks', 4)
      .maybeSingle();
    console.log(`  ${category}: ${sample.data?.plan_name} (${sample.data?.total_days} days)`);
  }

  console.log('Seed + all category / time / duration checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
