import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AuthField } from '@/components/AuthField';
import { BrandLogo } from '@/components/BrandLogo';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/hooks/useResponsive';
import { routeAfterAuth } from '@/lib/authRouting';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, padX, isCompact } = useResponsive();
  const { login, loginWithGoogle, loginWithApple, user, loading: authLoading } = useAuth();
  const { updateProfile, onboardingCompleted, accountReady } = useApp();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple' | null>(null);

  const finish = async (user: { firstName: string; lastName: string; email: string }) => {
    await routeAfterAuth(user, { updateProfile, onboardingCompleted, accountReady });
  };

  // Already signed in (e.g. back-navigated here, or OAuth finished elsewhere) — go to the app entry.
  useEffect(() => {
    if (authLoading || !user) return;
    router.replace('/');
  }, [authLoading, user]);

  const onSubmit = async () => {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await finish(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onSocial = async (provider: 'google' | 'apple') => {
    if (socialProvider) return;
    setError('');
    setSocialProvider(provider);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = provider === 'google' ? await loginWithGoogle() : await loginWithApple();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await finish(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.');
    } finally {
      setSocialProvider(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 8,
            paddingBottom: botPad + 24,
            paddingHorizontal: padX,
          },
        ]}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <Feather name="chevron-left" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <BrandLogo size={28} layout="row" nameStyle={{ fontSize: 14 }} />
            <View style={styles.backBtn} />
          </View>

          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground, fontSize: isCompact ? 28 : 32 }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to continue.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.form}>
            <AuthField
              variant="light"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@email.com"
            />
            <AuthField
              variant="light"
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
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.pink, opacity: submitting || socialProvider ? 0.7 : 1 },
              ]}
              onPress={() => void onSubmit()}
              disabled={submitting || Boolean(socialProvider)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Signing in...' : 'Sign in'}</Text>
            </TouchableOpacity>

            <SocialAuthButtons
              loadingProvider={socialProvider}
              disabled={submitting}
              onGoogle={() => void onSocial('google')}
              onApple={() => void onSocial('apple')}
            />
          </Animated.View>

          <TouchableOpacity style={styles.switchBtn} onPress={() => router.push('/signup')} activeOpacity={0.7}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              New here? <Text style={{ color: colors.pink, fontFamily: 'Manrope_700Bold' }}>Create account</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  header: { marginBottom: 28 },
  title: { fontFamily: 'Manrope_800ExtraBold', marginBottom: 6 },
  subtitle: { fontSize: 16, fontFamily: 'Manrope_400Regular' },
  form: { gap: 16 },
  formError: { fontSize: 13, fontFamily: 'Manrope_500Medium', textAlign: 'center' },
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 17, color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
  switchBtn: { marginTop: 22, alignItems: 'center', paddingBottom: 8 },
  switchText: { fontSize: 15, fontFamily: 'Manrope_400Regular' },
});
