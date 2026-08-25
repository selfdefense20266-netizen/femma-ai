import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withTiming(0, { duration: 700 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const pillColors = [colors.pink, colors.lavender, colors.skyBlue, colors.mint];
  const pillLabels = ['Fitness', 'Wellness', 'Confidence', 'Safety'];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0d14', '#17181C', '#0d121a']} style={StyleSheet.absoluteFill} />

      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: colors.pink + '22' }]} />
      <View style={[styles.blob2, { backgroundColor: colors.lavender + '18' }]} />
      <View style={[styles.blob3, { backgroundColor: colors.skyBlue + '12' }]} />

      <Animated.View style={[styles.content, animStyle, { paddingTop: topPad + 48, paddingBottom: botPad + 32 }]}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoMark, { backgroundColor: colors.pink }]}>
            <Text style={styles.logoLetter}>U</Text>
          </View>
          <Text style={[styles.appName, { color: '#FFFFFF' }]}>UNSTOPPABLE</Text>
          <View style={[styles.taglinePill, { backgroundColor: colors.pink + '22', borderColor: colors.pink + '44' }]}>
            <Text style={[styles.tagline, { color: colors.pink }]}>Women's Transformation Platform</Text>
          </View>
        </View>

        {/* Pillars */}
        <View style={styles.pillsRow}>
          {pillLabels.map((label, i) => (
            <Animated.View key={label} entering={FadeInDown.delay(300 + i * 100).duration(400)}>
              <View style={[styles.pill, { backgroundColor: pillColors[i] + '22', borderColor: pillColors[i] + '44' }]}>
                <Text style={[styles.pillText, { color: pillColors[i] }]}>{label}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Headline */}
        <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.headlineSection}>
          <Text style={[styles.headline, { color: '#FFFFFF' }]}>
            One journey.{'\n'}<Text style={{ color: colors.pink }}>Unstoppable</Text> you.
          </Text>
          <Text style={[styles.body, { color: 'rgba(255,255,255,0.65)' }]}>
            Beginner → fit → confident → safe → unstoppable.{'\n'}Personalized to your body, your cycle, your goals.
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        {/* CTAs */}
        <Animated.View entering={FadeInDown.delay(1000).duration(600)} style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.pink }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Start My Journey</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace('/(tabs)'); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: 'rgba(255,255,255,0.6)' }]}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -90, right: -90 },
  blob2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: 180, left: -70 },
  blob3: { position: 'absolute', width: 160, height: 160, borderRadius: 80, top: '38%', right: -40 },
  content: { flex: 1, paddingHorizontal: 28 },
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoMark: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoLetter: { fontSize: 38, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: 5, marginBottom: 10, fontFamily: 'Manrope_800ExtraBold' },
  taglinePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tagline: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, fontFamily: 'Manrope_600SemiBold' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 36 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  headlineSection: { alignItems: 'center' },
  headline: { fontSize: 34, fontWeight: '800', textAlign: 'center', lineHeight: 44, marginBottom: 16, fontFamily: 'Manrope_800ExtraBold' },
  body: { fontSize: 15, lineHeight: 24, textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  spacer: { flex: 1, minHeight: 32 },
  ctaSection: { gap: 14 },
  primaryBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
  secondaryBtn: { height: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Manrope_400Regular' },
});
