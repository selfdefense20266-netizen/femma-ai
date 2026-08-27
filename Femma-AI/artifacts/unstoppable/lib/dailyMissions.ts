import colors from '@/constants/colors';
import type { Mission, MissionCategory, UserProfile } from '@/context/AppContext';
import {
  getCourseLessons,
  libraryPath,
  type CatalogBundle,
  type VideoCourse,
  type VideoLesson,
} from '@/lib/catalog';

export type TrainingFocus =
  | 'boxing'
  | 'mma'
  | 'karate'
  | 'taekwondo'
  | 'jiu-jitsu'
  | 'self-defense'
  | 'weight-loss'
  | 'muscle'
  | 'tone'
  | 'yoga'
  | 'flexibility'
  | 'pilates'
  | 'hiit'
  | 'cardio'
  | 'pregnancy'
  | 'postpartum'
  | 'stress'
  | 'confidence'
  | 'general';

const COURSE_PREFS: Record<TrainingFocus, string[]> = {
  boxing: ['sd-boxing'],
  mma: ['sd-mma', 'sd-boxing'],
  karate: ['sd-karate'],
  taekwondo: ['sd-taekwondo'],
  'jiu-jitsu': ['sd-jiu-jitsu'],
  'self-defense': ['sd-boxing', 'sd-foundations', 'sd-jiu-jitsu'],
  'weight-loss': ['fit-weight-loss', 'fit-hiit', 'fit-cardio'],
  muscle: ['fit-strength', 'fit-core', 'fit-foundations'],
  tone: ['fit-core', 'fit-strength', 'fit-pilates'],
  yoga: ['fit-yoga'],
  flexibility: ['fit-yoga', 'fit-mobility', 'fit-pilates'],
  pilates: ['fit-pilates', 'fit-core'],
  hiit: ['fit-hiit', 'fit-cardio'],
  cardio: ['fit-cardio', 'fit-endurance', 'fit-hiit'],
  pregnancy: ['cph-pregnancy', 'fit-yoga'],
  postpartum: ['cph-postpartum', 'cph-recovery-wellness'],
  stress: ['fit-yoga', 'fit-mobility'],
  confidence: ['sd-foundations', 'sd-boxing', 'fit-foundations'],
  general: ['fit-foundations', 'fit-strength', 'fit-cardio'],
};

const FOCUS_META: Record<
  TrainingFocus,
  { label: string; planName: string; icon: string; category: MissionCategory; href: string; courseId?: string }
