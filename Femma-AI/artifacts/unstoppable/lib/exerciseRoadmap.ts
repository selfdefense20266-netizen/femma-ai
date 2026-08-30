import {
  ANIMATION_STEPS,
  CATEGORY_WEEKS,
  FOOD_MEALS,
  FOOD_RECIPES,
  ROADMAP_CATEGORIES,
  ROADMAP_ENVIRONMENTS,
  ROADMAP_TIMES,
  ROADMAP_WEEKS,
  WEEKDAYS,
  type CategoryWeek,
  type ExerciseMove,
  type MissionSlot,
  type RoadmapCategoryId,
} from './exerciseRoadmapData';

export {
  ROADMAP_CATEGORIES,
  ROADMAP_ENVIRONMENTS,
  ROADMAP_TIMES,
  ROADMAP_WEEKS,
  WEEKDAYS,
};

type MissionCategory = 'fitness' | 'yoga' | 'safety' | 'nutrition' | 'recipe';

type Mission = {
  id: string;
  title: string;
  category: MissionCategory;
  duration: number;
  calories: number;
  difficulty: string;
  completed: boolean;
  skipped?: boolean;
  accentColor: string;
  icon: string;
  label?: string;
  href?: string;
  courseId?: string;
  lessonId?: string;
  slot?: MissionSlot;
  cue?: string;
  animation?: string;
  steps?: string[];
};

type PlanDay = {
  day: number;
  week: number;
  weekday: string;
  items: Mission[];
};

type TrainingPlan = {
  id: string;
  planName: string;
  goal: string;
  durationWeeks: number;
  foodPreference: string;
  fitnessLevel: string;
  environment: string;
  courseIds: string[];
  courseNames: string[];
  watchCourses: { id: string; title: string; categoryId: string; startWeek?: number; lessons: { id: string; title: string; durationMinutes: number; href: string }[] }[];
  days: PlanDay[];
  startedAt: string;
  endsAt: string;
  status: 'active' | 'completed';
  generatedBy?: 'ai' | 'catalog' | 'roadmap';
};

type UserProfile = {
  goal: string;
  dailyTime: string;
  environment: string;
  foodPreference: string;
  fitnessLevel: string;
  planDurationWeeks: number;
  planStartedAt?: string;
  trainingPlan?: TrainingPlan | null;
  isPregnant?: boolean;
  name?: string;
};

export type RoadmapTask = {
  slot: MissionSlot;
  title: string;
  category: Mission['category'];
  label: string;
  duration: number;
  calories: number;
  difficulty: string;
  accentColor: string;
  icon: string;
  href?: string;
  courseId?: string;
  cue?: string;
  animation?: string;
  steps?: string[];
};

export type RoadmapWeekDay = {
  weekday: (typeof WEEKDAYS)[number];
  items: RoadmapTask[];
};

export type ExerciseRoadmapRow = {
  id: string;
  category: RoadmapCategoryId;
  daily_time: string;
  environment: string;
  duration_weeks: number;
  plan_name: string;
  tasks_per_day: number;
  total_days: number;
  week_days: RoadmapWeekDay[];
  days: PlanDay[];
};

const ACCENT = {
  course: '#77CDED',
  meal: '#A9E4D2',
  recipe: '#FFD88A',
  exercise: '#F26BB5',
  yoga: '#B9A7F2',
};

const TIME_MINUTES: Record<string, number> = {
  '15 min': 15,
  '20–30 min': 25,
  '30–45 min': 35,
  '45–60 min': 50,
  '60+ min': 60,
};

/** All Today tasks should finish inside this window (buffer under the selected time). */
const SESSION_BUDGET: Record<string, number> = {
  '15 min': 15,
  '20–30 min': 20,
  '30–45 min': 28,
  '45–60 min': 40,
  '60+ min': 50,
};

const RECIPE_MIN = 4;
const SCAN_MIN = 2;
const EASY_ANIMATIONS = new Set(['walk', 'stretch', 'breath', 'recover', 'prenatal', 'hip', 'flow', 'guard', 'plank']);

