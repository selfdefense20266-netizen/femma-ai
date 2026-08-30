import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { PurchaseProvider } from '@/context/PurchaseContext';
import { NotificationProvider } from '@/context/NotificationContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'default' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="scan-food" options={{ headerShown: false }} />
      <Stack.Screen name="library" options={{ headerShown: false }} />
      <Stack.Screen name="fitness" options={{ headerShown: false }} />
      <Stack.Screen name="yoga" options={{ headerShown: false }} />
      <Stack.Screen name="safety" options={{ headerShown: false }} />
      <Stack.Screen name="cycle" options={{ headerShown: false }} />
      <Stack.Screen name="nutrition" options={{ headerShown: false }} />
      <Stack.Screen name="recipe" options={{ headerShown: false }} />
      <Stack.Screen name="exercise-guide" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) setReady(true);
    const timer = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#F6F1EA' }} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <KeyboardProvider>
              <AuthProvider>
                <PurchaseProvider>
                  <AppProvider>
                    <NotificationProvider>
                      <RootLayoutNav />
                    </NotificationProvider>
                  </AppProvider>
                </PurchaseProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
