import { useLocalSearchParams } from 'expo-router';
import LessonPlayerScreen from '@/components/library/LessonPlayerScreen';

export default function LibraryLessonRoute() {
  const { categoryId, lessonId } = useLocalSearchParams<{
    categoryId?: string | string[];
    lessonId?: string | string[];
  }>();
  const cat = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  const id = Array.isArray(lessonId) ? lessonId[0] : lessonId;
  return <LessonPlayerScreen categoryId={cat ?? ''} lessonId={id ?? ''} />;
}
