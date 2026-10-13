import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ONBOARDING_GOALS } from '@/lib/nutritionPlan';

const GOALS = ONBOARDING_GOALS;

export default function GoalStep() {
  const colors = useColors();
  const { updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 10;
  const botPad = Math.max(insets.bottom, 14);
  const [selected, setSelected] = useState<string>('yoga');

  const select = (id: string) => {
    Haptics.selectionAsync();
    setSelected(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                { backgroundColor: i === 1 ? colors.pink : colors.border },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 1 of 6</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>What do you want to train?</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          Pick one activity. We match you to that plan and tailor workouts to your level.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {GOALS.map((g, i) => {
          const isOn = selected === g.id;
          return (
            <Animated.View key={g.id} entering={FadeInDown.delay(Math.min(i, 8) * 45).duration(380)}>
              <TouchableOpacity
                style={[
                  styles.option,
                  {
                    backgroundColor: isOn ? colors.pink + '10' : colors.card,
                    borderColor: isOn ? colors.pink : colors.border,
                  },
                ]}
                onPress={() => select(g.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor: isOn ? colors.pink + '22' : colors.muted,
                    },
                  ]}
                >
                  <Feather
                    name={g.icon as never}
                    size={20}
                    color={isOn ? colors.foreground : colors.mutedForeground}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>{g.label}</Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{g.desc}</Text>
                </View>
                {isOn ? (
                  <View style={[styles.checkOn, { backgroundColor: colors.pink }]}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.checkOff, { borderColor: colors.border }]} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>

      <LinearGradient
        colors={['rgba(250,250,252,0)', colors.background, colors.background]}
        locations={[0, 0.35, 1]}
        style={[styles.footer, { paddingBottom: botPad + 12 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: selected ? colors.pink : colors.muted }]}
          disabled={!selected}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateProfile({ goal: selected || 'yoga' });
            router.push('/onboarding/experience');
          }}
          activeOpacity={0.88}
        >
          <Text style={[styles.nextBtnText, { color: selected ? '#FFFFFF' : colors.mutedForeground }]}>
            Continue
          </Text>
          <Feather name="arrow-right" size={18} color={selected ? '#FFFFFF' : colors.mutedForeground} />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 20 },
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  progressSegment: { height: 4, flex: 1, borderRadius: 100 },
  stepLabel: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginBottom: 10 },
  question: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 8,
    lineHeight: 34,
  },
  subtext: { fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 22 },
  list: { paddingHorizontal: 24, gap: 12, paddingTop: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 14,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  optionDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  nextBtn: {
    height: 56,
    borderRadius: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
});
