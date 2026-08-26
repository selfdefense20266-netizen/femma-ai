import type { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export type LibraryCategoryId = string;

export type VideoLesson = {
  id: string;
  title: string;
  durationMinutes: number;
  description: string;
  videoUrl: string | null;
  uploadKey: string;
  thumbnailUrl: string | null;
  muxPlaybackId?: string | null;
  videoStatus?: string;
};

export type VideoModule = {
  id: string;
  title: string;
  description: string;
  lessons: VideoLesson[];
};

export type VideoCourse = {
  id: string;
  categoryId: LibraryCategoryId;
  title: string;
  shortTitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  gradient: readonly [string, string];
  level: string;
  equipment: string;
  disclaimer?: string;
  modules: VideoModule[];
};

export type VideoCategory = {
  id: LibraryCategoryId;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  gradient: readonly [string, string];
  courses: VideoCourse[];
};

export type CatalogBundle = {
  categories: VideoCategory[];
  courses: VideoCourse[];
};

/** App route aliases → Supabase category ids */
const CATEGORY_ALIASES: Record<string, string> = {
  safety: 'self-defence',
  'self-defense': 'self-defence',
  fitness: 'fitness',
  nutrition: 'diet-nutrition',
  diet: 'diet-nutrition',
  cycle: 'cycle-pregnancy-health',
  pregnancy: 'cycle-pregnancy-health',
};

const ICON_ALIASES: Record<string, keyof typeof Feather.glyphMap> = {
  apple: 'shopping-bag',
  dumbbell: 'activity',
  shield: 'shield',
  heart: 'heart',
  baby: 'smile',
  barbell: 'activity',
  body: 'user',
  bolt: 'zap',
  book: 'book',
  bookmark: 'bookmark',
  calendar: 'calendar',
  cart: 'shopping-cart',
  circle: 'circle',
  droplet: 'droplet',
  fight: 'crosshair',
  fist: 'box',
  hand: 'users',
  'heart-pulse': 'activity',
  kick: 'triangle',
  lotus: 'sunrise',
  people: 'users',
  run: 'trending-up',
  scale: 'bar-chart-2',
  scan: 'camera',
  spa: 'wind',
  sparkles: 'star',
  stretch: 'move',
  target: 'target',
  utensils: 'coffee',
  zap: 'zap',
  activity: 'activity',
  wind: 'wind',
};

/** Unique Feather icons per course id (avoids duplicates within a category). */
const COURSE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  'cph-menstrual-cycle': 'calendar',
  'cph-pregnancy': 'heart',
  'cph-postpartum': 'smile',
  'cph-recovery-wellness': 'sunrise',
  'dn-meal-scanner': 'camera',
  'dn-ai-meal-planner': 'cpu',
  'dn-recipes': 'coffee',
  'dn-nutrition-basics': 'book',
  'dn-nutrition-by-goal': 'target',
  'dn-grocery-planner': 'shopping-cart',
  'dn-hydration': 'droplet',
  'dn-saved-meals': 'bookmark',
  'fit-foundations': 'flag',
  'fit-strength': 'activity',
  'fit-cardio': 'heart',
  'fit-hiit': 'zap',
  'fit-yoga': 'wind',
  'fit-pilates': 'aperture',
  'fit-core': 'circle',
  'fit-mobility': 'move',
  'fit-weight-loss': 'trending-down',
  'fit-endurance': 'trending-up',
  'sd-foundations': 'shield',
  'sd-boxing': 'box',
  'sd-jiu-jitsu': 'git-merge',
  'sd-taekwondo': 'triangle',
  'sd-karate': 'hexagon',
  'sd-mma': 'crosshair',
};

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  'self-defence': 'shield',
  fitness: 'activity',
  'diet-nutrition': 'shopping-bag',
  'cycle-pregnancy-health': 'heart',
};

function toFeatherIcon(raw?: string | null): keyof typeof Feather.glyphMap {
  const key = String(raw || 'book').trim().toLowerCase();
  if (ICON_ALIASES[key]) return ICON_ALIASES[key];

  const glyphMap = Feather.glyphMap as Record<string, number>;
  if (glyphMap[key] != null) {
    return key as keyof typeof Feather.glyphMap;
  }

  return 'book-open';
}

function courseIcon(courseId: string, raw?: string | null): keyof typeof Feather.glyphMap {
  return COURSE_ICONS[courseId] || toFeatherIcon(raw);
}

function categoryIcon(categoryId: string, raw?: string | null): keyof typeof Feather.glyphMap {
  return CATEGORY_ICONS[categoryId] || toFeatherIcon(raw);
}