const CATEGORY_TOKENS: Record<RoadmapCategoryId, string[]> = {
  boxing: ['box', 'jab', 'punch', 'guard', 'shadow'],
  mma: ['mma', 'sprawl', 'kick', 'clinch'],
  karate: ['karate', 'kata', 'kick', 'punch', 'stance'],
  selfdefense: ['strike', 'palm', 'defense', 'wrist', 'guard'],
  weight_loss: ['walk', 'burn', 'squat', 'cardio'],
  tone: ['sculpt', 'lunge', 'glute', 'tone'],
  muscle: ['squat', 'strength', 'press', 'hinge'],
  hiit: ['interval', 'burst', 'tabata', 'sprint'],
  yoga: ['yoga', 'flow', 'sun', 'breath', 'savasana'],
  flexibility: ['stretch', 'hip', 'fold', 'mobility'],
  stress: ['breath', 'calm', 'restore', 'walk'],
  confidence: ['stance', 'strike', 'power', 'posture'],
  pregnancy: ['prenatal', 'supported', 'gentle', 'breath'],
  postpartum: ['recover', 'gentle', 'reconnect', 'walk'],
};

function planTotalDays(weeks?: number) {
  return Math.max(7, (weeks || 8) * 7);
}

function addDays(iso: string, days: number) {
  const date = new Date(iso || Date.now());
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function normalizeEnvironment(value: string) {
  const raw = (value || 'home').toLowerCase();
  if (raw.includes('gym') && raw.includes('home')) return 'both';
  if (raw.includes('gym')) return 'gym';
  if (raw.includes('both')) return 'both';
  return 'home';
}

export function minutesForDailyTime(dailyTime: string) {
  return TIME_MINUTES[dailyTime] || 25;
}

export function sessionBudgetMinutes(dailyTime: string) {
  return SESSION_BUDGET[dailyTime] || 20;
}

function levelKey(level: string): 'beginner' | 'intermediate' | 'active' {
  const value = (level || '').toLowerCase();
  if (value.includes('active') || value.includes('advanced')) return 'active';
  if (value.includes('intermediate')) return 'intermediate';
  if (value.includes('basic') || value.includes('beginner')) return 'beginner';
  return 'beginner';
}

export function exerciseCountForDay(fitnessLevel: string, dailyTime: string, _monday = false) {
  const level = levelKey(fitnessLevel);
  const budget = sessionBudgetMinutes(dailyTime);
  let count = 3;
  if (level === 'intermediate') {
    count = budget <= 20 ? 3 : budget <= 28 ? 4 : 5;
  } else if (level === 'active') {
    count = budget <= 12 ? 3 : budget <= 20 ? 4 : budget <= 28 ? 5 : budget <= 40 ? 6 : 7;
  }
  return Math.max(3, count);
}

export function primaryRoadmapCategory(goal: string): RoadmapCategoryId {
  const chunks = String(goal || '')
    .split(/[,/&+]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  for (const chunk of chunks) {
    const exact = ROADMAP_CATEGORIES.find((id) => id === chunk || id.replace(/_/g, '') === chunk.replace(/[-_\s]/g, ''));
    if (exact) return exact;
    if (/box/.test(chunk)) return 'boxing';
    if (/mma/.test(chunk)) return 'mma';
    if (/karate/.test(chunk)) return 'karate';
    if (/self.?defen/.test(chunk)) return 'selfdefense';
    if (/weight.?loss|lose weight/.test(chunk)) return 'weight_loss';
    if (/hiit/.test(chunk)) return 'hiit';
    if (/yoga/.test(chunk)) return 'yoga';
    if (/flexib/.test(chunk)) return 'flexibility';
    if (/muscle|strength/.test(chunk)) return 'muscle';
    if (/tone|sculpt/.test(chunk)) return 'tone';
    if (/postpartum/.test(chunk)) return 'postpartum';
    if (/pregnan/.test(chunk)) return 'pregnancy';
    if (/stress|calm/.test(chunk)) return 'stress';
    if (/confidence/.test(chunk)) return 'confidence';
  }
  return 'hiit';
}

function foodKey(preference: string) {
  const key = Object.keys(FOOD_RECIPES).find((item) => item.toLowerCase() === (preference || '').toLowerCase());
  return key || 'Eat everything';
}

function dietLine(food: string, kind: 'recipe' | 'meal') {
  const diet = food === 'Eat everything' ? '' : food;
  if (kind === 'recipe') {
    return diet
      ? `Fits your ${diet.toLowerCase()} meals — only what you can eat.`
      : 'A balanced recipe for your training plan.';
  }
  return diet
    ? `Scan to check calories and whether it fits ${diet.toLowerCase()}.`
    : 'Scan your plate for calories and plan fit.';
}

function envLabel(environment: string) {
  if (environment === 'gym') return 'at the gym';
  if (environment === 'both') return 'home or gym';
  return 'at home';
}

function pickMoves(pack: CategoryWeek, environment: string, weekdayIndex: number): [ExerciseMove, ExerciseMove] {
  if (environment === 'gym') return pack.gym[weekdayIndex] || pack.home[weekdayIndex];
  if (environment === 'both') {
    return weekdayIndex % 2 === 0 ? pack.home[weekdayIndex] : pack.gym[weekdayIndex];
  }
  return pack.home[weekdayIndex];
}

function softenMove(move: ExerciseMove, fitnessLevel: string): ExerciseMove {
  if (levelKey(fitnessLevel) !== 'beginner') return move;
  if (move.animation === 'jump') {
    return {
      title: 'Easy march with guard',
      animation: 'walk',
      cue: 'Light steps, hands up, no bouncing.',
      steps: ANIMATION_STEPS.walk,
    };
  }
  const easyTitle = move.title
    .replace(/\b(power|interval|heavy|speed)\b/gi, 'easy')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    ...move,
    title: easyTitle,
    cue: `Easy pace — ${move.cue}`,
  };
}

function collectMoves(
  pack: CategoryWeek,
  environment: string,
  weekdayIndex: number,
  count: number,
  fitnessLevel: string
): ExerciseMove[] {
  const pool: ExerciseMove[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 7; offset += 1) {
    const pair = pickMoves(pack, environment, (weekdayIndex + offset) % 7);
    for (const item of pair) {
      if (!item || seen.has(item.title)) continue;
      seen.add(item.title);
      pool.push(softenMove(item, fitnessLevel));
    }
  }
  if (levelKey(fitnessLevel) === 'beginner') {
    const easy = pool.filter((item) => EASY_ANIMATIONS.has(item.animation));
    const rest = pool.filter((item) => !EASY_ANIMATIONS.has(item.animation));
    const firstSkill = softenMove(pickMoves(pack, environment, weekdayIndex)[0], fitnessLevel);
    const unique = [firstSkill, ...[...easy, ...rest].filter((item) => item.title !== firstSkill.title)];
    pool.splice(0, pool.length, ...unique);
  }
  if (!pool.length) {
    pool.push(softenMove(pickMoves(pack, environment, weekdayIndex)[0], fitnessLevel));
  }
  while (pool.length < count) {
    pool.push(pool[pool.length % pool.length]);
  }
  return pool.slice(0, count);
}

function splitExerciseMinutes(total: number, count: number): number[] {
  const safeCount = Math.max(1, count);
  const base = Math.max(1, Math.floor(Math.max(total, safeCount) / safeCount));
  const parts = Array.from({ length: safeCount }, () => base);
  let leftover = Math.max(total, safeCount) - base * safeCount;
  let index = 0;
  while (leftover > 0) {
    parts[index % safeCount] += 1;
    leftover -= 1;
    index += 1;
  }
  return parts;
}

function difficultyFromLevel(level: string) {
  const key = levelKey(level);
  if (key === 'active') return 'Advanced';
  if (key === 'intermediate') return 'Intermediate';
  return 'Beginner';
}

function calorieRate(level: string) {
  const key = levelKey(level);
  if (key === 'active') return 10;
  if (key === 'intermediate') return 8;
  return 6;
}

function task(partial: RoadmapTask): RoadmapTask {
  return partial;
}

export function buildRoadmapWeekDays(input: {
  category: RoadmapCategoryId;
  dailyTime: string;
  environment: string;
  foodPreference?: string;
  fitnessLevel?: string;
}): RoadmapWeekDay[] {
  const pack = CATEGORY_WEEKS[input.category];
  const environment = normalizeEnvironment(input.environment);
  const budget = sessionBudgetMinutes(input.dailyTime);
  const food = foodKey(input.foodPreference || 'Eat everything');
  const meals = FOOD_MEALS[food] || FOOD_MEALS['Eat everything'];
  const recipes = FOOD_RECIPES[food] || FOOD_RECIPES['Eat everything'];
  const difficulty = difficultyFromLevel(input.fitnessLevel || '');
  const cal = calorieRate(input.fitnessLevel || '');
  const where = envLabel(environment);
  const exerciseCategory = pack.missionCategory === 'yoga' ? 'yoga' : pack.missionCategory;
  const exerciseAccent = pack.missionCategory === 'yoga' ? ACCENT.yoga : ACCENT.exercise;
  const exerciseLabel = pack.missionCategory === 'safety' ? 'Skill' : pack.missionCategory === 'yoga' ? 'Yoga' : 'Training';

  return WEEKDAYS.map((weekday, index) => {
    const exerciseCount = exerciseCountForDay(input.fitnessLevel || '', input.dailyTime);
    const leftover = Math.max(exerciseCount, budget - RECIPE_MIN - SCAN_MIN);
    const times = splitExerciseMinutes(leftover, exerciseCount);
    const moves = collectMoves(pack, environment, index, exerciseCount, input.fitnessLevel || '');
    const icons = [
      pack.missionCategory === 'safety' ? 'shield' : pack.missionCategory === 'yoga' ? 'wind' : 'zap',
      pack.missionCategory === 'safety' ? 'target' : pack.missionCategory === 'yoga' ? 'sun' : 'activity',
      pack.missionCategory === 'safety' ? 'shield' : pack.missionCategory === 'yoga' ? 'heart' : 'zap',
      'activity',
      'zap',
      'wind',
    ];
    const exercises = moves.map((move, moveIndex) =>
      task({
        slot: 'exercise',
        title: `${times[moveIndex]} min ${move.title} ${where}`,
        category: exerciseCategory,
        label: exerciseLabel,
        duration: times[moveIndex],
        calories: times[moveIndex] * cal,
        difficulty,
        accentColor: exerciseAccent,
        icon: icons[moveIndex] || 'zap',
        href: `/exercise-guide?animation=${encodeURIComponent(move.animation)}`,
        cue: move.cue,
        animation: move.animation,
        steps: move.steps,
      })
    );
    const daily = [
      ...exercises,
      task({
        slot: 'recipe',
        title: recipes[index],
        category: 'recipe',
        label: 'Recipe',
        duration: RECIPE_MIN,
        calories: 0,
        difficulty: '',
        accentColor: ACCENT.recipe,
        icon: 'book-open',
        href: '/recipe',
        cue: dietLine(food, 'recipe'),
      }),
      task({
        slot: 'meal',
        title: meals[index],
        category: 'nutrition',
        label: 'Scan',
        duration: SCAN_MIN,
        calories: 0,
        difficulty: '',
        accentColor: ACCENT.meal,
        icon: 'camera',
        href: '/scan-food',
        cue: dietLine(food, 'meal'),
      }),
    ];
    const items = daily;
    return { weekday, items };
  });
}

export function roadmapRowId(category: string, dailyTime: string, environment: string, weeks = 8) {
  return `roadmap-${category}-${dailyTime}-${environment}-${weeks}w`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function compactDays(days: PlanDay[]): PlanDay[] {
  return days.map((day) => ({
    ...day,
    items: day.items.map(({ steps: _steps, ...item }) => item),
  }));
}

export function overlayFoodOnPlanDays(days: PlanDay[], foodPreference = 'Eat everything'): PlanDay[] {
  const food = foodKey(foodPreference);
  const meals = FOOD_MEALS[food] || FOOD_MEALS['Eat everything'];
  const recipes = FOOD_RECIPES[food] || FOOD_RECIPES['Eat everything'];
  return days.map((day) => {
    const index = (day.day - 1) % 7;
    return {
      ...day,
      items: day.items.map((item) => {
        if (item.slot === 'meal') return { ...item, title: meals[index], cue: dietLine(food, 'meal') };
        if (item.slot === 'recipe') return { ...item, title: recipes[index], cue: dietLine(food, 'recipe') };
        return item;
      }),
    };
  });
}

export function buildExerciseRoadmapRows(): ExerciseRoadmapRow[] {
  const rows: ExerciseRoadmapRow[] = [];
  for (const category of ROADMAP_CATEGORIES) {
    for (const dailyTime of ROADMAP_TIMES) {
      for (const environment of ROADMAP_ENVIRONMENTS) {
        const weekDays = buildRoadmapWeekDays({
          category,
          dailyTime,
          environment,
          foodPreference: 'Eat everything',
          fitnessLevel: 'beginner',
        });
        for (const weeks of ROADMAP_WEEKS) {
          const days = compactDays(expandRoadmapDays(weekDays, weeks, 'Eat everything'));
          const monthLabel = weeks <= 4 ? '1 month' : weeks <= 8 ? '2 month' : '3 month';
          rows.push({
            id: roadmapRowId(category, dailyTime, environment, weeks),
            category,
            daily_time: dailyTime,
            environment,
            duration_weeks: weeks,
            plan_name: `${CATEGORY_WEEKS[category].planName} · ${monthLabel} · ${dailyTime}`,
            tasks_per_day: weekDays[0]?.items.length || 4,
            total_days: days.length,
            week_days: weekDays,
            days,
          });
        }
      }
    }
  }
  return rows;
}

function toMission(item: RoadmapTask, day: number, index: number): Mission {
  return {
    id: `d${day}-${item.slot}-${index}`,
    title: item.title,
    category: item.category,
    duration: item.duration,
    calories: item.calories,
    difficulty: item.difficulty,
    completed: false,
    accentColor: item.accentColor,
    icon: item.icon,
    label: item.label,
    href: item.href,
    courseId: item.courseId,
    slot: item.slot,
    cue: item.cue,
    animation: item.animation,
    steps: item.steps,
  };
}

function overlayFood(items: RoadmapTask[], foodPreference: string, weekdayIndex: number): RoadmapTask[] {
  const food = foodKey(foodPreference);
  const meals = FOOD_MEALS[food] || FOOD_MEALS['Eat everything'];
  const recipes = FOOD_RECIPES[food] || FOOD_RECIPES['Eat everything'];
  return items.map((item) => {
    if (item.slot === 'meal') {
      return { ...item, title: meals[weekdayIndex], cue: dietLine(food, 'meal') };
    }
    if (item.slot === 'recipe') {
      return { ...item, title: recipes[weekdayIndex], cue: dietLine(food, 'recipe') };
    }
    return item;
  });
}

function progressTitle(title: string, week: number) {
  if (week <= 1) return title;
  if (week === 2) return title.replace(/^\d+ min/, (match) => match);
  return `${title} · week ${week}`;
}

export function expandRoadmapDays(
  weekDays: RoadmapWeekDay[],
  weeks: number,
  foodPreference = 'Eat everything'
): PlanDay[] {
  const totalDays = planTotalDays(weeks);
  const days: PlanDay[] = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const week = Math.ceil(day / 7);
    const weekdayIndex = (day - 1) % 7;
    const template = weekDays[weekdayIndex];
    const items = overlayFood(template.items, foodPreference, weekdayIndex).map((item, index) => {
      const mission = toMission(item, day, index);
      if (item.slot === 'exercise') {
        return {
          ...mission,
          title: progressTitle(item.title, week),
        };
      }
      return { ...mission, title: item.title };
    });
    days.push({
      day,
      week,
      weekday: template.weekday,
      items,
    });
  }
  return days;
}

export function generateRoadmapTrainingPlan(profile: Pick<
  UserProfile,
  'goal' | 'dailyTime' | 'environment' | 'foodPreference' | 'fitnessLevel' | 'planDurationWeeks' | 'planStartedAt'
> & { name?: string; trainingPlan?: UserProfile['trainingPlan'] | null; isPregnant?: boolean }): TrainingPlan {
  const category = profile.isPregnant && !/postpartum/.test(profile.goal || '')
    ? 'pregnancy'
    : primaryRoadmapCategory(profile.goal);
  const environment = normalizeEnvironment(profile.environment);
  const dailyTime = ROADMAP_TIMES.includes(profile.dailyTime as (typeof ROADMAP_TIMES)[number])
    ? profile.dailyTime
    : '20–30 min';
  const weeks = ROADMAP_WEEKS.includes((profile.planDurationWeeks || 8) as (typeof ROADMAP_WEEKS)[number])
    ? profile.planDurationWeeks || 8
    : 8;
  const weekDays = buildRoadmapWeekDays({
    category,
    dailyTime,
    environment,
    foodPreference: profile.foodPreference,
    fitnessLevel: profile.fitnessLevel,
  });
  const pack = CATEGORY_WEEKS[category];
  const startedAt = profile.planStartedAt || new Date().toISOString();
  return {
    id: profile.trainingPlan?.id || `roadmap-${category}-${Date.now()}`,
    planName: pack.planName,
    goal: profile.goal || pack.label,
    durationWeeks: weeks,
    foodPreference: profile.foodPreference || 'Eat everything',
    fitnessLevel: profile.fitnessLevel || 'beginner',
    environment,
    courseIds: pack.courseIds,
    courseNames: pack.courses.slice(0, 3).map((title) => title.replace(/^Watch:\s*/, '')),
    watchCourses: [
      {
        id: pack.courseId,
        title: pack.label,
        categoryId: pack.href.split('/')[2] || 'fitness',
        lessons: [],
      },
    ],
    days: expandRoadmapDays(weekDays, weeks, profile.foodPreference || 'Eat everything'),
    startedAt,
    endsAt: addDays(startedAt, planTotalDays(weeks)),
    status: 'active',
    generatedBy: 'roadmap',
  };
}

export type RoadmapTestFailure = { combo: string; message: string };

export function assertPlanForUser(
  profile: Pick<UserProfile, 'goal' | 'dailyTime' | 'environment' | 'foodPreference' | 'fitnessLevel' | 'planDurationWeeks'>
): RoadmapTestFailure[] {
  const failures: RoadmapTestFailure[] = [];
  const combo = `${profile.goal} | ${profile.dailyTime} | ${profile.environment} | ${profile.planDurationWeeks}w | ${profile.foodPreference}`;
  const plan = generateRoadmapTrainingPlan({ ...profile, planStartedAt: '2026-01-01T00:00:00.000Z' });
  const expectedDays = (profile.planDurationWeeks || 8) * 7;
  const category = primaryRoadmapCategory(profile.goal);
  const label = CATEGORY_WEEKS[category].label.toLowerCase();
  const tokens = CATEGORY_TOKENS[category];
  const budget = sessionBudgetMinutes(profile.dailyTime);
  const envWord = normalizeEnvironment(profile.environment) === 'gym' ? 'gym' : 'home';
  const expectedDifficulty = profile.fitnessLevel?.toLowerCase().includes('active')
    ? 'Advanced'
    : profile.fitnessLevel?.toLowerCase().includes('intermediate')
      ? 'Intermediate'
      : 'Beginner';

  if (plan.days.length !== expectedDays) {
    failures.push({ combo, message: `expected ${expectedDays} days, got ${plan.days.length}` });
  }
  if (plan.generatedBy !== 'roadmap') {
    failures.push({ combo, message: 'generatedBy should be roadmap' });
  }

  for (const day of plan.days) {
    const slots = day.items.map((item) => item.slot);
    const meal = day.items.find((item) => item.slot === 'meal');
    const recipe = day.items.find((item) => item.slot === 'recipe');
    const exercises = day.items.filter((item) => item.slot === 'exercise');
    const courses = day.items.filter((item) => item.slot === 'course');
    const expectedExercises = exerciseCountForDay(profile.fitnessLevel || 'beginner', profile.dailyTime);
    const expectedSlots = [
      ...Array.from({ length: expectedExercises }, () => 'exercise'),
      'recipe',
      'meal',
    ];
    if (slots.join(',') !== expectedSlots.join(',')) {
      failures.push({ combo, message: `day ${day.day} (${day.weekday}) slots are ${slots.join(',')}` });
      break;
    }
    if (courses.length) {
      failures.push({ combo, message: `day ${day.day} should not include a course` });
      break;
    }
    if (!meal || !recipe || exercises.length < 3 || exercises.length !== expectedExercises) {
      failures.push({ combo, message: `day ${day.day} missing meal/recipe/exercises` });
      break;
    }
    if (exercises.some((item) => item.difficulty && item.difficulty !== expectedDifficulty)) {
      failures.push({ combo, message: `day ${day.day} difficulty ${exercises[0]?.difficulty} != ${expectedDifficulty}` });
      break;
    }
    const hay = day.items.map((item) => item.title.toLowerCase()).join(' ');
    if (day.day === 1 && !hay.includes(label) && !tokens.some((token) => hay.includes(token))) {
      failures.push({ combo, message: `day ${day.day} missing ${category} training content` });
      break;
    }
    const mealHay = `${meal.title} ${recipe.title}`.toLowerCase();
    const food = (profile.foodPreference || '').toLowerCase();
    if (food && food !== 'eat everything') {
      const needle = food.replace(/-/g, ' ').split(' ')[0];
      if (needle && !mealHay.includes(needle)) {
        failures.push({ combo, message: `day ${day.day} missing food preference in meal/recipe (${mealHay})` });
        break;
      }
    }
    const dayMinutes = day.items.reduce((sum, item) => sum + (item.duration || 0), 0);
    if (dayMinutes > budget + 1) {
      failures.push({ combo, message: `day ${day.day} total ${dayMinutes} min exceeds ${budget} min budget` });
      break;
    }
    const env = normalizeEnvironment(profile.environment);
    const hasEnv = env === 'both' ? hay.includes('home') || hay.includes('gym') : hay.includes(envWord);
    if (!hasEnv) {
      failures.push({ combo, message: `day ${day.day} missing environment ${env}` });
      break;
    }
    if (exercises.some((item) => !item.animation)) {
      failures.push({ combo, message: `day ${day.day} missing exercise animation` });
      break;
    }
  }
  return failures;
}

export function runRoadmapTests() {
  const failures: RoadmapTestFailure[] = [];
  const foods = ['Eat everything', 'Vegetarian', 'Vegan', 'High protein'];
  let checked = 0;
  for (const category of ROADMAP_CATEGORIES) {
    for (const dailyTime of ROADMAP_TIMES) {
      for (const environment of ROADMAP_ENVIRONMENTS) {
        for (const weeks of ROADMAP_WEEKS) {
          const foodPreference = foods[checked % foods.length];
          failures.push(
            ...assertPlanForUser({
              goal: category,
              dailyTime,
              environment,
              foodPreference,
              fitnessLevel: 'beginner',
              planDurationWeeks: weeks,
            })
          );
          checked += 1;
        }
      }
    }
  }
  failures.push(
    ...assertPlanForUser({
      goal: 'boxing',
      dailyTime: '60+ min',
      environment: 'gym',
      foodPreference: 'Eat everything',
      fitnessLevel: 'active',
      planDurationWeeks: 4,
    })
  );
  failures.push(
    ...assertPlanForUser({
      goal: 'boxing',
      dailyTime: '20–30 min',
      environment: 'home',
      foodPreference: 'Eat everything',
      fitnessLevel: 'intermediate',
      planDurationWeeks: 4,
    })
  );
  return {
    checked,
    failed: failures.length,
    failures: failures.slice(0, 20),
    rows:
      ROADMAP_CATEGORIES.length *
      ROADMAP_TIMES.length *
      ROADMAP_ENVIRONMENTS.length *
      ROADMAP_WEEKS.length,
  };
}
