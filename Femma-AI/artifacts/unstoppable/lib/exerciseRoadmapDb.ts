import type { CatalogBundle } from './catalog';
import type { UserProfile } from '../context/AppContext';
import type { TrainingPlan } from './trainingPlan';
import {
  expandRoadmapDays,
  generateRoadmapTrainingPlan,
  normalizeEnvironment,
  primaryRoadmapCategory,
  ROADMAP_TIMES,
  ROADMAP_WEEKS,
  type RoadmapWeekDay,
} from './exerciseRoadmap';

export async function fetchRoadmapWeekDays(input: {
  category: string;
  dailyTime: string;
  environment: string;
  durationWeeks?: number;
}): Promise<{ weekDays: RoadmapWeekDay[]; days?: TrainingPlan['days'] } | null> {
  try {
    const { isSupabaseConfigured, supabase } = await import('./supabase');
    if (!isSupabaseConfigured) return null;
    const weeks = ROADMAP_WEEKS.includes((input.durationWeeks || 8) as (typeof ROADMAP_WEEKS)[number])
      ? input.durationWeeks || 8
      : 8;
    const { data, error } = await supabase
      .from('exercise_roadmap')
      .select('week_days, duration_weeks')
      .eq('category', input.category)
      .eq('daily_time', input.dailyTime)
      .eq('environment', normalizeEnvironment(input.environment))
      .eq('duration_weeks', weeks)
      .maybeSingle();
    if (error || !data) return null;
    const weekDays = (data.week_days || []) as RoadmapWeekDay[];
    if (!weekDays.length) return null;
    return { weekDays };
  } catch {
    return null;
  }
}

export async function buildRoadmapTrainingPlan(
  profile: UserProfile,
  catalog?: CatalogBundle
): Promise<TrainingPlan> {
  const category = profile.isPregnant && !/postpartum/.test(profile.goal || '')
    ? 'pregnancy'
    : primaryRoadmapCategory(profile.goal);
  const environment = normalizeEnvironment(profile.environment);
  const dailyTime = ROADMAP_TIMES.includes(profile.dailyTime as (typeof ROADMAP_TIMES)[number])
    ? profile.dailyTime
    : '20–30 min';
  const fromDb = await fetchRoadmapWeekDays({
    category,
    dailyTime,
    environment,
    durationWeeks: profile.planDurationWeeks,
  });
  const local = generateRoadmapTrainingPlan(profile);
  const food = profile.foodPreference || 'Eat everything';
  const plan = fromDb?.weekDays?.length
    ? { ...local, days: expandRoadmapDays(fromDb.weekDays, local.durationWeeks, food) }
    : local;
  if (!catalog) return plan as TrainingPlan;
  const { linkPlanToCatalog } = await import('./missionHref');
  return linkPlanToCatalog(plan as TrainingPlan, catalog);
}
