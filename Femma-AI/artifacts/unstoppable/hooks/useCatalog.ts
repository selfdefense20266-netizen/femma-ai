import { useQuery } from '@tanstack/react-query';
import {
  fetchCatalog,
  getVideoCategory,
  getVideoCourse,
  getVideoLessonContext,
  resolveCategoryId,
  type CatalogBundle,
} from '@/lib/catalog';

export function useCatalog() {
  return useQuery<CatalogBundle>({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    staleTime: 60_000,
  });
}

export function useCatalogCategory(categoryId: string) {
  const query = useCatalog();
  const resolvedId = resolveCategoryId(categoryId);
  const category = query.data ? getVideoCategory(query.data, resolvedId) : undefined;
  return { ...query, category, categoryId: resolvedId };
}

export function useCatalogCourse(courseId: string) {
  const query = useCatalog();
  const course = query.data ? getVideoCourse(query.data, courseId) : undefined;
  return { ...query, course };
}

export function useCatalogLesson(lessonId: string) {
  const query = useCatalog();
  const context = query.data && lessonId ? getVideoLessonContext(query.data, lessonId) : null;
  return { ...query, context };
}
