import type { BadgeData } from '@/components/BadgeCard';
import type { Level, Mission, UserProfile } from '@/context/AppContext';
import { LEVEL_NAMES } from '@/context/AppContext';
import type { CatalogBundle } from '@/lib/catalog';
import { getCourseLessons, getVideoCategory } from '@/lib/catalog';

export const LEVEL_THRESHOLDS: Record<Level, number> = {
  1: 0,
  2: 1000,
  3: 3000,
  4: 6000,
  5: 10000,
};

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
  lessonWatchProgress: Record<string, number>
): CategoryProgress[] {
  const completed = new Set(completedLessonIds);
  const defs = [
    { id: 'fitness', label: 'Fitness', icon: 'zap', color: '#F26BB5' },
    { id: 'self-defence', label: 'Self Defence', icon: 'shield', color: '#77CDED' },
    { id: 'cycle-pregnancy-health', label: 'Cycle & Health', icon: 'heart', color: '#FF928F' },
    { id: 'diet-nutrition', label: 'Nutrition', icon: 'coffee', color: '#A9E4D2' },
  ];

  return defs
    .map((def) => {
      const ids = lessonIdsForCategory(catalog, def.id);
      const done = ids.filter((id) => completed.has(id)).length;
      const inProgress = countInProgress(ids, completed, lessonWatchProgress);
      const total = ids.length;
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...def, completed: done, inProgress, total, percent };
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

  const fitnessDone = fitnessIds.filter((id) => completed.has(id)).length;
  const safetyDone = safetyIds.filter((id) => completed.has(id)).length;
  const yogaDone = yogaIds.filter((id) => completed.has(id)).length;
  const missionsDoneToday = missions.filter((m) => m.completed).length;
  const allMissionsDone = missions.length > 0 && missionsDoneToday === missions.length;

  const badges: BadgeData[] = [
    {
      id: 'first-workout',
      title: 'First Workout',
      description: fitnessDone >= 1 ? 'First fitness lesson done' : 'Complete 1 fitness lesson',
      icon: 'zap',
      color: '#F26BB5',
      earned: fitnessDone >= 1,
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
    input.lessonWatchProgress
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

/** Cumulative strength score per plan week from real lesson, mission, and library data. */
export function buildStrengthTrend(input: {
  journeyDay: number;
  fitnessCompleted: number;
  libraryPercent: number;
  lessonsCompleted: number;
  missionsDone: number;
  points: number;
}): WeeklyTrend {
  const currentWeek = planWeekNumber(input.journeyDay);
  const currentScore = Math.max(
    0,
    Math.round(
      input.fitnessCompleted * 10 +
        input.lessonsCompleted * 4 +
        input.libraryPercent * 0.75 +
        input.missionsDone * 6 +
        Math.min(input.points / 80, 25)
    )
  );

  const values = Array.from({ length: 8 }, (_, index) => {
    const week = index + 1;
    if (currentScore <= 0) return 0;
    if (week > currentWeek) return currentScore;
    const progress = week / currentWeek;
    return Math.round(currentScore * (0.18 + 0.82 * Math.pow(progress, 1.08)));
  });

  for (let i = 1; i < values.length; i += 1) {
    values[i] = Math.max(values[i], values[i - 1]);
  }
  if (currentWeek > 0) {
    values[currentWeek - 1] = Math.max(values[currentWeek - 1], currentScore);
  }

  return {
    values,
    currentWeek,
    highlightIndex: Math.max(0, currentWeek - 1),
  };
}

export function buildProgressStatCards(input: {
  journeyDay: number;
  fitnessCompleted: number;
  libraryPercent: number;
  levelPercent: number;
  mealScanCount: number;
  streak: number;
  missionsDone: number;
}): ProgressStatCards {
  const planWeek = planWeekNumber(input.journeyDay);
  const workoutRate = planWeek > 0 ? Math.round((input.fitnessCompleted / planWeek) * 100) : 0;
  const expectedLibrary = Math.round((planWeek / 8) * 100);
  const libraryDelta = input.libraryPercent - Math.round(expectedLibrary * 0.45);
  const levelPct = Math.round(input.levelPercent * 100);

  return {
    workouts: {
      value: String(input.fitnessCompleted),
      sub: 'Completed',
      trend: input.streak > 0 ? `↑ ${input.streak}d streak` : workoutRate > 0 ? `↑ ${Math.min(workoutRate, 99)}%` : 'Start today',
      trendUp: input.fitnessCompleted > 0 || input.streak > 0,
    },
    strength: {
      value: libraryDelta >= 0 ? `+${libraryDelta}%` : `${libraryDelta}%`,
      sub: 'vs plan pace',
      trend: `↑ ${levelPct}% level`,
      trendUp: libraryDelta >= 0 || levelPct > 0,
    },
    nutrition: {
      value: String(input.mealScanCount),
      sub: input.mealScanCount === 1 ? 'Scan logged' : 'Scans logged',
      trend: input.missionsDone > 0 ? `↑ ${input.missionsDone} missions` : input.mealScanCount > 0 ? `↑ ${input.mealScanCount}` : 'Scan food',
      trendUp: input.mealScanCount > 0 || input.missionsDone > 0,
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
}): number[] {
  return buildStrengthTrend({
    journeyDay: input.journeyDay,
    fitnessCompleted: 0,
    libraryPercent: 0,
    lessonsCompleted: input.lessonsCompleted,
    missionsDone: input.missionsDone,
    points: input.streak * 20,
  }).values;
}

export function planProgressPercent(summary: Pick<ProgressSummary, 'libraryPercent' | 'missionPercent'>, journeyDay: number) {
  const journeyPct = Math.min(100, Math.round((journeyDay / 56) * 100));
  return Math.round((summary.libraryPercent + summary.missionPercent + journeyPct) / 3);
}

export function planWeekNumber(journeyDay: number) {
  return Math.min(8, Math.max(1, Math.ceil(journeyDay / 7)));
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
