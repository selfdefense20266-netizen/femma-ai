import type { Mission, UserProfile } from '@/context/AppContext';
import type { ActivityEvent } from '@/lib/activityLog';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type TrainingPlanStatus = 'active' | 'completed';

export type PlanWatchLesson = {
  id: string;
  title: string;
  durationMinutes: number;
  href: string;
};

export type PlanWatchCourse = {
  id: string;
  title: string;
  categoryId: string;
  startWeek?: number;
  lessons: PlanWatchLesson[];
};

export type PlanDay = {
  day: number;
  week: number;
  weekday: string;
  items: Mission[];
};

export type PlanPerformance = {
  workouts: number;
  lessons: number;
  scans: number;
  points: number;
  streak: number;
  weeksCompleted: number;
};

export type TrainingPlan = {
  id: string;
  planName: string;
  goal: string;
  durationWeeks: number;
  foodPreference: string;
  fitnessLevel: string;
  environment: string;
  courseIds: string[];
  courseNames: string[];
  watchCourses: PlanWatchCourse[];
  days: PlanDay[];
  startedAt: string;
  endsAt: string;
  status: TrainingPlanStatus;
  generatedBy?: 'ai' | 'catalog' | 'roadmap';
  performance?: PlanPerformance;
};

export const DURATION_OPTIONS = [
  { weeks: 4, label: '1 month', desc: 'A focused 4-week reset' },
  { weeks: 8, label: '2 months', desc: 'Build real habits' },
  { weeks: 12, label: '3 months', desc: 'Full transformation' },
] as const;

export function planTotalDays(weeks?: number) {
  return Math.max(7, (weeks || 8) * 7);
}

