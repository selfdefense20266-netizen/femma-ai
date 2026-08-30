import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ONBOARDING_GOALS } from '@/lib/nutritionPlan';

const GOALS = ONBOARDING_GOALS;

export default function GoalStep() {
  const colors = useColors();
  const { updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [selected, setSelected] = useState<string[]>([]);

  const select = (id: string) => {
    Haptics.selectionAsync();
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i === 1 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 1 of 5</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>What do you want to train?</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          Pick one or more. We build a 1, 2, or 3 month roadmap, recipes you can eat, and food-scan advice from this.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {GOALS.map((g, i) => (
          <Animated.View key={g.id} entering={FadeInDown.delay(i * 60).duration(400)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: selected.includes(g.id) ? colors.primary + '12' : colors.card, borderColor: selected.includes(g.id) ? colors.primary : colors.border }]}
              onPress={() => select(g.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: selected.includes(g.id) ? colors.primary + '20' : colors.muted }]}>
                <Feather name={g.icon as any} size={20} color={selected.includes(g.id) ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{g.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{g.desc}</Text>
              </View>
              {selected.includes(g.id) && <Feather name="check-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </Animated.View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: selected.length ? colors.primary : colors.muted }]}
          disabled={!selected.length}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateProfile({ goal: selected.join(', ') || 'hiit' });
            router.push('/onboarding/experience');
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: selected.length ? '#FFFFFF' : colors.mutedForeground }]}>Continue</Text>
          <Feather name="arrow-right" size={18} color={selected.length ? '#FFFFFF' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 24 },
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', marginBottom: 12 },
  question: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', marginBottom: 6, lineHeight: 34 },
  subtext: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  list: { paddingHorizontal: 24, gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 14 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  optionDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, backgroundColor: 'transparent' },
  nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
