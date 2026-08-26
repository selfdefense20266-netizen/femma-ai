import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function EntryScreen() {
  const colors = useColors();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const check = async () => {
      try {
        if (!user) {
          router.replace('/welcome');
          return;
        }
        const completed = await AsyncStorage.getItem('onboarding_completed');
        if (completed === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/welcome');
      }
    };
    check();
  }, [loading, user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
