import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/hooks/useResponsive';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { BrandLogo } from '@/components/BrandLogo';
import * as Haptics from 'expo-haptics';

const FEATURES = [
  {
    icon: 'play' as const,
    title: 'Train with confidence',
    body: 'Workout and self-defense videos.',
  },
  {
    icon: 'message-circle' as const,
    title: 'Support for your everyday',
    body: 'AI recipes, food scanning and coach chat.',
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, padX, isCompact, isShort, height } = useResponsive();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withTiming(0, { duration: 600 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ flexGrow: 1, minHeight: height }}
        scrollEnabled={isShort || isCompact}
      >
        <Animated.View
          style={[
            styles.content,
            animStyle,
            {
              paddingTop: topPad + (isCompact ? 36 : 56),
              paddingBottom: botPad + 24,
              paddingHorizontal: padX,
              maxWidth: contentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
        >
          <View style={styles.brand}>
            <BrandLogo size={72} layout="stack" nameStyle={{ fontSize: 24, letterSpacing: 0.5 }} />
          </View>

          <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.hero}>
            <Text style={[styles.headline, { color: colors.foreground, fontSize: isCompact ? 30 : 34 }]}>
              A stronger you.{'\n'}Every day.
            </Text>
            <Text style={[styles.subhead, { color: colors.mutedForeground }]}>Built around your life.</Text>
          </Animated.View>

          <View style={styles.features}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInDown.delay(220 + index * 90).duration(450)}
                style={styles.featureRow}
              >
                <View
                  style={[
                    styles.featureIcon,
                    index === 0
                      ? { backgroundColor: colors.pink, borderColor: colors.pink }
                      : { backgroundColor: 'transparent', borderColor: colors.pink },
                  ]}
                >
                  <Feather name={feature.icon} size={18} color={index === 0 ? '#FFFFFF' : colors.pink} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={[styles.featureTitle, { color: colors.foreground }]}>{feature.title}</Text>
                  <Text style={[styles.featureBody, { color: colors.mutedForeground }]}>{feature.body}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <View style={styles.spacer} />

          <Animated.View entering={FadeInDown.delay(420).duration(450)} style={styles.ctaSection}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.pink }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/signup');
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/login');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                Already have an account?{' '}
                <Text style={{ color: colors.pink, fontFamily: 'Manrope_700Bold' }}>Sign in</Text>
              </Text>
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
  brand: { alignItems: 'center', marginBottom: 36 },
  hero: { alignItems: 'center', marginBottom: 36 },
  headline: {
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 10,
  },
  subhead: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
  features: { gap: 22, paddingHorizontal: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCopy: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  featureBody: { fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_400Regular' },
  spacer: { flex: 1, minHeight: 28 },
  ctaSection: { gap: 16 },
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17, color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: 'Manrope_400Regular' },
});
