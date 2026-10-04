import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: "I'm just starting out or returning after a break", weeks: '0–6 weeks', icon: 'sunrise' },
  { id: 'intermediate', label: 'Intermediate', desc: "I work out regularly but want to level up", weeks: '3–12 months', icon: 'trending-up' },
  { id: 'active', label: 'Active', desc: 'Fitness is already a big part of my life', weeks: '1+ year', icon: 'zap' },
];

export default function ExperienceStep() {
  const colors = useColors();
  const { updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [level, setLevel] = useState<string | null>(null);

  const selectLevel = (id: string) => {
    Haptics.selectionAsync();
    setLevel(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i <= 2 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 2 of 6</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>Your fitness experience</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: botPad + 108 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Current fitness level</Text>
        {LEVELS.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: level === l.id ? colors.primary + '12' : colors.card, borderColor: level === l.id ? colors.primary : colors.border }]}
              onPress={() => selectLevel(l.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: level === l.id ? colors.primary + '20' : colors.muted }]}>
                <Feather name={l.icon as any} size={20} color={level === l.id ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{l.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{l.desc}</Text>
              </View>
              {level === l.id && <Feather name="check-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: level ? colors.primary : colors.muted }]}
          disabled={!level}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const selectedLevel = LEVELS.find((item) => item.id === level);
            updateProfile({
              fitnessLevel: selectedLevel?.label || level || '',
              // Session length now comes from admin plan items; keep a default for legacy roadmap helpers.
              dailyTime: '20–30 min',
            });
            router.push('/onboarding/lifestyle');
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: level ? '#FFFFFF' : colors.mutedForeground }]}>Continue</Text>
          <Feather name="arrow-right" size={18} color={level ? '#FFFFFF' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  question: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 34 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 24, gap: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  optionDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2, lineHeight: 17 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
