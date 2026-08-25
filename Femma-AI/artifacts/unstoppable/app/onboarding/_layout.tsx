import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="lifestyle" />
      <Stack.Screen name="cycle" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="reveal" />
    </Stack>
  );
}