> = {
  boxing: {
    label: 'Boxing',
    planName: 'Boxing Power Plan',
    icon: 'target',
    category: 'safety',
    href: '/library/self-defence/sd-boxing',
    courseId: 'sd-boxing',
  },
  mma: {
    label: 'MMA',
    planName: 'MMA Fighter Plan',
    icon: 'activity',
    category: 'safety',
    href: '/library/self-defence/sd-mma',
    courseId: 'sd-mma',
  },
  karate: {
    label: 'Karate',
    planName: 'Karate Plan',
    icon: 'shield',
    category: 'safety',
    href: '/library/self-defence/sd-karate',
    courseId: 'sd-karate',
  },
  taekwondo: {
    label: 'Taekwondo',
    planName: 'Taekwondo Plan',
    icon: 'triangle',
    category: 'safety',
    href: '/library/self-defence/sd-taekwondo',
    courseId: 'sd-taekwondo',
  },
  'jiu-jitsu': {
    label: 'Jiu-Jitsu',
    planName: 'Jiu-Jitsu Plan',
    icon: 'users',
    category: 'safety',
    href: '/library/self-defence/sd-jiu-jitsu',
    courseId: 'sd-jiu-jitsu',
  },
  'self-defense': {
    label: 'Safety',
    planName: 'Self-Defense Plan',
    icon: 'shield',
    category: 'safety',
    href: '/library/self-defence',
  },
  'weight-loss': {
    label: 'Fitness',
    planName: 'Lean & Strong Plan',
    icon: 'trending-down',
    category: 'fitness',
    href: '/library/fitness/fit-weight-loss',
    courseId: 'fit-weight-loss',
  },
  muscle: {
    label: 'Strength',
    planName: 'Strength Builder Plan',
    icon: 'zap',
    category: 'fitness',
    href: '/library/fitness/fit-strength',
    courseId: 'fit-strength',
  },
  tone: {
    label: 'Sculpt',
    planName: 'Tone & Sculpt Plan',
    icon: 'activity',
    category: 'fitness',
    href: '/library/fitness/fit-core',
    courseId: 'fit-core',
  },
  yoga: {
    label: 'Yoga',
    planName: 'Yoga Flow Plan',
    icon: 'wind',
    category: 'yoga',
    href: '/yoga',
    courseId: 'fit-yoga',
  },
  flexibility: {
    label: 'Mobility',
    planName: 'Flexibility Plan',
    icon: 'wind',
    category: 'yoga',
    href: '/yoga',
    courseId: 'fit-yoga',
  },
  pilates: {
    label: 'Pilates',
    planName: 'Pilates Plan',
    icon: 'aperture',
    category: 'fitness',
    href: '/library/fitness/fit-pilates',
    courseId: 'fit-pilates',
  },
  hiit: {
    label: 'HIIT',
    planName: 'HIIT Burn Plan',
    icon: 'zap',
    category: 'fitness',
    href: '/library/fitness/fit-hiit',
    courseId: 'fit-hiit',
  },
  cardio: {
    label: 'Cardio',
    planName: 'Cardio Endurance Plan',
    icon: 'heart',
    category: 'fitness',
    href: '/library/fitness/fit-cardio',
    courseId: 'fit-cardio',
  },
  pregnancy: {
    label: 'Prenatal',
    planName: 'Pregnancy Wellness Plan',
    icon: 'heart',
    category: 'fitness',
    href: '/library/cycle-pregnancy-health/cph-pregnancy',
    courseId: 'cph-pregnancy',
  },
  postpartum: {
    label: 'Recovery',
    planName: 'Postpartum Recovery Plan',
    icon: 'sunrise',
    category: 'fitness',
    href: '/library/cycle-pregnancy-health/cph-postpartum',
    courseId: 'cph-postpartum',
  },
  stress: {
    label: 'Yoga',
    planName: 'Calm & Restore Plan',
    icon: 'wind',
    category: 'yoga',
    href: '/yoga',
    courseId: 'fit-yoga',
  },
  confidence: {
    label: 'Training',
    planName: 'Confidence Builder Plan',
    icon: 'star',
    category: 'fitness',
    href: '/library/fitness',
  },
  general: {
    label: 'Fitness',
    planName: 'Confidence Builder Plan',
    icon: 'zap',
    category: 'fitness',
    href: '/library/fitness',
  },
};

const TEMPLATE_TITLES: Record<TrainingFocus, [string, string]> = {
  boxing: ['Boxing fundamentals & footwork', 'Boxing pad-work combinations'],
  mma: ['MMA striking basics', 'MMA clinch & movement drill'],
  karate: ['Karate stance & kihon', 'Karate kata practice'],
  taekwondo: ['Taekwondo kicks & stance', 'Taekwondo combination drill'],
  'jiu-jitsu': ['Jiu-jitsu movement basics', 'Jiu-jitsu escape drill'],
  'self-defense': ['Wrist escape & awareness', 'Boxing basics for self-defense'],
  'weight-loss': ['Fat-burn HIIT session', 'Cardio for a leaner week'],
  muscle: ['Strength builder session', 'Core & glute sculpt'],
  tone: ['Tone & sculpt workout', 'Core definition session'],
  yoga: ['Yoga flow for strength', 'Restorative yoga & breath'],
  flexibility: ['Deep flexibility flow', 'Hip & hamstring mobility'],
  pilates: ['Pilates core reformer-style', 'Pilates posture & control'],
  hiit: ['HIIT burn intervals', 'Quick metabolic finisher'],
  cardio: ['Cardio endurance session', 'Steady-state heart-rate work'],
  pregnancy: ['Prenatal safe movement', 'Pregnancy mobility & breath'],
  postpartum: ['Gentle postpartum rebuild', 'Core recovery basics'],
  stress: ['Stress-relief yoga', 'Breathwork to downshift'],
  confidence: ['Confidence-building workout', 'Foundations self-defense drill'],
  general: ['Full-body training session', 'Core & posture work'],
};

