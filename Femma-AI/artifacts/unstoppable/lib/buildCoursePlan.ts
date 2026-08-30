import type { Mission, UserProfile } from '@/context/AppContext';
import colors from '@/constants/colors';
import { getCourseLessons, libraryPath, type CatalogBundle, type VideoCourse } from '@/lib/catalog';
import { courseIdsForProfile, detectFocus, planNameForGoal } from '@/lib/dailyMissions';
import {
  addDays,
  planTotalDays,
  type PlanDay,
  type PlanWatchCourse,
  type TrainingPlan,
} from '@/lib/trainingPlan';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TODAY_SLOT_ORDER: Record<string, number> = {
  course: 0,
  exercise: 1,
  recipe: 2,
  meal: 3,
};

export function isTodayCourseMission(item: { slot?: string; label?: string }) {
  return item.slot === 'course' || item.label === 'Course' || item.label === 'Watch';
}

export function sortTodayMissions<T extends { slot?: string; category?: string; label?: string }>(missions: T[]): T[] {
  return [...missions]
    .filter((item) => !isTodayCourseMission(item))
    .sort((a, b) => {
      const rank = (item: T) => {
        if (item.slot && item.slot in TODAY_SLOT_ORDER) return TODAY_SLOT_ORDER[item.slot];
        if (item.category === 'recipe') return 2;
        if (item.category === 'nutrition') return 3;
        return 1;
      };
      return rank(a) - rank(b);
    });
}

function mission(partial: Omit<Mission, 'completed'> & { completed?: boolean }): Mission {
  return { completed: false, ...partial };
}

function watchCoursesFromCatalog(catalog: CatalogBundle | undefined, courseIds: string[]): PlanWatchCourse[] {
  if (!catalog) return [];
  return courseIds
    .map((id) => catalog.courses.find((course) => course.id === id))
    .filter((course): course is VideoCourse => Boolean(course))
    .map((course) => {
      const lessons = getCourseLessons(course);
      return {
        id: course.id,
        title: course.title,
        categoryId: course.categoryId,
        lessons: lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          durationMinutes: lesson.durationMinutes || 15,
          href: libraryPath(course.categoryId, undefined, lesson.id),
        })),
      };
    });
}

function lessonPool(courses: PlanWatchCourse[]) {
  return courses.flatMap((course) =>
    course.lessons.map((lesson) => ({
      ...lesson,
      courseId: course.id,
      categoryId: course.categoryId,
    }))
  );
}

export function missionsFromPlanDay(plan: TrainingPlan | null | undefined, journeyDay: number): Mission[] {
  if (!plan?.days?.length) return [];
  const index = Math.min(plan.days.length, Math.max(1, journeyDay)) - 1;
  return sortTodayMissions((plan.days[index]?.items || []).map((item) => ({ ...item })));
}

export function weekPreviewFromPlan(plan: TrainingPlan | null | undefined): { day: string; items: string[] }[] {
  const firstWeek = (plan?.days || []).filter((row) => row.week === 1);
  if (!firstWeek.length) return [];
  return firstWeek.map((row) => ({
    day: row.weekday,
    items: row.items.map((item) => item.title),
  }));
}

function patchPlanItem(
  plan: TrainingPlan,
  journeyDay: number,
  missionId: string,
  patch: Partial<Mission>
): TrainingPlan {
  const dayIndex = Math.min(plan.days.length, Math.max(1, journeyDay)) - 1;
  return {
    ...plan,
    days: plan.days.map((row, index) =>
      index === dayIndex
        ? {
            ...row,
            items: row.items.map((item) =>
              item.id === missionId || item.lessonId === missionId ? { ...item, ...patch } : item
            ),
          }
        : row
    ),
  };
}

export function markPlanItemComplete(plan: TrainingPlan, journeyDay: number, missionId: string): TrainingPlan {
  return patchPlanItem(plan, journeyDay, missionId, { completed: true, skipped: false });
}

export function markPlanItemSkipped(plan: TrainingPlan, journeyDay: number, missionId: string): TrainingPlan {
  return patchPlanItem(plan, journeyDay, missionId, { skipped: true, completed: false });
}

function padDayItems(items: Mission[], day: number): Mission[] {
  const extras = [
    mission({
      id: `d${day}-water`,
      title: 'Drink 2L of water',
      category: 'nutrition',
      label: 'Nutrition',
      duration: 2,
      calories: 0,
      difficulty: '',
      accentColor: colors.light.mint,
      icon: 'droplet',
      href: '/scan-food',
    }),
    mission({
      id: `d${day}-breath`,
      title: '5 min breathwork',
      category: 'yoga',
      label: 'Yoga',
      duration: 5,
      calories: 15,
      difficulty: 'Beginner',
      accentColor: colors.light.lavender,
      icon: 'wind',
      href: '/yoga',
    }),
    mission({
      id: `d${day}-walk`,
      title: '10 min walk',
      category: 'fitness',
      label: 'Fitness',
      duration: 10,
      calories: 50,
      difficulty: 'Beginner',
      accentColor: colors.light.pink,
      icon: 'activity',
      href: '/library',
    }),
    mission({
      id: `d${day}-log`,
      title: 'Log how you feel',
      category: 'nutrition',
      label: 'Nutrition',
      duration: 3,
      calories: 0,
      difficulty: '',
      accentColor: colors.light.mint,
      icon: 'edit-3',
      href: '/scan-food',
    }),
    mission({
      id: `d${day}-stretch`,
      title: 'Evening stretch',
      category: 'yoga',
      label: 'Yoga',
      duration: 8,
      calories: 20,
      difficulty: 'Beginner',
      accentColor: colors.light.lavender,
      icon: 'wind',
      href: '/yoga',
    }),
  ];
  const next = [...items];
  let i = 0;
  while (next.length < 5) {
    const extra = extras[i % extras.length];
    next.push({ ...extra, id: `${extra.id}-${i}` });
    i += 1;
  }
  return next;
}

