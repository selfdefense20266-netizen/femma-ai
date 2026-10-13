import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function OnboardingLayout() {
  const { onboardingCompleted, accountReady } = useApp();
  const segments = useSegments() as string[];
  const leaf = segments[segments.length - 1];
  // reveal → subscription is the paywall hand-off; don't yank the user into tabs mid-transition.
  const onPaywallStep = leaf === 'subscription' || leaf === 'reveal';

  useEffect(() => {
    if (!accountReady) return;
    // reveal.tsx saves onboarding before the paywall — the subscription step must stay visible.
    // It routes into the app itself once access is granted.
    if (onboardingCompleted && !onPaywallStep) {
      router.replace('/(tabs)');
    }
  }, [accountReady, onboardingCompleted, onPaywallStep]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="lifestyle" />
      <Stack.Screen name="height" />
      <Stack.Screen name="weight" />
      <Stack.Screen name="cycle" />
      <Stack.Screen name="duration" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="reveal" />
      <Stack.Screen name="subscription" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
