import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DURATION_OPTIONS } from '@/lib/trainingPlan';

export default function DurationStep() {
  const colors = useColors();
  const { updateProfile, profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [weeks, setWeeks] = useState<number | null>(profile.planDurationWeeks || 8);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.progressDot, { backgroundColor: colors.primary }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 5 of 5</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>How long should this course run?</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          1 month is 4 weeks of daily tasks. 2 and 3 months keep the same category and step the work up each week.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: botPad + 108 }]}
        showsVerticalScrollIndicator={false}
      >
        {DURATION_OPTIONS.map((opt, i) => (
          <Animated.View key={opt.weeks} entering={FadeInDown.delay(i * 80).duration(400)}>
            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: weeks === opt.weeks ? colors.primary + '12' : colors.card,
                  borderColor: weeks === opt.weeks ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setWeeks(opt.weeks);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.weekNum, { color: colors.primary }]}>{opt.weeks}</Text>
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                  {opt.weeks} weeks · {opt.desc}
                </Text>
              </View>
              {weeks === opt.weeks && <Feather name="check-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: weeks ? colors.primary : colors.muted }]}
          disabled={!weeks}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateProfile({ planDurationWeeks: weeks || 8 });
            router.push('/onboarding/plan');
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: weeks ? '#FFFFFF' : colors.mutedForeground }]}>Build My Plan</Text>
          <Feather name="arrow-right" size={18} color={weeks ? '#FFFFFF' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 20, gap: 8 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  question: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 34 },
  subtext: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 24, gap: 10, paddingTop: 8 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 14 },
  optionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  weekNum: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  optionDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
