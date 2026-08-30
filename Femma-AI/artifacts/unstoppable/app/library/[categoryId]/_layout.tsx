import { Stack } from 'expo-router';

export default function LibraryCategoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="player" />
    </Stack>
  );
}
