import React, { useMemo, useState } from 'react';
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
import { passwordHasNumber, passwordHasSpecial } from '@/lib/password';
import { routeAfterAuth } from '@/lib/authRouting';

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, padX, isCompact } = useResponsive();
  const { signup, loginWithGoogle, loginWithApple } = useAuth();
  const { updateProfile, onboardingCompleted, accountReady } = useApp();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple' | null>(null);

  const hasNumber = passwordHasNumber(password);
  const hasSpecial = passwordHasSpecial(password);
  const hasLength = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const canSubmit = useMemo(() => {
    return Boolean(firstName.trim() && lastName.trim() && email.trim() && password && confirmPassword);
  }, [firstName, lastName, email, password, confirmPassword]);

  const onSubmit = async () => {
    if (submitting) return;
    setError('');
    if (!hasLength || !hasNumber || !hasSpecial) {
      setError('Use 8+ characters with a number and a special character.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords must match.');
      return;
    }
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await signup({ firstName, lastName, email, password, confirmPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Entry screen waits for AppContext's account sync, then routes to onboarding.
      await routeAfterAuth(result.user, { updateProfile, onboardingCompleted, accountReady });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account. Try again.');
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
      await routeAfterAuth(result.user, { updateProfile, onboardingCompleted, accountReady });
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
              Create your account
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Make it yours.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.form}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <AuthField
                  variant="light"
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  placeholder="First name"
                />
              </View>
              <View style={styles.nameField}>
                <AuthField
                  variant="light"
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  placeholder="Last name"
                />
              </View>
            </View>

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
              autoComplete="new-password"
              placeholder="Create a password"
              onToggleSecure={() => setShowPassword((v) => !v)}
              secureVisible={showPassword}
              hint="8+ characters, a number and a special character."
            />
            <AuthField
              variant="light"
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              onToggleSecure={() => setShowConfirm((v) => !v)}
              secureVisible={showConfirm}
              hint="Passwords must match."
            />

            {error ? <Text style={[styles.formError, { color: colors.coral }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.pink,
                  opacity: submitting || socialProvider || !canSubmit ? 0.7 : 1,
                },
              ]}
              onPress={() => void onSubmit()}
              disabled={submitting || Boolean(socialProvider) || !canSubmit}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
            </TouchableOpacity>

            <SocialAuthButtons
              loadingProvider={socialProvider}
              disabled={submitting}
              onGoogle={() => void onSocial('google')}
              onApple={() => void onSocial('apple')}
            />
          </Animated.View>

          <TouchableOpacity style={styles.switchBtn} onPress={() => router.push('/login')} activeOpacity={0.7}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.pink, fontFamily: 'Manrope_700Bold' }}>Sign in</Text>
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
  nameRow: { flexDirection: 'row', gap: 12 },
  nameField: { flex: 1, minWidth: 0 },
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
