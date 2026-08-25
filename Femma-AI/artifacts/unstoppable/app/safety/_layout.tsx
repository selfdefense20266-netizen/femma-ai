import { Stack } from 'expo-router';
export default function SafetyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
