import { useQuery } from '@tanstack/react-query';
import { fetchPublishedRecoverySections, type RecoverySection } from '@/lib/recoverySections';

export function useRecoverySections() {
  return useQuery<RecoverySection[]>({
    queryKey: ['recovery-sections'],
    queryFn: fetchPublishedRecoverySections,
    staleTime: 60_000,
  });
}
