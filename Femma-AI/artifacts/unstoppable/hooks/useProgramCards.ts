import { useQuery } from '@tanstack/react-query';
import { fetchPublishedProgramCards, type ProgramCard } from '@/lib/programCards';

export function useProgramCards() {
  return useQuery<ProgramCard[]>({
    queryKey: ['program-cards'],
    queryFn: fetchPublishedProgramCards,
    staleTime: 60_000,
  });
}