export function addDays(iso: string, days: number) {
  const date = new Date(iso || Date.now());
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function isWorkoutItem(item: Pick<Mission, 'slot' | 'category'>) {
  return item.slot === 'exercise' || item.category === 'fitness' || item.category === 'yoga' || item.category === 'safety';
}

export function isNutritionItem(item: Pick<Mission, 'slot' | 'category'>) {
  return item.slot === 'meal' || item.slot === 'recipe' || item.category === 'nutrition' || item.category === 'recipe';
}

export function isPlanItemDone(item: Pick<Mission, 'completed' | 'skipped'>) {
  return Boolean(item.completed || item.skipped);
}

export function isPlanDayComplete(day: PlanDay) {
  return day.items.length > 0 && day.items.every(isPlanItemDone);
}

export function isPlanDayEarned(day: PlanDay) {
  return isPlanDayComplete(day) && day.items.some((item) => item.completed);
}

export function countCompletedPlanDays(
  plan: TrainingPlan | null | undefined,
  journeyDay = 1,
  todayAllDone = false
) {
  if (plan?.days?.length) {
    const fromPlan = plan.days.filter(isPlanDayComplete).length;
    const todayRow = plan.days.find((day) => day.day === journeyDay);
    if (todayAllDone && todayRow && !isPlanDayComplete(todayRow)) return fromPlan + 1;
    return fromPlan;
  }
  return Math.max(0, (journeyDay || 1) - 1) + (todayAllDone ? 1 : 0);
}

export function countEarnedPlanDays(
  plan: TrainingPlan | null | undefined,
  journeyDay = 1,
  todayEarned = false
) {
  if (plan?.days?.length) {
    const fromPlan = plan.days.filter(isPlanDayEarned).length;
    const todayRow = plan.days.find((day) => day.day === journeyDay);
    if (todayEarned && todayRow && !isPlanDayEarned(todayRow)) return fromPlan + 1;
    return fromPlan;
  }
  return Math.max(0, (journeyDay || 1) - 1) + (todayEarned ? 1 : 0);
}

export function countPlanItems(
  plan: TrainingPlan | null | undefined,
  match: (item: Mission) => boolean,
  onlyCompleted = false
) {
  return (plan?.days || []).reduce((sum, day) => {
    return (
      sum +
      day.items.filter((item) => match(item) && (!onlyCompleted || item.completed)).length
    );
  }, 0);
}

export function isTrainingPlanComplete(profile: UserProfile, now = new Date()) {
  const plan = profile.trainingPlan;
  const totalDays = planTotalDays(profile.planDurationWeeks || plan?.durationWeeks);
  if ((profile.journeyDay || 1) >= totalDays) return true;
  if (!plan?.endsAt) return false;
  const ends = Date.parse(plan.endsAt);
  return Number.isFinite(ends) && now.getTime() >= ends;
}

export function buildTrainingPlan(input: {
  profile: UserProfile;
  planName: string;
  courseIds: string[];
  courseNames: string[];
}): TrainingPlan {
  const startedAt = input.profile.planStartedAt || new Date().toISOString();
  const weeks = input.profile.planDurationWeeks || 8;
  return {
    id: input.profile.trainingPlan?.id || `plan-${Date.now()}`,
    planName: input.planName,
    goal: input.profile.goal,
    durationWeeks: weeks,
    foodPreference: input.profile.foodPreference || 'Eat everything',
    fitnessLevel: input.profile.fitnessLevel,
    environment: input.profile.environment,
    courseIds: input.courseIds,
    courseNames: input.courseNames,
    watchCourses: [],
    days: [],
    startedAt,
    endsAt: addDays(startedAt, planTotalDays(weeks)),
    status: 'active',
  };
}

export function snapshotPerformance(input: {
  profile: UserProfile;
  activityLog: ActivityEvent[];
  completedLessonIds: string[];
  mealScanCount?: number;
}): PlanPerformance {
  const weeks = Math.min(
    input.profile.planDurationWeeks || 8,
    Math.max(1, Math.ceil((input.profile.journeyDay || 1) / 7))
  );
  const planWorkouts = countPlanItems(input.profile.trainingPlan, isWorkoutItem, true);
  return {
    workouts: Math.max(planWorkouts, input.activityLog.filter((event) => event.kind === 'workout').length),
    lessons: input.completedLessonIds.length,
    scans: input.mealScanCount ?? input.activityLog.filter((event) => event.kind === 'nutrition').length,
    points: input.profile.points,
    streak: input.profile.streak,
    weeksCompleted: weeks,
  };
}

export function coursesFromCatalog(catalog: { courses: Array<{ id: string; title: string }> } | undefined, courseIds: string[]) {
  if (!catalog) return [];
  return courseIds
    .map((id) => catalog.courses.find((course) => course.id === id)?.title)
    .filter((title): title is string => Boolean(title));
}

export async function saveTrainingPlanToDb(plan: TrainingPlan, memberId: string) {
  if (!isSupabaseConfigured || !memberId) return;
  try {
    const row = {
      id: plan.id,
      member_id: memberId,
      plan_name: plan.planName,
      goal: plan.goal,
      duration_weeks: plan.durationWeeks,
      food_preference: plan.foodPreference,
      fitness_level: plan.fitnessLevel,
      environment: plan.environment,
      course_ids: plan.courseIds,
      course_names: plan.courseNames,
      watch_courses: plan.watchCourses || [],
      schedule: plan.days || [],
      generated_by: plan.generatedBy || null,
      started_at: plan.startedAt,
      ends_at: plan.endsAt,
      status: plan.status,
      performance: plan.performance || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('member_plans').upsert(row, { onConflict: 'id' });
    if (error?.message?.includes('generated_by')) {
      const { generated_by: _generatedBy, ...withoutGenerated } = row;
      const retry = await supabase.from('member_plans').upsert(withoutGenerated, { onConflict: 'id' });
      if (retry.error) console.warn('Could not save training plan row', retry.error.message);
      return;
    }
    if (error) console.warn('Could not save training plan row', error.message);
  } catch (error) {
    console.warn('Could not save training plan row', error);
  }
}
