import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { fetchResolvedDailyPlan, type DailyPlan } from '@/lib/dailyPlans';

export function useDailyPlan() {
  const { user } = useAuth();
  const { profile } = useApp();
  const email = user?.email || null;
  const journeyDay = profile.journeyDay || 1;
  const dailyPlanId = (profile as { dailyPlanId?: string }).dailyPlanId || '';

  return useQuery<DailyPlan | null>({
    queryKey: [
      'daily-plan',
      email,
      profile.goal,
      profile.isPregnant,
      profile.fitnessLevel,
      journeyDay,
      dailyPlanId,
    ],
    queryFn: () => fetchResolvedDailyPlan(profile, email),
    enabled: Boolean(email || profile.goal || profile.fitnessLevel || dailyPlanId),
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