function minutesFor(profile: UserProfile, fallback: number) {
  const map: Record<string, number> = {
    '15 min': 15,
    '20–30 min': 25,
    '30–45 min': 35,
    '45–60 min': 50,
    '60+ min': 60,
  };
  return map[profile.dailyTime] || fallback;
}

function difficultyFor(profile: UserProfile) {
  const level = (profile.fitnessLevel || '').toLowerCase();
  if (level.includes('beginner')) return 'Beginner';
  if (level.includes('active')) return 'Advanced';
  if (level.includes('intermediate')) return 'Intermediate';
  return 'Beginner';
}

export function detectFocus(goal: string, extra = ''): TrainingFocus {
  const g = `${goal} ${extra}`.toLowerCase();
  if (/box/.test(g)) return 'boxing';
  if (/mma|mixed martial/.test(g)) return 'mma';
  if (/karate/.test(g)) return 'karate';
  if (/taekwondo|tkd/.test(g)) return 'taekwondo';
  if (/jiu|bjj|grappling/.test(g)) return 'jiu-jitsu';
  if (/self.?defen|safety/.test(g)) return 'self-defense';
  if (/weight.?loss|lose weight|fat/.test(g)) return 'weight-loss';
  if (/hiit/.test(g)) return 'hiit';
  if (/pilates/.test(g)) return 'pilates';
  if (/yoga/.test(g)) return 'yoga';
  if (/flexib|mobility/.test(g)) return 'flexibility';
  if (/cardio|endurance/.test(g)) return 'cardio';
  if (/muscle|strength|strong/.test(g)) return 'muscle';
  if (/tone|sculpt/.test(g)) return 'tone';
  if (/postpartum/.test(g)) return 'postpartum';
  if (/pregnant|prenatal/.test(g)) return 'pregnancy';
  if (/stress|calm|anxiety/.test(g)) return 'stress';
  if (/confidence/.test(g)) return 'confidence';
  return 'general';
}

export function planNameForGoal(goal: string) {
  return FOCUS_META[detectFocus(goal)].planName;
}

export function focusQuickLink(goal: string) {
  const focus = detectFocus(goal);
  const meta = FOCUS_META[focus];
  return { label: meta.label, icon: meta.icon, route: meta.href };
}

function findCourse(catalog: CatalogBundle | undefined, ids: string[], focus: TrainingFocus): VideoCourse | undefined {
  if (!catalog?.courses.length) return undefined;
  for (const id of ids) {
    const match = catalog.courses.find((course) => course.id === id);
    if (match) return match;
  }
  const needle = focus.replace(/-/g, ' ');
  return catalog.courses.find((course) => {
    const hay = `${course.id} ${course.title} ${course.shortTitle}`.toLowerCase();
    return hay.includes(needle) || hay.includes(ids[0]?.replace(/-/g, ' ') || '');
  });
}

function pickLessons(course: VideoCourse, count: number, day: number): VideoLesson[] {
  const lessons = getCourseLessons(course);
  if (!lessons.length) return [];
  const start = (Math.max(1, day) - 1) % lessons.length;
  return Array.from({ length: Math.min(count, lessons.length) }, (_, i) => lessons[(start + i) % lessons.length]);
}

function mission(partial: Omit<Mission, 'completed'> & { completed?: boolean }): Mission {
  return { completed: false, ...partial };
}

