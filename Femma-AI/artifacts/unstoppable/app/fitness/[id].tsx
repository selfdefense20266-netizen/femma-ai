import { useLocalSearchParams } from 'expo-router';
import CourseDetailScreen from '@/components/library/CourseDetailScreen';

export default function FitnessCourseRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const courseId = Array.isArray(id) ? id[0] : id;
  return <CourseDetailScreen categoryId="fitness" courseId={courseId ?? ''} />;
}
