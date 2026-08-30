import type { Mission } from '@/context/AppContext';
import {
  getCourseLessons,
  libraryPath,
  type CatalogBundle,
  type VideoCourse,
  type VideoLesson,
} from '@/lib/catalog';
import type { TrainingPlan } from '@/lib/trainingPlan';

type LessonHit = {
  course: VideoCourse;
  lesson: VideoLesson;
  score: number;
};

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string) {
  return normalize(value).split(' ').filter((word) => word.length > 2);
}

function scoreAgainst(query: string, target: string) {
  const hay = normalize(target);
  const words = tokens(query);
  let score = 0;
  for (const word of words) {
    if (hay.includes(word)) score += word.length >= 5 ? 4 : 2;
  }
  const compact = normalize(query);
  if (compact && hay.includes(compact)) score += 8;
  return score;
}

const KEYWORDS: Array<{ test: RegExp; boost: string[] }> = [
  { test: /box|punch|shadow/, boost: ['box'] },
  { test: /mma|mixed martial/, boost: ['mma'] },
  { test: /karate/, boost: ['karate'] },
  { test: /taekwondo/, boost: ['taekwondo'] },
  { test: /jiu|bjj|grappl/, boost: ['jiu'] },
  { test: /self.?defen/, boost: ['defen', 'safety'] },
  { test: /hiit|interval/, boost: ['hiit'] },
  { test: /yoga|breath|stretch|flow/, boost: ['yoga'] },
  { test: /pregnan|prenatal/, boost: ['pregnan'] },
  { test: /postpartum|recovery/, boost: ['postpartum'] },
  { test: /cardio|walk|run/, boost: ['cardio'] },
  { test: /strength|sculpt|tone|muscle/, boost: ['strength', 'tone'] },
  { test: /pilates|core/, boost: ['pilates', 'core'] },
];

function keywordBoost(query: string, target: string) {
  const hay = normalize(target);
  let extra = 0;
  for (const rule of KEYWORDS) {
    if (!rule.test.test(query)) continue;
    if (rule.boost.some((token) => hay.includes(token))) extra += 6;
  }
  return extra;
}

export function isBrowseOnlyHref(href?: string) {
  if (!href) return true;
  const path = href.split('?')[0].replace(/\/$/, '');
  if (path === '/library') return true;
  const parts = path.split('/').filter(Boolean);
  return parts[0] === 'library' && parts.length === 2 && parts[1] !== 'player';
}

function courseIdFromOverviewHref(href?: string) {
  if (!href) return '';
  const parts = href.split('?')[0].split('/').filter(Boolean);
  if (parts[0] === 'library' && parts.length === 3 && parts[2] !== 'player') return parts[2];
  return '';
}

function firstWatchableLesson(course: VideoCourse) {
  const lessons = getCourseLessons(course);
  return lessons.find((item) => item.videoUrl) || lessons[0];
}

function preferredCourses(plan: TrainingPlan | null | undefined, catalog: CatalogBundle): VideoCourse[] {
  const fromPlan = (plan?.watchCourses || [])
    .map((item) => catalog.courses.find((course) => course.id === item.id))
    .filter((course): course is VideoCourse => Boolean(course));
  if (fromPlan.length) return fromPlan;
  const fromIds = (plan?.courseIds || [])
    .map((id) => catalog.courses.find((course) => course.id === id))
    .filter((course): course is VideoCourse => Boolean(course));
  return fromIds.length ? fromIds : catalog.courses;
}

function findLesson(catalog: CatalogBundle, lessonId: string): LessonHit | null {
  for (const course of catalog.courses) {
    const lesson = getCourseLessons(course).find((item) => item.id === lessonId);
    if (lesson) return { course, lesson, score: 100 };
  }
  return null;
}

function bestLessonMatch(title: string, courses: VideoCourse[]): LessonHit | null {
  let best: LessonHit | null = null;
  for (const course of courses) {
    for (const lesson of getCourseLessons(course)) {
      const score =
        scoreAgainst(title, lesson.title) +
        scoreAgainst(title, course.title) +
        keywordBoost(title, `${course.title} ${course.id} ${lesson.title}`);
      if (!best || score > best.score) best = { course, lesson, score };
    }
  }
  return best;
}

