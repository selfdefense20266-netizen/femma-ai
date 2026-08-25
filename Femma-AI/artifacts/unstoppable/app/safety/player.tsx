import { useLocalSearchParams } from 'expo-router';
import LessonPlayerScreen from '@/components/library/LessonPlayerScreen';

export default function SafetyLessonRoute() {
  const { lessonId } = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const id = Array.isArray(lessonId) ? lessonId[0] : lessonId;
  return <LessonPlayerScreen categoryId="safety" lessonId={id ?? ''} />;
}
