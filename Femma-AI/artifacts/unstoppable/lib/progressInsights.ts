import type { BadgeData } from '@/components/BadgeCard';
import type { Mission, UserProfile } from '@/context/AppContext';
import { LEVEL_NAMES } from '@/context/AppContext';
import type { CatalogBundle } from '@/lib/catalog';
import { getCourseLessons, getVideoCategory } from '@/lib/catalog';
import { planNameForGoal } from '@/lib/dailyMissions';
import { LEVEL_THRESHOLDS, type Level } from '@/lib/levels';
import { startOfWeek, type ActivityEvent } from '@/lib/activityLog';
import { isSameDay, type SavedMealScan } from '@/lib/mealScanHistory';
import {
  countCompletedPlanDays,
  countPlanItems,
  isNutritionItem,
  isPlanItemDone,
  isWorkoutItem,
  planTotalDays,
  type TrainingPlan,
} from '@/lib/trainingPlan';

export { LEVEL_THRESHOLDS };

export type CategoryProgress = {
  id: string;
  label: string;
  icon: string;
  color: string;
  completed: number;
  inProgress: number;
  total: number;
  percent: number;
};

export type ProgressSummary = {
  missionsDone: number;
  missionsTotal: number;
  missionPercent: number;
  lessonsCompleted: number;
  lessonsInProgress: number;
  lessonsTotal: number;
  libraryPercent: number;
  categories: CategoryProgress[];
  badges: BadgeData[];
  nextBadge: BadgeData | null;
};

function lessonIdsForCategory(catalog: CatalogBundle, categoryId: string): string[] {
  const category = getVideoCategory(catalog, categoryId);
  if (!category) return [];
  return category.courses.flatMap((course) => getCourseLessons(course).map((lesson) => lesson.id));
}

function countInProgress(lessonIds: string[], completed: Set<string>, watch: Record<string, number>) {
  return lessonIds.filter((id) => {
    if (completed.has(id)) return false;
    const pct = watch[id] ?? 0;
    return pct > 0 && pct < 100;
  }).length;
}

export function buildCategoryProgress(
  catalog: CatalogBundle,
  completedLessonIds: string[],
  lessonWatchProgress: Record<string, number>,
  trainingPlan?: TrainingPlan | null
): CategoryProgress[] {
  const completed = new Set(completedLessonIds);
  const planItems = (trainingPlan?.days || []).flatMap((day) => day.items);
  const defs = [
    { id: 'fitness', label: 'Fitness', icon: 'zap', color: '#F26BB5', catalogId: 'fitness', plan: ['fitness'] as Mission['category'][] },
    { id: 'yoga', label: 'Yoga', icon: 'wind', color: '#B9A7F2', catalogId: '', plan: ['yoga'] as Mission['category'][] },
    { id: 'self-defence', label: 'Self Defence', icon: 'shield', color: '#77CDED', catalogId: 'self-defence', plan: ['safety'] as Mission['category'][] },
    { id: 'cycle-pregnancy-health', label: 'Cycle & Health', icon: 'heart', color: '#FF928F', catalogId: 'cycle-pregnancy-health', plan: [] as Mission['category'][] },
    { id: 'diet-nutrition', label: 'Nutrition', icon: 'coffee', color: '#A9E4D2', catalogId: 'diet-nutrition', plan: ['nutrition', 'recipe'] as Mission['category'][] },
  ];

  return defs
    .map((def) => {
      const ids = def.catalogId ? lessonIdsForCategory(catalog, def.catalogId) : [];
      const catalogDone = ids.filter((id) => completed.has(id)).length;
      const matched = planItems.filter((item) => def.plan.includes(item.category));
      const planDone = matched.filter((item) => item.completed).length;
      const usePlan = matched.length > 0;
      const done = usePlan ? planDone : catalogDone;
      const total = usePlan ? matched.length : ids.length;
      const inProgress = usePlan ? 0 : countInProgress(ids, completed, lessonWatchProgress);
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id: def.id,
        label: def.label,
        icon: def.icon,
        color: def.color,
        completed: done,
        inProgress,
        total,
        percent,
      };
    })
    .filter((item) => item.total > 0);
}