function trainingMissions(profile: UserProfile, catalog: CatalogBundle | undefined): Mission[] {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const meta = FOCUS_META[focus];
  const mins = minutesFor(profile, 20);
  const difficulty = difficultyFor(profile);
  const course = findCourse(catalog, COURSE_PREFS[focus], focus);
  const lessons = course ? pickLessons(course, 2, profile.journeyDay || 1) : [];
  const accent = meta.category === 'safety' ? colors.light.skyBlue : colors.light.pink;
  const titles = TEMPLATE_TITLES[focus];

  return [0, 1].map((index) => {
    const lesson = lessons[index];
    const href = lesson
      ? libraryPath(course!.categoryId, undefined, lesson.id)
      : course
        ? libraryPath(course.categoryId, course.id)
        : meta.href;
    const duration = lesson?.durationMinutes || mins;
    return mission({
      id: `train-${index + 1}`,
      title: lesson?.title || `${mins} min ${titles[index]}`,
      category: meta.category,
      label: meta.label,
      duration,
      calories: Math.round(duration * (meta.category === 'yoga' ? 5 : 8)),
      difficulty,
      accentColor: index === 0 ? accent : colors.light.lavender,
      icon: meta.icon,
      href,
      courseId: course?.id || meta.courseId,
      lessonId: lesson?.id,
    });
  });
}

function yogaMission(profile: UserProfile): Mission {
  const focus = detectFocus(profile.goal);
  const gentle = profile.cyclePhase === 'menstrual' || profile.isPregnant || focus === 'pregnancy' || focus === 'postpartum';
  const title = gentle ? '10 min restorative yoga' : '10 min stress-relief yoga';
  return mission({
    id: 'yoga',
    title,
    category: 'yoga',
    label: 'Yoga',
    duration: 10,
    calories: 60,
    difficulty: 'Beginner',
    accentColor: colors.light.lavender,
    icon: 'wind',
    href: '/yoga',
  });
}

function nutritionMission(profile: UserProfile): Mission {
  const food = (profile.foodPreference || '').toLowerCase();
  const title = food.includes('protein')
    ? 'Scan a high-protein meal'
    : food.includes('vegan') || food.includes('vegetarian')
      ? 'Scan your plant-based meal'
      : 'Scan your lunch';
  return mission({
    id: 'nutrition',
    title,
    category: 'nutrition',
    label: 'Nutrition',
    duration: 2,
    calories: 0,
    difficulty: '',
    accentColor: colors.light.mint,
    icon: 'camera',
    href: '/scan-food',
  });
}

function recipeMission(profile: UserProfile): Mission {
  const food = profile.foodPreference && profile.foodPreference !== 'No preference' ? profile.foodPreference : '';
  const title = food ? `${food} dinner recipe` : 'AI dinner recipe';
  return mission({
    id: 'recipe',
    title,
    category: 'recipe',
    label: 'Recipe',
    duration: 5,
    calories: 0,
    difficulty: '',
    accentColor: colors.light.warmYellow,
    icon: 'book-open',
    href: '/recipe',
  });
}

export function buildDailyMissions(
  profile: UserProfile,
  catalog?: CatalogBundle,
  _completedLessonIds: string[] = []
): Mission[] {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const training = trainingMissions(profile, catalog);
  const yoga = yogaMission(profile);
  const nutrition = nutritionMission(profile);
  const recipe = recipeMission(profile);

  if (focus === 'yoga' || focus === 'flexibility' || focus === 'stress') {
    return [training[0], yoga, training[1], nutrition, recipe];
  }
  if (focus === 'pregnancy' || focus === 'postpartum') {
    return [training[0], yoga, nutrition, recipe, training[1]];
  }
  return [training[0], training[1], yoga, nutrition, recipe];
}

export function mergeMissionCompletion(current: Mission[], next: Mission[]): Mission[] {
  return next.map((missionItem, index) => {
    const byId = current.find((item) => item.id === missionItem.id);
    const byLesson = missionItem.lessonId
      ? current.find((item) => item.lessonId === missionItem.lessonId)
      : undefined;
    const byCategory = current.find(
      (item) => item.category === missionItem.category && item.completed
    );
    const byIndex = current[index];
    const completed = Boolean(
      byId?.completed ||
        byLesson?.completed ||
        byCategory?.completed ||
        (byIndex && byIndex.category === missionItem.category && byIndex.completed && byIndex.id === missionItem.id)
    );
    return { ...missionItem, completed };
  });
}

