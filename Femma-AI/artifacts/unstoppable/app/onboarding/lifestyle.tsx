import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

const ENVIRONMENTS = [
  { id: 'home', label: 'Home', icon: 'home', desc: 'No equipment needed' },
  { id: 'gym', label: 'Gym', icon: 'activity', desc: 'Full equipment access' },
  { id: 'both', label: 'Both', icon: 'repeat', desc: 'Mix of home & gym' },
];

const FOOD_STYLES = ['No preference', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'High protein', 'Low carb'];

export default function LifestyleStep() {
  const colors = useColors();
  const { updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [env, setEnv] = useState<string | null>(null);
  const [food, setFood] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const foodSectionY = useRef(0);

  const selectEnv = (id: string) => {
    Haptics.selectionAsync();
    setEnv(id);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(foodSectionY.current - 12, 0), animated: true });
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
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

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: botPad + 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.label, { color: colors.foreground }]}>Where do you prefer to work out?</Text>
        <View style={styles.envRow}>
          {ENVIRONMENTS.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[styles.envCard, { flex: 1, backgroundColor: env === e.id ? colors.primary + '12' : colors.card, borderColor: env === e.id ? colors.primary : colors.border }]}
              onPress={() => selectEnv(e.id)}
              activeOpacity={0.8}
            >
              <Feather name={e.icon as any} size={22} color={env === e.id ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.envLabel, { color: colors.foreground }]}>{e.label}</Text>
              <Text style={[styles.envDesc, { color: colors.mutedForeground }]}>{e.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          onLayout={(event) => {
            foodSectionY.current = event.nativeEvent.layout.y;
          }}
        >
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: env ? colors.primary : colors.muted }]}
          disabled={!env}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const selectedEnv = ENVIRONMENTS.find((item) => item.id === env);
            updateProfile({
              environment: selectedEnv?.label || env || '',
              foodPreference: food || 'No preference',
            });
            router.push('/onboarding/cycle');
          }}
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
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  question: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 34 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 24 },
  label: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', marginBottom: 12 },
  envRow: { flexDirection: 'row', gap: 10 },
  envCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: 6 },
  envLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  envDesc: { fontSize: 11, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
