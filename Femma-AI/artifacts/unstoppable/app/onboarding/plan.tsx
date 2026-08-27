import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

const STEPS = [
  'Loading your course library',
  'Matching courses to your goal',
  'Selecting lessons for week 1',
  'Building today\'s missions',
  'Finalizing your plan',
];

const MIN_STEP_MS = 650;

export default function PlanLoadingScreen() {
  const colors = useColors();
  const { buildOnboardingPlan } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(withSequence(withTiming(1.08, { duration: 800 }), withTiming(1, { duration: 800 })), -1);

    let cancelled = false;
    const startedAt = Date.now();

    const advanceTo = async (step: number) => {
      const elapsed = Date.now() - startedAt;
      const minForStep = (step + 1) * MIN_STEP_MS;
      if (elapsed < minForStep) {
        await new Promise((resolve) => setTimeout(resolve, minForStep - elapsed));
      }
      if (!cancelled) setCurrentStep(step);
    };

    (async () => {
      try {
        await advanceTo(0);
        await advanceTo(1);
        await advanceTo(2);
        const planPromise = buildOnboardingPlan();
        await advanceTo(3);
        await planPromise;
        await advanceTo(4);
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
  }, [buildOnboardingPlan, pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <LinearGradient colors={[colors.softLavender, colors.background]} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.center, pulseStyle]}>
        <View style={[styles.ring, { borderColor: colors.primary + '30' }]}>
          <View style={[styles.ring2, { borderColor: colors.primary + '60' }]}>
            <View style={[styles.innerCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoLetter}>U</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.textSection}>
        <Text style={[styles.headline, { color: colors.foreground }]}>Building your plan</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          {error || 'Pulling live courses and lessons from your Fema AI catalog.'}
        </Text>
      </View>

      <View style={styles.stepsList}>
        {STEPS.map((step, i) => (
          <Animated.View key={step} entering={FadeIn.delay(i * 120).duration(400)} style={[styles.stepRow, { opacity: i <= currentStep ? 1 : 0.35 }]}>
            <View style={[styles.stepDot, { backgroundColor: i < currentStep ? colors.primary : i === currentStep ? colors.primary : colors.border }]}>
              {i < currentStep && <Text style={styles.checkMark}>✓</Text>}
              {i === currentStep && !error && <View style={[styles.activeDot, { backgroundColor: '#FFFFFF' }]} />}
            </View>
            <Text style={[styles.stepText, { color: i <= currentStep ? colors.foreground : colors.mutedForeground }]}>{step}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  center: { marginBottom: 48 },
  ring: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  ring2: { width: 130, height: 130, borderRadius: 65, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  innerCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  logoLetter: { fontSize: 44, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
  textSection: { alignItems: 'center', marginBottom: 40 },
  headline: { fontSize: 24, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', marginBottom: 8 },
  subtext: { fontSize: 14, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 21 },
  stepsList: { gap: 14, width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  stepText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', flex: 1 },
});
