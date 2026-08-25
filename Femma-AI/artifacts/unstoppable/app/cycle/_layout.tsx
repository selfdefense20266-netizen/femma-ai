import { Stack } from 'expo-router';
export default function CycleLayout() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /></Stack>;
}
