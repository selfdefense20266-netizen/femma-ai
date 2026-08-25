import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function FitnessLayout() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
