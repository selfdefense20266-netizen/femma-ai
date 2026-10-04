import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import AppLoading from '@/components/AppLoading';

/** Profile filled far enough that restarting goals would be wrong — resume at paywall. */
function shouldResumeAtSubscription(profile: {
  goal?: string;
  experience?: string;
  heightCm?: number | null;
  weightKg?: number | null;
}) {
  return Boolean(
    profile.goal &&
      profile.experience &&
      (profile.heightCm || profile.weightKg)
  );
}

export default function EntryScreen() {
  const colors = useColors();
  const { user, loading: authLoading } = useAuth();
  const { onboardingCompleted, accountReady, profile } = useApp();

  useEffect(() => {
    if (authLoading || !accountReady) return;

    if (!user) {
      router.replace('/welcome');
      return;
    }

    // Prefer cloud/local progress (synced in AppContext) over a lone AsyncStorage flag.
    if (onboardingCompleted) {
      router.replace('/(tabs)');
    } else if (shouldResumeAtSubscription(profile)) {
      router.replace('/onboarding/subscription');
    } else {
      router.replace('/onboarding');
    }
  }, [authLoading, accountReady, user, onboardingCompleted, profile]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppLoading />
    </View>
  );
}
