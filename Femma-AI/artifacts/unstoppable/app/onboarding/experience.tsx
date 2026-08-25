import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import Animated, { FadeInDown } from 'react-native-reanimated';

const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: "I'm just starting out or returning after a break", weeks: '0–6 weeks', icon: 'sunrise' },
  { id: 'intermediate', label: 'Intermediate', desc: "I work out regularly but want to level up", weeks: '3–12 months', icon: 'trending-up' },
  { id: 'active', label: 'Active', desc: 'Fitness is already a big part of my life', weeks: '1+ year', icon: 'zap' },
];

const TIMES = ['15 min', '20–30 min', '30–45 min', '45–60 min', '60+ min'];

export default function ExperienceStep() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [level, setLevel] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i <= 2 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 2 of 4</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>Your fitness experience</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Current fitness level</Text>
        {LEVELS.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: level === l.id ? colors.primary + '12' : colors.card, borderColor: level === l.id ? colors.primary : colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setLevel(l.id); }}
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

        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 20 }]}>Time available per day</Text>
        <View style={styles.timesGrid}>
          {TIMES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, { backgroundColor: time === t ? colors.primary : colors.muted, borderColor: time === t ? colors.primary : colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setTime(t); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeText, { color: time === t ? '#FFFFFF' : colors.mutedForeground }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: level && time ? colors.primary : colors.muted }]}
          disabled={!level || !time}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/lifestyle'); }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: level && time ? '#FFFFFF' : colors.mutedForeground }]}>Continue</Text>
          <Feather name="arrow-right" size={18} color={level && time ? '#FFFFFF' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 20, gap: 10 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  question: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 34 },
  body: { flex: 1, paddingHorizontal: 24, gap: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  optionDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2, lineHeight: 17 },
  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1.5 },
  timeText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
