import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AuthBackground } from '@/components/AuthBackground';
import { AuthField } from '@/components/AuthField';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, padX, isCompact } = useResponsive();
  const { login } = useAuth();
  const { updateProfile } = useApp();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError('');
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    updateProfile({ name: `${result.user.firstName} ${result.user.lastName}`.trim() });
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      router.replace(completed === 'true' ? '/(tabs)' : '/onboarding');
    } catch {
      router.replace('/onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <AuthBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 16,
            paddingBottom: botPad + 28,
            paddingHorizontal: padX,
          },
        ]}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Feather name="chevron-left" size={22} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(450)} style={styles.brand}>
            <View style={[styles.logoMark, { backgroundColor: colors.pink, width: isCompact ? 52 : 60, height: isCompact ? 52 : 60 }]}>
              <Text style={styles.logoLetter}>U</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to continue your Unstoppable journey.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.form}>
            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@email.com"
            />
            <AuthField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              placeholder="Enter your password"
              onToggleSecure={() => setShowPassword((v) => !v)}
              secureVisible={showPassword}
            />
            {error ? <Text style={[styles.formError, { color: colors.coral }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.pink, opacity: submitting ? 0.7 : 1 }]}
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Logging in...' : 'Log In'}</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => router.push('/signup')}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              New here? <Text style={{ color: colors.pink }}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', flexGrow: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 28 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontFamily: 'Manrope_500Medium' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoMark: { borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoLetter: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.65)', textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  form: { gap: 16 },
  formError: { fontSize: 13, fontFamily: 'Manrope_500Medium', textAlign: 'center' },
  primaryBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
  switchBtn: { marginTop: 22, alignItems: 'center' },
  switchText: { fontSize: 15, color: 'rgba(255,255,255,0.65)', fontFamily: 'Manrope_400Regular' },
});