function lighten(hex: string, amount = 0.28): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return hex;
  const num = parseInt(cleaned, 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function gradientFor(color: string): readonly [string, string] {
  return [color || '#F26BB5', lighten(color || '#F26BB5')];
}

export function resolveCategoryId(categoryId: string): string {
  const key = String(categoryId || '').trim().toLowerCase();
  return CATEGORY_ALIASES[key] || key;
}

export function libraryPath(categoryId: string, courseId?: string, lessonId?: string) {
  const id = resolveCategoryId(categoryId);
  if (lessonId) return `/library/${id}/player?lessonId=${encodeURIComponent(lessonId)}`;
  if (courseId) return `/library/${id}/${courseId}`;
  return `/library/${id}`;
}

function resolveVideoUrl(row: {
  video_url?: string | null;
  mux_playback_id?: string | null;
  video_status?: string | null;
}): string | null {
  if (row.video_url) return row.video_url;
  if (row.mux_playback_id) return `https://stream.mux.com/${row.mux_playback_id}.m3u8`;
  return null;
}

function mapLesson(row: any): VideoLesson {
  return {
    id: row.id,
    title: row.title,
    durationMinutes: row.duration_minutes ?? 10,
    description: row.description || '',
    videoUrl: resolveVideoUrl(row),
    uploadKey: row.upload_key || '',
    thumbnailUrl: row.thumbnail_url || null,
    muxPlaybackId: row.mux_playback_id || null,
    videoStatus: row.video_status || (row.video_url || row.mux_playback_id ? 'ready' : 'awaiting'),
  };
}

function mapModule(row: any, lessonRows: any[]): VideoModule {
  const lessons = lessonRows
    .filter((l) => l.module_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(mapLesson);

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    lessons,
  };
}

function mapCourse(row: any, moduleRows: any[], lessonRows: any[]): VideoCourse {
  const color = row.color || '#F26BB5';
  const modules = moduleRows
    .filter((m) => m.course_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => mapModule(m, lessonRows));

  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    shortTitle: row.short_title || row.title,
    description: row.description || '',
    icon: courseIcon(row.id, row.icon),
    color,
    gradient: gradientFor(color),
    level: row.level || 'All levels',
    equipment: row.equipment || 'None',
    disclaimer: row.disclaimer || undefined,
    modules,
  };
}

function mapCategory(row: any, courses: VideoCourse[]): VideoCategory {
  const color = row.color || '#F26BB5';
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    description: row.description || '',
    icon: categoryIcon(row.id, row.icon),
    color,
    gradient: gradientFor(color),
    courses: courses.filter((c) => c.categoryId === row.id),
  };
}

/** App features that were seeded as courses — never show in the video library. */
const FEATURE_COURSE_IDS = new Set([
  'dn-meal-scanner',
  'dn-ai-meal-planner',
  'dn-saved-meals',
  'dn-grocery-planner',
  'dn-recipes',
]);

export async function fetchCatalog(): Promise<CatalogBundle> {
  const [categoriesRes, coursesRes, modulesRes, lessonsRes] = await Promise.all([
    supabase.from('categories').select('*').eq('status', 'published').order('title'),
    supabase.from('courses').select('*').eq('status', 'published').order('sort_order'),
    supabase.from('modules').select('*').order('sort_order'),
    supabase.from('lessons').select('*').order('sort_order'),
  ]);

  const firstError = categoriesRes.error || coursesRes.error || modulesRes.error || lessonsRes.error;
  if (firstError) throw firstError;

  const moduleRows = modulesRes.data || [];
  const lessonRows = lessonsRes.data || [];
  const courses = (coursesRes.data || [])
    .filter((row) => !FEATURE_COURSE_IDS.has(row.id))
    .map((row) => mapCourse(row, moduleRows, lessonRows));
  const categories = (categoriesRes.data || []).map((row) => mapCategory(row, courses));

  return { categories, courses };
}

export function getCourseLessons(course: VideoCourse): VideoLesson[] {
  return course.modules.flatMap((module) => module.lessons);
}

/** Completed lessons count as 1; in-progress lessons count by saved watch % (0–1). */
export function courseProgressPercent(
  lessons: { id: string }[],
  completedLessonIds: string[],
  lessonWatchProgress: Record<string, number> = {}
) {
  if (!lessons.length) return 0;
  const units = lessons.reduce((sum, lesson) => {
    if (completedLessonIds.includes(lesson.id)) return sum + 1;
    return sum + Math.min(1, Math.max(0, (lessonWatchProgress[lesson.id] ?? 0) / 100));
  }, 0);
  return Math.round((units / lessons.length) * 100);
}

export function getVideoCategory(catalog: CatalogBundle, categoryId: string): VideoCategory | undefined {
  const id = resolveCategoryId(categoryId);
  return catalog.categories.find((c) => c.id === id);
}

export function getVideoCourse(catalog: CatalogBundle, courseId: string): VideoCourse | undefined {
  return catalog.courses.find((c) => c.id === courseId);
}

export function getVideoLessonContext(catalog: CatalogBundle, lessonId: string) {
  for (const course of catalog.courses) {
    const lessons = getCourseLessons(course);
    const index = lessons.findIndex((item) => item.id === lessonId);
    if (index < 0) continue;
    const category = catalog.categories.find((c) => c.id === course.categoryId);
    if (!category) continue;
    const lesson = lessons[index];
    const module = course.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
    if (!module) continue;
    return {
      category,
      course,
      module,
      lesson,
      previousLesson: lessons[index - 1] || null,
      nextLesson: lessons[index + 1] || null,
      lessonNumber: index + 1,
      lessonCount: lessons.length,
    };
  }
  return null;
}
