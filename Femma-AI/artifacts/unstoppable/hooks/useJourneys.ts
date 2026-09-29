import { useQuery } from '@tanstack/react-query';
import { fetchJourneys, type Journey } from '@/lib/journeys';

export function useJourneys() {
  return useQuery<Journey[]>({
    queryKey: ['journeys'],
    queryFn: fetchJourneys,
    staleTime: 60_000,
  });
}
