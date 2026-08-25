import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import Animated, { FadeInDown } from 'react-native-reanimated';

const CYCLE_OPTIONS = [
  { id: 'track', label: 'Track my cycle', desc: 'Get personalized workout & nutrition recs', icon: 'calendar', color: '#F26BB5' },
  { id: 'pregnant', label: 'Currently pregnant', desc: 'Safe pregnancy-focused programs', icon: 'heart', color: '#FF928F' },
  { id: 'postpartum', label: 'Postpartum recovery', desc: 'Gentle recovery programs', icon: 'sunrise', color: '#A9E4D2' },
  { id: 'skip', label: 'Skip for now', desc: "I'll set this up later", icon: 'skip-forward', color: '#B9A7F2' },
];

export default function CycleStep() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, { backgroundColor: colors.primary }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 4 of 4</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>Cycle & reproductive health</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>Your data stays private and is only used to personalize your plan.</Text>
      </View>

      <View style={styles.body}>
        {CYCLE_OPTIONS.map((opt, i) => (
          <Animated.View key={opt.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: selected === opt.id ? opt.color + '14' : colors.card, borderColor: selected === opt.id ? opt.color : colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setSelected(opt.id); }}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: opt.color + '20' }]}>
                <Feather name={opt.icon as any} size={20} color={opt.color} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
              </View>
              {selected === opt.id && <Feather name="check-circle" size={20} color={opt.color} />}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: selected ? colors.primary : colors.muted }]}
          disabled={!selected}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/plan'); }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: selected ? '#FFFFFF' : colors.mutedForeground }]}>Build My Plan</Text>
          <Feather name="arrow-right" size={18} color={selected ? '#FFFFFF' : colors.mutedForeground} />
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
  body: { flex: 1, paddingHorizontal: 24, gap: 10, paddingTop: 8 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 14 },
  optionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  optionDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