export function buildProgressBadges(input: {
  profile: UserProfile;
  missions: Mission[];
  completedLessonIds: string[];
  catalog: CatalogBundle;
  mealScanCount: number;
  coachMessageCount: number;
}): BadgeData[] {
  const { profile, missions, completedLessonIds, catalog, mealScanCount, coachMessageCount } = input;
  const completed = new Set(completedLessonIds);

  const fitnessIds = lessonIdsForCategory(catalog, 'fitness');
  const safetyIds = lessonIdsForCategory(catalog, 'self-defence');
  const yogaCourse = catalog.courses.find((c) => c.id === 'fit-yoga');
  const yogaIds = yogaCourse ? getCourseLessons(yogaCourse).map((l) => l.id) : [];

  const fitnessDone =
    fitnessIds.filter((id) => completed.has(id)).length +
    countPlanItems(profile.trainingPlan, (item) => item.category === 'fitness', true);
  const safetyDone =
    safetyIds.filter((id) => completed.has(id)).length +
    countPlanItems(profile.trainingPlan, (item) => item.category === 'safety', true);
  const yogaDone =
    yogaIds.filter((id) => completed.has(id)).length +
    countPlanItems(profile.trainingPlan, (item) => item.category === 'yoga', true);
  const workoutMissions = missions.filter((item) => item.completed && isWorkoutItem(item)).length;
  const missionsDoneToday = missions.filter((m) => m.completed).length;
  const allMissionsDone = missions.length > 0 && missions.every((item) => item.completed || item.skipped) && missionsDoneToday > 0;

  const badges: BadgeData[] = [
    {
      id: 'first-workout',
      title: 'First Workout',
      description: fitnessDone >= 1 || workoutMissions >= 1 ? 'First workout done' : 'Complete 1 workout',
      icon: 'zap',
      color: '#F26BB5',
      earned: fitnessDone >= 1 || workoutMissions >= 1,
    },
    {
      id: 'safety-shield',
      title: 'Safety Shield',
      description: safetyDone >= 1 ? 'First safety lesson done' : 'Complete 1 safety lesson',
      icon: 'shield',
      color: '#77CDED',
      earned: safetyDone >= 1,
    },
    {
      id: 'yoga-flow',
      title: 'Yoga Flow',
      description: yogaDone >= 5 ? '5 yoga sessions complete' : `${yogaDone}/5 yoga lessons`,
      icon: 'wind',
      color: '#B9A7F2',
      earned: yogaDone >= 5,
    },
    {
      id: 'daily-champion',
      title: 'Daily Champion',
      description: allMissionsDone ? 'All missions done today' : `${missionsDoneToday}/${missions.length} missions today`,
      icon: 'check-circle',
      color: '#A9E4D2',
      earned: allMissionsDone,
    },
    {
      id: 'scan-pro',
      title: 'Scan Pro',
      description: mealScanCount >= 5 ? `${mealScanCount} food scans logged` : `${mealScanCount}/5 food scans`,
      icon: 'camera',
      color: '#FFD88A',
      earned: mealScanCount >= 5,
    },
    {
      id: 'coach-connected',
      title: 'Coach Chat',
      description: coachMessageCount >= 1 ? 'Talked with AI Coach' : 'Send 1 coach message',
      icon: 'message-circle',
      color: '#D94A9A',
      earned: coachMessageCount >= 1,
    },
    {
      id: 'streak-7',
      title: '7 Day Streak',
      description: profile.streak >= 7 ? '7 days in a row' : `${profile.streak}/7 day streak`,
      icon: 'activity',
      color: '#FFD88A',
      earned: profile.streak >= 7,
    },
    {
      id: 'warrior',
      title: 'Warrior',
      description: profile.level >= 2 ? `Reached ${LEVEL_NAMES[2]}` : `Reach ${LEVEL_NAMES[2]} level`,
      icon: 'award',
      color: '#77CDED',
      earned: profile.level >= 2,
    },
    {
      id: 'streak-30',
      title: '30 Day Streak',
      description: profile.streak >= 30 ? '30 days in a row' : `${profile.streak}/30 day streak`,
      icon: 'star',
      color: '#FF928F',
      earned: profile.streak >= 30,
    },
    {
      id: 'goddess',
      title: 'Goddess',
      description: profile.level >= 5 ? 'Top level reached' : `Reach ${LEVEL_NAMES[5]} level`,
      icon: 'heart',
      color: '#D94A9A',
      earned: profile.level >= 5,
    },
  ];

  return badges.sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return 0;
  });
}

