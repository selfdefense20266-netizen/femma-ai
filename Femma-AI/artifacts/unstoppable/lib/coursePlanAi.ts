import type { Mission, MissionCategory, UserProfile } from '@/context/AppContext';
import colors from '@/constants/colors';
import { libraryPath, type CatalogBundle } from '@/lib/catalog';
import { supabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { addDays, planTotalDays, type PlanWatchCourse, type TrainingPlan } from '@/lib/trainingPlan';
import { linkPlanToCatalog } from '@/lib/missionHref';

type AiTask = {
  title?: string;
  category?: string;
  duration?: number;
  course_id?: string;
  lesson_id?: string;
};

type AiDay = {
  day?: number;
  week?: number;
  weekday?: string;
  tasks?: AiTask[];
};

type AiWatch = {
  id?: string;
  title?: string;
  start_week?: number;
};

type AiPlan = {
  plan_name?: string;
  duration_weeks?: number;
  extended?: boolean;
  extend_reason?: string;
  watch_courses?: AiWatch[];
  days?: AiDay[];
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATEGORIES: MissionCategory[] = ['fitness', 'yoga', 'safety', 'nutrition', 'recipe'];

const PAD_TASKS: AiTask[] = [
  { title: 'Drink 2L of water', category: 'nutrition', duration: 2 },
  { title: '5 min breathwork', category: 'yoga', duration: 5 },
  { title: '10 min walk', category: 'fitness', duration: 10 },
  { title: 'Log how you feel', category: 'nutrition', duration: 3 },
  { title: 'Evening stretch', category: 'yoga', duration: 8 },
];

function asCategory(value?: string): MissionCategory {
  const raw = String(value || '').toLowerCase();
  return CATEGORIES.includes(raw as MissionCategory) ? (raw as MissionCategory) : 'fitness';
}

function accentFor(category: MissionCategory) {
  if (category === 'yoga') return colors.light.lavender;
  if (category === 'safety') return colors.light.skyBlue;
  if (category === 'nutrition') return colors.light.mint;
  if (category === 'recipe') return colors.light.warmYellow;
  return colors.light.pink;
}

function iconFor(category: MissionCategory) {
  if (category === 'yoga') return 'wind';
  if (category === 'safety') return 'shield';
  if (category === 'nutrition') return 'camera';
  if (category === 'recipe') return 'book-open';
  return 'play';
}

function hrefFor(task: AiTask, catalog?: CatalogBundle) {
  if (task.category === 'nutrition') return '/scan-food';
  if (task.category === 'recipe') return '/recipe';
  if (task.category === 'yoga' && !task.lesson_id && !task.course_id) return '/yoga';
  const course = catalog?.courses.find((item) => item.id === task.course_id);
  if (task.lesson_id && course) return libraryPath(course.categoryId, undefined, task.lesson_id);
  if (course) return libraryPath(course.categoryId, course.id);
  return '';
}

function toMission(task: AiTask, day: number, index: number, catalog?: CatalogBundle): Mission {
  const category = asCategory(task.category);
  const duration = Math.max(2, Number(task.duration) || 15);
  return {
    id: `d${day}-t${index}`,
    title: String(task.title || `Task ${index + 1}`).trim(),
    category,
    label: task.lesson_id || task.course_id ? 'Watch' : category[0].toUpperCase() + category.slice(1),
    duration,
    calories: category === 'nutrition' || category === 'recipe' ? 0 : Math.round(duration * 6),
    difficulty: '',
    completed: false,
    accentColor: accentFor(category),
    icon: task.lesson_id || task.course_id ? 'play' : iconFor(category),
    href: hrefFor(task, catalog),
    courseId: task.course_id || undefined,
    lessonId: task.lesson_id || undefined,
  };
}

function padTasks(tasks: AiTask[], day: number): AiTask[] {
  const next = [...tasks];
  let i = 0;
  while (next.length < 5) {
    next.push({ ...PAD_TASKS[i % PAD_TASKS.length] });
    i += 1;
  }
  return next;
}

function watchCoursesFromAi(plan: AiPlan, catalog?: CatalogBundle): PlanWatchCourse[] {
  const fromWatch = (plan.watch_courses || []).map((item) => String(item.id || '')).filter(Boolean);
  const fromDays = (plan.days || []).flatMap((row) =>
    (row.tasks || []).map((task) => String(task.course_id || '')).filter(Boolean)
  );
  const unique = Array.from(new Set([...fromWatch, ...fromDays]));
  if (!catalog) {
    return unique.map((id) => ({
      id,
      title: plan.watch_courses?.find((item) => item.id === id)?.title || id,
      categoryId: '',
      startWeek: plan.watch_courses?.find((item) => item.id === id)?.start_week,
      lessons: [],
    }));
  }
  return unique
    .map((id) => catalog.courses.find((course) => course.id === id))
    .filter(Boolean)
    .map((course) => ({
      id: course!.id,
      title: course!.title,
      categoryId: course!.categoryId,
      startWeek: plan.watch_courses?.find((item) => item.id === course!.id)?.start_week,
      lessons: course!.modules.flatMap((mod) =>
        mod.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          durationMinutes: lesson.durationMinutes || 15,
          href: libraryPath(course!.categoryId, undefined, lesson.id),
        }))
      ),
    }));
}

