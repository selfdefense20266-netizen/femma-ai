import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function OnboardingLayout() {
  const { onboardingCompleted, accountReady } = useApp();

  useEffect(() => {
    if (!accountReady) return;
    if (onboardingCompleted) {
      router.replace('/(tabs)');
    }
  }, [accountReady, onboardingCompleted]);

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
      <Stack.Screen name="subscription" />
    </Stack>
  );
}
