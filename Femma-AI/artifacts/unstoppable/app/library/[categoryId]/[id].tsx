import { useLocalSearchParams } from 'expo-router';
import CourseDetailScreen from '@/components/library/CourseDetailScreen';

export default function LibraryCourseRoute() {
  const { categoryId, id } = useLocalSearchParams<{ categoryId?: string | string[]; id?: string | string[] }>();
  const cat = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  const courseId = Array.isArray(id) ? id[0] : id;
  return <CourseDetailScreen categoryId={cat ?? ''} courseId={courseId ?? ''} />;
}