export function trainingPlanFromAi(profile: UserProfile, ai: AiPlan, catalog?: CatalogBundle): TrainingPlan {
  const weeks = Math.max(profile.planDurationWeeks || 8, Number(ai.duration_weeks) || profile.planDurationWeeks || 8);
  const startedAt = profile.planStartedAt || new Date().toISOString();
  const watchCourses = watchCoursesFromAi(ai, catalog);
  const days = (ai.days || []).map((row, index) => {
    const day = Number(row.day) || index + 1;
    const tasks = padTasks(Array.isArray(row.tasks) ? row.tasks : [], day);
    return {
      day,
      week: Number(row.week) || Math.ceil(day / 7),
      weekday: row.weekday || WEEKDAYS[(day - 1) % 7],
      items: tasks.map((task, taskIndex) => toMission(task, day, taskIndex, catalog)),
    };
  });

  return linkPlanToCatalog(
    {
      id: profile.trainingPlan?.id || `plan-${Date.now()}`,
      planName: String(ai.plan_name || 'Personalized Plan'),
      goal: profile.goal,
      durationWeeks: weeks,
      foodPreference: profile.foodPreference,
      fitnessLevel: profile.fitnessLevel,
      environment: profile.environment,
      courseIds: watchCourses.map((course) => course.id),
      courseNames: watchCourses.map((course) => course.title),
      watchCourses,
      days,
      startedAt,
      endsAt: addDays(startedAt, planTotalDays(weeks)),
      status: 'active',
      generatedBy: 'ai',
    },
    catalog
  );
}

export async function generateAiCoursePlan(profile: UserProfile, catalog?: CatalogBundle): Promise<TrainingPlan> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const existing = profile.trainingPlan;
  if (existing?.days?.length) return existing;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || supabaseAnonKey;
  const payload = {
    goal: profile.goal,
    durationWeeks: profile.planDurationWeeks || 8,
    fitnessLevel: profile.fitnessLevel,
    dailyTime: profile.dailyTime,
    foodPreference: profile.foodPreference,
    environment: profile.environment,
    cyclePhase: profile.cyclePhase,
    isPregnant: profile.isPregnant,
  };

  const post = async (auth: string, signal: AbortSignal) =>
    fetch(`${supabaseUrl}/functions/v1/openai-course-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
      signal,
    });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75000);
  let response: Response;
  try {
    response = await post(token, controller.signal);
    if (response.status === 401 && token !== supabaseAnonKey) {
      response = await post(supabaseAnonKey, controller.signal);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Plan generation timed out. Please try again.');
    }
    throw new Error(
      'Could not reach the plan service. Deploy openai-course-plan, then try again.'
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let json: { error?: string; message?: string; code?: string; plan?: AiPlan } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('AI plan response was invalid.');
  }
  if (response.status === 404 || json.code === 'NOT_FOUND') {
    throw new Error('The plan service is not deployed yet. Deploy openai-course-plan, then try again.');
  }
  if (!response.ok || json.error || !json.plan?.days?.length) {
    throw new Error(json.error || json.message || 'Could not generate your course plan.');
  }

  return trainingPlanFromAi(profile, json.plan, catalog);
}