export function buildProgressSummary(input: {
  profile: UserProfile;
  missions: Mission[];
  completedLessonIds: string[];
  lessonWatchProgress: Record<string, number>;
  catalog: CatalogBundle;
  mealScanCount: number;
  coachMessageCount: number;
}): ProgressSummary {
  const categories = buildCategoryProgress(
    input.catalog,
    input.completedLessonIds,
    input.lessonWatchProgress,
    input.profile.trainingPlan
  );

  const completed = new Set(input.completedLessonIds);
  const allLessonIds = input.catalog.courses.flatMap((course) =>
    getCourseLessons(course).map((lesson) => lesson.id)
  );
  const lessonsCompleted = allLessonIds.filter((id) => completed.has(id)).length;
  const lessonsInProgress = countInProgress(allLessonIds, completed, input.lessonWatchProgress);
  const lessonsTotal = allLessonIds.length;

  const missionsDone = input.missions.filter((m) => m.completed).length;
  const missionsTotal = input.missions.length;

  const badges = buildProgressBadges(input);
  const nextBadge = badges.find((b) => !b.earned) ?? null;

  return {
    missionsDone,
    missionsTotal,
    missionPercent: missionsTotal > 0 ? Math.round((missionsDone / missionsTotal) * 100) : 0,
    lessonsCompleted,
    lessonsInProgress,
    lessonsTotal,
    libraryPercent: lessonsTotal > 0 ? Math.round((lessonsCompleted / lessonsTotal) * 100) : 0,
    categories,
    badges,
    nextBadge,
  };
}

export type WeeklyTrend = {
  values: number[];
  currentWeek: number;
  highlightIndex: number;
};

export type ProgressStatCards = {
  workouts: { value: string; sub: string; trend: string; trendUp: boolean };
  strength: { value: string; sub: string; trend: string; trendUp: boolean };
  nutrition: { value: string; sub: string; trend: string; trendUp: boolean };
};

/** Workouts completed in each plan week. */
export function buildStrengthTrend(input: {
  activityLog: ActivityEvent[];
  journeyDay: number;
  trainingPlan?: TrainingPlan | null;
  durationWeeks?: number;
}): WeeklyTrend {
  const weeks = Math.max(4, input.durationWeeks || input.trainingPlan?.durationWeeks || 8);
  const currentWeek = planWeekNumber(input.journeyDay, weeks);
  if (input.trainingPlan?.days?.length) {
    const values = Array.from({ length: weeks }, (_, index) => {
      const week = index + 1;
      return input.trainingPlan!.days
        .filter((day) => day.week === week)
        .reduce((sum, day) => sum + day.items.filter((item) => isWorkoutItem(item) && item.completed).length, 0);
    });
    return {
      values,
      currentWeek,
      highlightIndex: Math.max(0, currentWeek - 1),
    };
  }

  return {
    values: Array.from({ length: weeks }, () => 0),
    currentWeek,
    highlightIndex: Math.max(0, currentWeek - 1),
  };
}

