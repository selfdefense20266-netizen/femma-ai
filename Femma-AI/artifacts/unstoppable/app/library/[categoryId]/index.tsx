import { useLocalSearchParams } from 'expo-router';
import LibraryHubScreen from '@/components/library/LibraryHubScreen';

export default function LibraryCategoryRoute() {
  const { categoryId } = useLocalSearchParams<{ categoryId?: string | string[] }>();
  const id = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  return <LibraryHubScreen categoryId={id ?? ''} />;
}
