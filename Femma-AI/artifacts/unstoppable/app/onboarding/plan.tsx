import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

const STEPS = [
  { label: 'Saving your answers', hint: 'Goals, duration, and preferences' },
  { label: 'Matching your roadmap', hint: 'Category, time, and 1 / 2 / 3 months' },
  { label: 'Building daily tasks', hint: 'Meal, recipe, and exercises' },
  { label: 'Saving to your account', hint: 'Stored once — not rebuilt daily' },
];

export default function PlanLoadingScreen() {
  const colors = useColors();
  const { buildOnboardingPlan } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const pulseAnim = useSharedValue(1);
  const barAnim = useSharedValue(0.08);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [pulseAnim]);

  useEffect(() => {
    barAnim.value = withTiming(Math.min(0.92, 0.12 + currentStep * 0.22), { duration: 450 });
  }, [barAnim, currentStep]);

  useEffect(() => {
    setElapsed(0);
    const tick = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(tick);
  }, [retryKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setCurrentStep(0);
        await new Promise((resolve) => setTimeout(resolve, 280));
        if (cancelled) return;
        setCurrentStep(1);
        await new Promise((resolve) => setTimeout(resolve, 280));
        if (cancelled) return;
        setCurrentStep(2);
        await buildOnboardingPlan();
        if (cancelled) return;
        setCurrentStep(3);
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (!cancelled) router.replace('/onboarding/reveal');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not build your plan');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildOnboardingPlan, retryKey]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.round(barAnim.value * 100)}%` }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <LinearGradient colors={[colors.softLavender, colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.body}>
        <Animated.View style={[styles.markWrap, pulseStyle]}>
          <View style={[styles.ring, { borderColor: colors.primary + '28' }]}>
            <View style={[styles.innerCircle, { backgroundColor: colors.primary }]}>
              <Feather name={error ? 'alert-circle' : 'cpu'} size={28} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(400)} style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {error ? 'Needs another try' : 'Personalizing'}
          </Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            {error ? 'We could not finish your plan' : 'Building your plan'}
          </Text>
          <Text style={[styles.subtext, { color: error ? colors.coral : colors.mutedForeground }]}>
            {error ||
              'We load your saved exercise roadmap for this category, daily time, and plan length. ChatGPT is not used for this.'}
          </Text>
        </Animated.View>

        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: error ? colors.coral : colors.primary }, barStyle]} />
        </View>
        <Text style={[styles.timer, { color: colors.mutedForeground }]}>
          {error ? 'Ready when you are' : elapsed < 8 ? 'This usually takes under a minute' : `${elapsed}s elapsed`}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {STEPS.map((step, i) => {
            const done = !error && i < currentStep;
            const active = !error && i === currentStep;
            const failed = Boolean(error) && i === currentStep;
            return (
              <Animated.View
                key={step.label}
                entering={FadeInDown.delay(80 * i).duration(360)}
                style={[styles.stepRow, i < STEPS.length - 1 && styles.stepDivider]}
              >
                <View
                  style={[
                    styles.stepIcon,
                    {
                      backgroundColor: done
                        ? colors.primary
                        : failed
                          ? colors.coral + '18'
                          : active
                            ? colors.primary + '16'
                            : colors.muted,
                    },
                  ]}
                >
                  {done ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <Feather
                      name={failed ? 'x' : active ? 'loader' : 'circle'}
                      size={14}
                      color={failed ? colors.coral : active ? colors.primary : colors.mutedForeground}
                    />
                  )}
                </View>
                <View style={styles.stepCopy}>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: done || active || failed ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>
                    {failed ? error : step.hint}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {error ? (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setError('');
              setCurrentStep(0);
              setElapsed(0);
              setRetryKey((key) => key + 1);
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.retryText}>Try again</Text>
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground, paddingBottom: botPad }]}>
        Daily tasks come from exercise_roadmap — OpenAI is not called to write the plan.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  markWrap: { alignItems: 'center', marginBottom: 28 },
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copy: { marginBottom: 22 },
  kicker: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.6,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtext: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21 },
  progressTrack: { height: 6, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 99 },
  timer: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', marginTop: 8, marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  stepDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEDF0' },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepCopy: { flex: 1, gap: 2 },
  stepLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  stepHint: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 17 },
  retryBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  footer: {
    paddingHorizontal: 28,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
});