export function buildProgressStatCards(input: {
  journeyDay: number;
  activityLog: ActivityEvent[];
  mealScans: SavedMealScan[];
  streak: number;
  trainingPlan?: TrainingPlan | null;
  durationWeeks?: number;
  missions?: Mission[];
}): ProgressStatCards {
  const planWeek = planWeekNumber(input.journeyDay, input.durationWeeks);
  const planWorkouts = countPlanItems(input.trainingPlan, isWorkoutItem, true);
  const todayWorkouts = (input.missions || []).filter((item) => item.completed && isWorkoutItem(item)).length;
  const workouts = Math.max(planWorkouts, input.activityLog.filter((event) => event.kind === 'workout').length);
  const thisWeekDays = (input.trainingPlan?.days || []).filter((day) => day.week === planWeek);
  const expectedThisWeek = thisWeekDays.flatMap((day) => day.items).filter(isWorkoutItem).length;
  const workoutsThisWeek =
    thisWeekDays.flatMap((day) => day.items).filter((item) => isWorkoutItem(item) && item.completed).length || todayWorkouts;
  const pacePercent = expectedThisWeek > 0 ? Math.round((workoutsThisWeek / expectedThisWeek) * 100) : workoutsThisWeek > 0 ? 100 : 0;
  const planScans = countPlanItems(input.trainingPlan, isNutritionItem, true);
  const scans = Math.max(input.mealScans.length, planScans);
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const scansToday = input.mealScans.filter((scan) => isSameDay(scan.scannedAt)).length;
  const scansThisWeek = input.mealScans.filter((scan) => {
    const time = Date.parse(scan.scannedAt);
    return Number.isFinite(time) && time >= weekStart.getTime() && time < weekEnd.getTime();
  }).length;

  return {
    workouts: {
      value: String(workouts),
      sub: workouts === 1 ? 'Completed' : 'Completed',
      trend: input.streak > 0 ? `${input.streak}d streak` : workoutsThisWeek > 0 ? `${workoutsThisWeek} this week` : 'Start today',
      trendUp: workouts > 0 || input.streak > 0,
    },
    strength: {
      value: `${Math.min(999, pacePercent)}%`,
      sub: 'of plan pace',
      trend: expectedThisWeek > 0 ? `${workoutsThisWeek}/${expectedThisWeek} this week` : `${workoutsThisWeek} this week`,
      trendUp: expectedThisWeek > 0 ? workoutsThisWeek >= expectedThisWeek : workoutsThisWeek > 0,
    },
    nutrition: {
      value: String(scans),
      sub: scans === 1 ? 'Scan logged' : 'Scans logged',
      trend: scansToday > 0 ? `${scansToday} today` : scansThisWeek > 0 ? `${scansThisWeek} this week` : planScans > 0 ? `${planScans} logged` : 'Scan food',
      trendUp: scans > 0,
    },
  };
}

export function progressPlanQuote(missionPercent: number, planPercent: number, journeyDay: number) {
  if (missionPercent >= 100) return "You're showing up for yourself. Keep it going! ✨";
  if (planPercent >= 70) return "Strong momentum — your plan is really taking shape.";
  if (journeyDay <= 3) return 'Great start. Small steps today build unstoppable habits.';
  return "You're showing up for yourself. Keep it going! ✨";
}

/** @deprecated Use buildStrengthTrend */
export function buildActivityTrend(input: {
  journeyDay: number;
  lessonsCompleted: number;
  missionsDone: number;
  streak: number;
  activityLog?: ActivityEvent[];
}): number[] {
  return buildStrengthTrend({
    activityLog: input.activityLog || [],
    journeyDay: input.journeyDay,
  }).values;
}

export function planWeekNumber(journeyDay: number, durationWeeks = 8) {
  const max = Math.max(1, durationWeeks || 8);
  return Math.min(max, Math.max(1, Math.ceil((journeyDay || 1) / 7)));
}

export function planProgressPercent(input: {
  journeyDay: number;
  missions: Mission[];
  trainingPlan?: TrainingPlan | null;
  durationWeeks?: number;
}) {
  const totalDays = planTotalDays(input.durationWeeks || input.trainingPlan?.durationWeeks);
  const todayDone = input.missions.length > 0 && input.missions.every(isPlanItemDone);
  const completedDays = countCompletedPlanDays(input.trainingPlan, input.journeyDay, todayDone);
  const todayFraction =
    todayDone || !input.missions.length
      ? 0
      : input.missions.filter(isPlanItemDone).length / input.missions.length;
  return Math.min(100, Math.round(((completedDays + todayFraction) / totalDays) * 100));
}

export function displayPlanName(profile: UserProfile) {
  return profile.planName || planNameForGoal(profile.goal) || 'Your Plan';
}

export function levelProgress(profile: UserProfile) {
  const level = profile.level;
  const nextLevel = Math.min(5, level + 1) as Level;
  const prevPts = LEVEL_THRESHOLDS[level];
  const nextPts = LEVEL_THRESHOLDS[nextLevel];
  const span = nextPts - prevPts || 1;
  const pct = level >= 5 ? 1 : (profile.points - prevPts) / span;
  return {
    levelName: LEVEL_NAMES[level],
    nextLevelName: LEVEL_NAMES[nextLevel],
    pointsToNext: level >= 5 ? 0 : Math.max(0, nextPts - profile.points),
    percent: Math.min(1, Math.max(0, pct)),
  };
}
