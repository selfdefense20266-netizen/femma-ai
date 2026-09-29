import { useEffect } from 'react';
import { router } from 'expo-router';
import AppLoading from '@/components/AppLoading';

/** Duration (1/2/3 months) removed — admin plans are 1–30 days per activity. */
export default function DurationStepRedirect() {
  useEffect(() => {
    router.replace('/onboarding/plan');
  }, []);

  return <AppLoading />;
}