export function buildFullTrainingPlan(profile: UserProfile, catalog?: CatalogBundle): TrainingPlan {
  const weeks = profile.planDurationWeeks || 8;
  const totalDays = planTotalDays(weeks);
  const startedAt = profile.planStartedAt || new Date().toISOString();
  const courseIds = courseIdsForProfile(profile);
  const watchCourses = watchCoursesFromCatalog(catalog, courseIds);
  const lessons = lessonPool(watchCourses);
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const food = profile.foodPreference || 'Eat everything';
  const gentle = profile.isPregnant || focus === 'pregnancy' || focus === 'postpartum';
  const days: PlanDay[] = [];
  let lessonCursor = 0;

  for (let day = 1; day <= totalDays; day += 1) {
    const weekdayIndex = (day - 1) % 7;
    const weekday = WEEKDAYS[weekdayIndex];
    const isSunday = weekday === 'Sun';
    const items: Mission[] = [];

    if (isSunday) {
      items.push(
        mission({
          id: `d${day}-rest`,
          title: 'Rest & recovery',
          category: 'yoga',
          label: 'Recovery',
          duration: 15,
          calories: 40,
          difficulty: 'Beginner',
          accentColor: colors.light.lavender,
          icon: 'sunrise',
          href: '/yoga',
        }),
        mission({
          id: `d${day}-prep`,
          title: food.toLowerCase().includes('eat everything') ? 'Meal prep for the week' : `${food} meal prep`,
          category: 'recipe',
          label: 'Nutrition',
          duration: 20,
          calories: 0,
          difficulty: '',
          accentColor: colors.light.warmYellow,
          icon: 'book-open',
          href: '/recipe',
        })
      );
    } else {
      const lesson = lessons.length ? lessons[lessonCursor % lessons.length] : null;
      if (lesson) {
        lessonCursor += 1;
        items.push(
          mission({
            id: `d${day}-watch`,
            title: lesson.title,
            category: focus === 'yoga' || gentle ? 'yoga' : /sd-|self|box|mma|karate/.test(lesson.courseId) ? 'safety' : 'fitness',
            label: 'Watch',
            duration: lesson.durationMinutes,
            calories: Math.round(lesson.durationMinutes * 7),
            difficulty: profile.fitnessLevel || 'Beginner',
            accentColor: colors.light.pink,
            icon: 'play',
            href: lesson.href,
            courseId: lesson.courseId,
            lessonId: lesson.id,
          })
        );
      }

      if (weekday === 'Tue' || weekday === 'Thu' || weekday === 'Sat') {
        items.push(
          mission({
            id: `d${day}-yoga`,
            title: gentle ? '10 min prenatal / recovery yoga' : '10 min mobility yoga',
            category: 'yoga',
            label: 'Yoga',
            duration: 10,
            calories: 60,
            difficulty: 'Beginner',
            accentColor: colors.light.lavender,
            icon: 'wind',
            href: '/yoga',
          })
        );
      }

      if (weekday === 'Mon' || weekday === 'Wed' || weekday === 'Fri') {
        items.push(
          mission({
            id: `d${day}-scan`,
            title: food.toLowerCase().includes('protein') ? 'Scan a high-protein meal' : 'Scan today’s meal',
            category: 'nutrition',
            label: 'Nutrition',
            duration: 2,
            calories: 0,
            difficulty: '',
            accentColor: colors.light.mint,
            icon: 'camera',
            href: '/scan-food',
          })
        );
      }

      if (weekday === 'Sat') {
        items.push(
          mission({
            id: `d${day}-recipe`,
            title: `${food} dinner recipe`,
            category: 'recipe',
            label: 'Recipe',
            duration: 5,
            calories: 0,
            difficulty: '',
            accentColor: colors.light.warmYellow,
            icon: 'book-open',
            href: '/recipe',
          })
        );
      }
    }

    days.push({
      day,
      week: Math.ceil(day / 7),
      weekday,
      items: padDayItems(items, day),
    });
  }

  return {
    id: profile.trainingPlan?.id || `plan-${Date.now()}`,
    planName: planNameForGoal(profile.goal),
    goal: profile.goal,
    durationWeeks: weeks,
    foodPreference: food,
    fitnessLevel: profile.fitnessLevel,
    environment: profile.environment,
    courseIds: watchCourses.map((course) => course.id),
    courseNames: watchCourses.map((course) => course.title),
    watchCourses,
    days,
    startedAt,
    endsAt: addDays(startedAt, totalDays),
    status: 'active',
    generatedBy: 'catalog',
  };
}
