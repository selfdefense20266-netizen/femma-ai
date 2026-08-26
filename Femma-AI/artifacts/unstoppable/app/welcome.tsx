import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/hooks/useResponsive';
import { AuthBackground } from '@/components/AuthBackground';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, padX, isCompact, isShort, headlineSize, headlineLineHeight, logoSize, height } = useResponsive();
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
      <AuthBackground />

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ flexGrow: 1, minHeight: height }}
        scrollEnabled={isShort || isCompact}
      >
        <Animated.View
          style={[
            styles.content,
            animStyle,
            {
              paddingTop: topPad + (isCompact ? 28 : 48),
              paddingBottom: botPad + 32,
              paddingHorizontal: padX,
              maxWidth: contentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
        >
          {/* Logo */}
          <View style={[styles.logoSection, { marginBottom: isCompact ? 20 : 28 }]}>
            <View style={[styles.logoMark, { backgroundColor: colors.pink, width: logoSize, height: logoSize, borderRadius: logoSize * 0.29 }]}>
              <Text style={[styles.logoLetter, { fontSize: isCompact ? 32 : 38 }]}>U</Text>
            </View>
            <Text style={[styles.appName, { color: '#FFFFFF', fontSize: isCompact ? 22 : 26, letterSpacing: isCompact ? 3 : 5 }]}>UNSTOPPABLE</Text>
            <View style={[styles.taglinePill, { backgroundColor: colors.pink + '22', borderColor: colors.pink + '44' }]}>
              <Text style={[styles.tagline, { color: colors.pink }]}>Women's Transformation Platform</Text>
            </View>
          </View>

          {/* Pillars */}
          <View style={[styles.pillsRow, { marginBottom: isCompact ? 24 : 36 }]}>
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
            <Text style={[styles.headline, { color: '#FFFFFF', fontSize: headlineSize, lineHeight: headlineLineHeight }]}>
              One journey.{'\n'}<Text style={{ color: colors.pink }}>Unstoppable</Text> you.
            </Text>
            <Text style={[styles.body, { color: 'rgba(255,255,255,0.65)', fontSize: isCompact ? 14 : 15 }]}>
              Beginner → fit → confident → safe → unstoppable.{'\n'}Personalized to your body, your cycle, your goals.
            </Text>
          </Animated.View>

          <View style={[styles.spacer, { minHeight: isShort ? 16 : 32 }]} />

          {/* CTAs */}
          <Animated.View entering={FadeInDown.delay(1000).duration(600)} style={styles.ctaSection}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.pink }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/signup'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Start My Journey</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/login'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: 'rgba(255,255,255,0.6)' }]}>I already have an account</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  logoSection: { alignItems: 'center' },
  logoMark: { justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoLetter: { fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
  appName: { fontWeight: '800', marginBottom: 10, fontFamily: 'Manrope_800ExtraBold' },
  taglinePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tagline: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, fontFamily: 'Manrope_600SemiBold' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  headlineSection: { alignItems: 'center' },
  headline: { fontWeight: '800', textAlign: 'center', marginBottom: 16, fontFamily: 'Manrope_800ExtraBold' },
  body: { lineHeight: 24, textAlign: 'center', fontFamily: 'Manrope_400Regular' },
  spacer: { flex: 1 },
  ctaSection: { gap: 14 },
  primaryBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
  secondaryBtn: { height: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Manrope_400Regular' },
});
