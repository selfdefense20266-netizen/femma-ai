import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { onboardingGoalsFromCourses } from '@/lib/nutritionPlan';
import { useCatalog } from '@/hooks/useCatalog';

export default function GoalStep() {
  const colors = useColors();
  const { updateProfile } = useApp();
  const { data: catalog, isLoading } = useCatalog();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const goals = useMemo(
    () => onboardingGoalsFromCourses(catalog?.courses || []),
    [catalog?.courses]
  );

  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!goals.length) return;
    setSelected((prev) => {
      if (prev && goals.some((goal) => goal.id === prev)) return prev;
      const yoga = goals.find((goal) => /yoga/i.test(goal.label) || /yoga/i.test(goal.id));
      return yoga?.id || goals[0].id;
    });
  }, [goals]);

  const select = (id: string) => {
    Haptics.selectionAsync();
    setSelected(id);
  };

  const selectedGoal = goals.find((goal) => goal.id === selected);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i === 1 ? colors.primary : colors.border },
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

      {isLoading && !catalog ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 108 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {goals.map((g, i) => {
            const isOn = selected === g.id;
            return (
              <Animated.View key={g.id} entering={FadeInDown.delay(Math.min(i, 8) * 50).duration(380)}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: isOn ? colors.primary + '12' : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => select(g.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.thumbWrap, { backgroundColor: colors.muted }]}>
                    {g.imageUrl ? (
                      <Image
                        source={{ uri: g.imageUrl }}
                        style={styles.thumb}
                        contentFit="cover"
                        transition={180}
                      />
                    ) : (
                      <Feather
                        name={g.icon as never}
                        size={24}
                        color={isOn ? colors.primary : colors.mutedForeground}
                      />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: colors.foreground }]} numberOfLines={1}>
                      {g.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {g.desc}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      isOn
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: 'transparent', borderColor: colors.border },
                    ]}
                  >
                    {isOn ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: botPad + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            { backgroundColor: selectedGoal ? colors.primary : colors.muted },
          ]}
          disabled={!selectedGoal}
          onPress={() => {
            if (!selectedGoal) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateProfile({ goal: selectedGoal.goalValue });
            router.push('/onboarding/experience');
          }}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.nextBtnText, { color: selectedGoal ? '#FFFFFF' : colors.mutedForeground }]}
          >
            Continue
          </Text>
          <Feather
            name="arrow-right"
            size={18}
            color={selectedGoal ? '#FFFFFF' : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  question: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    lineHeight: 34,
  },
  subtext: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 24, gap: 12, paddingTop: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 14,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  optionText: { flex: 1, gap: 4, paddingRight: 2 },
  optionLabel: { fontSize: 16, fontFamily: 'Manrope_700Bold', letterSpacing: -0.2 },
  optionDesc: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
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
