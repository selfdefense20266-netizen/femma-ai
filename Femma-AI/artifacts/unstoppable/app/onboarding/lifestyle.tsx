import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const ENVIRONMENTS = [
  { id: 'home', label: 'Home', icon: 'home', desc: 'No equipment needed' },
  { id: 'gym', label: 'Gym', icon: 'activity', desc: 'Full equipment access' },
  { id: 'both', label: 'Both', icon: 'repeat', desc: 'Mix of home & gym' },
];

const FOOD_STYLES = ['No preference', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'High protein', 'Low carb'];

export default function LifestyleStep() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [env, setEnv] = useState<string | null>(null);
  const [food, setFood] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i <= 3 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 3 of 4</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>Your lifestyle</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.foreground }]}>Where do you prefer to work out?</Text>
        <View style={styles.envRow}>
          {ENVIRONMENTS.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[styles.envCard, { flex: 1, backgroundColor: env === e.id ? colors.primary + '12' : colors.card, borderColor: env === e.id ? colors.primary : colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setEnv(e.id); }}
              activeOpacity={0.8}
            >
              <Feather name={e.icon as any} size={22} color={env === e.id ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.envLabel, { color: colors.foreground }]}>{e.label}</Text>
              <Text style={[styles.envDesc, { color: colors.mutedForeground }]}>{e.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 24 }]}>Food preferences</Text>
        <View style={styles.foodGrid}>
          {FOOD_STYLES.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, { backgroundColor: food === f ? colors.mint + '30' : colors.muted, borderColor: food === f ? colors.mint : colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setFood(f); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: food === f ? '#2d8a6b' : colors.mutedForeground }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: env ? colors.primary : colors.muted }]}
          disabled={!env}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/cycle'); }}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: env ? '#FFFFFF' : colors.mutedForeground }]}>Continue</Text>
          <Feather name="arrow-right" size={18} color={env ? '#FFFFFF' : colors.mutedForeground} />
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
  body: { flex: 1, paddingHorizontal: 24 },
  label: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', marginBottom: 12 },
  envRow: { flexDirection: 'row', gap: 10 },
  envCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: 6 },
  envLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  envDesc: { fontSize: 11, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
