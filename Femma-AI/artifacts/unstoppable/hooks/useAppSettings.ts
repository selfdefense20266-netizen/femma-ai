import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOME_TITLES, fetchAppHomeTitles, type AppHomeTitles } from '@/lib/appSettings';

export function useAppHomeTitles() {
  return useQuery<AppHomeTitles>({
    queryKey: ['app-home-titles'],
    queryFn: fetchAppHomeTitles,
    staleTime: 60_000,
    placeholderData: DEFAULT_HOME_TITLES,
  });
}