function bestCourseMatch(title: string, courses: VideoCourse[]): { course: VideoCourse; score: number } | null {
  let best: { course: VideoCourse; score: number } | null = null;
  for (const course of courses) {
    const score = scoreAgainst(title, course.title) + keywordBoost(title, `${course.title} ${course.id}`);
    if (!best || score > best.score) best = { course, score };
  }
  return best;
}

function applyLesson(mission: Mission, hit: { course: VideoCourse; lesson: VideoLesson }): Mission {
  return {
    ...mission,
    courseId: hit.course.id,
    lessonId: hit.lesson.id,
    label: mission.category === 'yoga' ? 'Yoga' : 'Watch',
    icon: 'play',
    href: libraryPath(hit.course.categoryId, undefined, hit.lesson.id),
  };
}

function applyCourse(mission: Mission, course: VideoCourse): Mission {
  const lesson = firstWatchableLesson(course);
  if (lesson) return applyLesson(mission, { course, lesson });
  return {
    ...mission,
    courseId: course.id,
    label: 'Watch',
    icon: 'play',
    href: libraryPath(course.categoryId, course.id),
  };
}

export function bindMissionToCatalog(
  mission: Mission,
  catalog?: CatalogBundle,
  plan?: TrainingPlan | null
): Mission {
  if (mission.category === 'nutrition') return { ...mission, href: '/scan-food' };
  if (mission.category === 'recipe') return { ...mission, href: '/recipe' };

  if (!catalog?.courses?.length) {
    if (mission.category === 'yoga') return { ...mission, href: mission.href && !isBrowseOnlyHref(mission.href) ? mission.href : '/yoga' };
    return mission;
  }

  if (mission.lessonId) {
    const hit = findLesson(catalog, mission.lessonId);
    if (hit) return applyLesson(mission, hit);
  }

  if (mission.courseId) {
    const course = catalog.courses.find((item) => item.id === mission.courseId);
    if (course) return applyCourse(mission, course);
  }

  const overviewId = courseIdFromOverviewHref(mission.href);
  if (overviewId) {
    const course = catalog.courses.find((item) => item.id === overviewId);
    if (course) return applyCourse(mission, course);
  }

  if (!isBrowseOnlyHref(mission.href) && mission.href !== '/yoga') return mission;

  const pool = preferredCourses(plan, catalog);
  const lessonHit = bestLessonMatch(mission.title, pool);
  if (lessonHit && lessonHit.score >= 4) return applyLesson(mission, lessonHit);

  const courseHit = bestCourseMatch(mission.title, pool);
  if (courseHit && courseHit.score >= 4 && mission.category !== 'yoga') {
    return applyCourse(mission, courseHit.course);
  }

  if (mission.category === 'yoga') return { ...mission, href: '/yoga', icon: 'wind' };

  if (mission.category === 'fitness' || mission.category === 'safety') {
    const fallback = pool[0] || catalog.courses[0];
    if (fallback) return applyCourse(mission, fallback);
  }

  return mission;
}

export function resolveMissionHref(
  mission: Mission,
  plan?: TrainingPlan | null,
  catalog?: CatalogBundle
) {
  return bindMissionToCatalog(mission, catalog, plan).href || '/yoga';
}

export function planNeedsCatalogLinks(plan?: TrainingPlan | null) {
  if (!plan?.days?.length) return false;
  return plan.days.some((day) =>
    day.items.some(
      (item) =>
        (item.category === 'fitness' || item.category === 'safety' || item.category === 'yoga') &&
        isBrowseOnlyHref(item.href)
    )
  );
}

export function linkPlanToCatalog(plan: TrainingPlan, catalog?: CatalogBundle): TrainingPlan {
  if (!catalog?.courses?.length) return plan;
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      items: day.items.map((item) => bindMissionToCatalog(item, catalog, plan)),
    })),
  };
}
