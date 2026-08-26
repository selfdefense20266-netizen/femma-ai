export function flattenLessons(courses = []) {
  return courses.flatMap((course) =>
    (course.modules || []).flatMap((module) =>
      (module.lessons || []).map((item) => ({
        ...item,
        courseId: course.id,
        courseTitle: course.title,
        categoryId: course.categoryId,
        moduleId: module.id,
        moduleTitle: module.title
      }))
    )
  );
}

export function countCourseStats(course) {
  const modules = course.modules?.length || 0;
  const lessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const awaiting =
    course.modules?.reduce(
      (sum, m) =>
        sum +
        (m.lessons || []).filter((l) => {
          const status = l.videoStatus || (l.videoUrl ? 'ready' : 'awaiting');
          return status !== 'ready';
        }).length,
      0
    ) || 0;
  return { modules, lessons, awaiting };
}