export function missionsNeedRefresh(current: Mission[], next: Mission[]): boolean {
  if (!current.length) return true;
  if (current.length !== next.length) return true;
  return current.some((item, index) => {
    const other = next[index];
    return item.id !== other.id || item.title !== other.title || item.href !== other.href;
  });
}

export function weekPreview(goal: string): { day: string; items: string[] }[] {
  const [first, second] = TEMPLATE_TITLES[detectFocus(goal)];
  const short = (value: string) => value.replace(/^\d+\s*min\s*/i, '');
  return [
    { day: 'Mon', items: [short(first), 'Food Scan'] },
    { day: 'Tue', items: [short(second), 'Yoga'] },
    { day: 'Wed', items: [short(first), 'Food Scan'] },
    { day: 'Thu', items: ['Recovery yoga', short(second)] },
    { day: 'Fri', items: [short(first), 'Food Scan'] },
    { day: 'Sat', items: ['Mobility & breath', 'Progress review'] },
    { day: 'Sun', items: ['Rest day', 'Meal prep'] },
  ];
}

export type PersonalizedPlan = {
  planName: string;
  focusLabel: string;
  missions: Mission[];
  weekSchedule: { day: string; items: string[] }[];
  stats: {
    missionsPerDay: number;
    weeks: number;
    focusAreas: number;
    dailyMinutes: number;
  };
  courseNames: string[];
  hasCatalogLessons: boolean;
};

function shortenMissionTitle(title: string, max = 44) {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

/** Week 1 preview built from the same missions the user will see on Today. */
export function weekPreviewFromMissions(missions: Mission[]): { day: string; items: string[] }[] {
  const training = missions.filter((m) => m.category === 'fitness' || m.category === 'safety');
  const yoga = missions.find((m) => m.category === 'yoga');
  const nutrition = missions.find((m) => m.category === 'nutrition');
  const recipe = missions.find((m) => m.category === 'recipe');
  const t0 = training[0];
  const t1 = training[1] || training[0];

  const row = (items: (Mission | string | undefined)[]) =>
    items
      .filter(Boolean)
      .map((item) => (typeof item === 'string' ? item : shortenMissionTitle(item.title)));

  return [
    { day: 'Mon', items: row([t0, nutrition]) },
    { day: 'Tue', items: row([t1, yoga]) },
    { day: 'Wed', items: row([t0, nutrition]) },
    { day: 'Thu', items: row([yoga, t1]) },
    { day: 'Fri', items: row([t0, nutrition]) },
    { day: 'Sat', items: row([yoga, recipe]) },
    { day: 'Sun', items: row(['Rest & recovery', recipe ? recipe.title : 'Light meal prep']) },
  ];
}

/** Builds plan + missions from onboarding answers and the live Supabase catalog (no OpenAI). */
export function buildPersonalizedPlan(profile: UserProfile, catalog?: CatalogBundle): PersonalizedPlan {
  const missions = buildDailyMissions(profile, catalog);
  const planName = planNameForGoal(profile.goal);
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const meta = FOCUS_META[focus];

  const courseNames = [
    ...new Set(
      missions
        .map((m) => (m.courseId ? catalog?.courses.find((c) => c.id === m.courseId)?.title : undefined))
        .filter(Boolean) as string[]
    ),
  ];

  const hasCatalogLessons = missions.some((m) => Boolean(m.lessonId));
  const categories = new Set(missions.map((m) => m.category));
  const dailyMinutes = missions.reduce((sum, m) => sum + (m.duration || 0), 0);

  return {
    planName,
    focusLabel: meta.label,
    missions,
    weekSchedule: weekPreviewFromMissions(missions),
    stats: {
      missionsPerDay: missions.length,
      weeks: 8,
      focusAreas: categories.size,
      dailyMinutes,
    },
    courseNames,
    hasCatalogLessons,
  };
}
