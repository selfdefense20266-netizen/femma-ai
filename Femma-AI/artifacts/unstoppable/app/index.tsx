import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';

export default function EntryScreen() {
  const colors = useColors();

  useEffect(() => {
    const check = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        if (completed === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/welcome');
        }
      } catch {
        router.replace('/welcome');
      }
    };
    check();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
