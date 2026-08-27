import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'trending-down', desc: 'Burn fat, feel lighter' },
  { id: 'tone', label: 'Tone & Sculpt', icon: 'activity', desc: 'Define and strengthen' },
  { id: 'muscle', label: 'Build Muscle', icon: 'zap', desc: 'Get stronger every week' },
  { id: 'boxing', label: 'Boxing', icon: 'target', desc: 'Footwork, punches, fight fitness' },
  { id: 'selfdefense', label: 'Learn Self-Defense', icon: 'shield', desc: 'Feel safe anywhere' },
  { id: 'hiit', label: 'HIIT', icon: 'zap', desc: 'Short, high-energy intervals' },
  { id: 'yoga', label: 'Yoga', icon: 'wind', desc: 'Strength, breath, and flow' },
  { id: 'confidence', label: 'Build Confidence', icon: 'star', desc: 'Inside and out' },
  { id: 'pregnancy', label: 'Pregnancy Wellness', icon: 'heart', desc: 'Safe & supported' },
  { id: 'postpartum', label: 'Postpartum Recovery', icon: 'sunrise', desc: 'Gentle return to strength' },
  { id: 'flexibility', label: 'Improve Flexibility', icon: 'move', desc: 'Move freely and deeply' },
  { id: 'stress', label: 'Reduce Stress', icon: 'cloud', desc: 'Calm your mind and body' },
];

export default function GoalStep() {
  const colors = useColors();
  const { updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [selected, setSelected] = useState<string | null>(null);

  const select = (id: string) => {
    Haptics.selectionAsync();
    setSelected(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i === 1 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 1 of 4</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>What's your primary goal?</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>We'll build today's missions around this — boxing, yoga, strength, and more.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {GOALS.map((g, i) => (
          <Animated.View key={g.id} entering={FadeInDown.delay(i * 60).duration(400)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: selected === g.id ? colors.primary + '12' : colors.card, borderColor: selected === g.id ? colors.primary : colors.border }]}
              onPress={() => select(g.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: selected === g.id ? colors.primary + '20' : colors.muted }]}>
                <Feather name={g.icon as any} size={20} color={selected === g.id ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{g.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{g.desc}</Text>
              </View>
              {selected === g.id && <Feather name="check-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </Animated.View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: selected ? colors.primary : colors.muted }]}
          disabled={!selected}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const goal = GOALS.find((item) => item.id === selected);
            updateProfile({ goal: goal?.label || selected || '' });
            router.push('/onboarding/experience');
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: selected ? '#FFFFFF' : colors.mutedForeground }]}>Continue</Text>
          <Feather name="arrow-right" size={18} color={selected ? '#FFFFFF' : colors.mutedForeground} />
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
