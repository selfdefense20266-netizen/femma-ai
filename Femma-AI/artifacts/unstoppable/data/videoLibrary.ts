/**
 * Legacy mock video library removed.
 * Catalog types and helpers now live in `@/lib/catalog` (Supabase-backed).
 */
export {
  getCourseLessons,
  getVideoCategory,
  getVideoCourse,
  getVideoLessonContext,
  resolveCategoryId,
  libraryPath,
  type LibraryCategoryId,
  type VideoLesson,
  type VideoModule,
  type VideoCourse,
  type VideoCategory,
  type CatalogBundle,
} from '@/lib/catalog';
