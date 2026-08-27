import React, { useMemo, useState } from 'react';
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
import { passwordHasNumber, passwordHasSpecial } from '@/lib/password';

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, padX, isCompact } = useResponsive();
  const { signup } = useAuth();
  const { updateProfile } = useApp();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasNumber = passwordHasNumber(password);
  const hasSpecial = passwordHasSpecial(password);
  const hasLength = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const canSubmit = useMemo(() => {
    return Boolean(firstName.trim() && lastName.trim() && email.trim() && password && confirmPassword);
  }, [firstName, lastName, email, password, confirmPassword]);

  const onSubmit = async () => {
    setError('');
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await signup({ firstName, lastName, email, password, confirmPassword });
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    updateProfile({ name: `${firstName.trim()} ${lastName.trim()}` });
    router.replace('/onboarding');
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={22} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(450)} style={styles.brand}>
            <View style={[styles.logoMark, { backgroundColor: colors.pink, width: isCompact ? 52 : 60, height: isCompact ? 52 : 60 }]}>
              <Text style={styles.logoLetter}>U</Text>
            </View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Start your journey from beginner to Unstoppable.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.form}>
            <View style={[styles.nameRow, { flexDirection: isCompact ? 'column' : 'row' }]}>
              <View style={styles.nameField}>
                <AuthField
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  placeholder="Maya"
                />
              </View>
              <View style={styles.nameField}>
                <AuthField
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  placeholder="Khan"
                />
              </View>
            </View>

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
              autoComplete="new-password"
              placeholder="Create a password"
              onToggleSecure={() => setShowPassword((v) => !v)}
              secureVisible={showPassword}
            />
            <AuthField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              onToggleSecure={() => setShowConfirm((v) => !v)}
              secureVisible={showConfirm}
            />

            <View style={styles.rules}>
              <RuleRow ok={hasLength} label="At least 8 characters" />
              <RuleRow ok={hasNumber} label="Contains a number" />
              <RuleRow ok={hasSpecial} label="Contains a special character" />
              <RuleRow ok={passwordsMatch} label="Passwords match" />
            </View>

            {error ? <Text style={[styles.formError, { color: colors.coral }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.pink, opacity: submitting || !canSubmit ? 0.7 : 1 },
              ]}
              onPress={onSubmit}
              disabled={submitting || !canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Creating account...' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.switchBtn} onPress={() => router.push('/login')} activeOpacity={0.7}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={{ color: colors.pink }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function RuleRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <Feather name={ok ? 'check-circle' : 'circle'} size={14} color={ok ? '#A9E4D2' : 'rgba(255,255,255,0.35)'} />
      <Text style={[styles.ruleText, { color: ok ? '#A9E4D2' : 'rgba(255,255,255,0.45)' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', flexGrow: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontFamily: 'Manrope_500Medium' },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoMark: { borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  logoLetter: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.65)', textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  form: { gap: 14 },
  nameRow: { gap: 12 },
  nameField: { flex: 1, minWidth: 0 },
  rules: { gap: 8, marginTop: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12, fontFamily: 'Manrope_500Medium' },
  formError: { fontSize: 13, fontFamily: 'Manrope_500Medium', textAlign: 'center' },
  primaryBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 15, color: 'rgba(255,255,255,0.65)', fontFamily: 'Manrope_400Regular' },
});
