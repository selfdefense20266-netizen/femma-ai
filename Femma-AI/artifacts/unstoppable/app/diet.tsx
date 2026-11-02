import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { usePurchases } from '@/context/PurchaseContext';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import {
  foodBySlotForProfile,
  stripMealAudience,
  type DailyPlanItem,
  type MealSlotKey,
} from '@/lib/dailyPlans';
import { build30DayDietPlan, type DietMeal } from '@/lib/dietPlan';

type MealKey = MealSlotKey;

type MealDetail = {
  id: string;
  name: string;
  notes?: string;
  steps: string[];
  mediaUrl: string;
  slotLabel?: string;
};

const FALLBACK_IMAGES = {
  breakfast: require('@/assets/recipes/r1.webp'),
  lunch: require('@/assets/recipes/r5.webp'),
  dinner: require('@/assets/recipes/r3.webp'),
} as const;

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

function itemToMeal(item: DailyPlanItem): DietMeal & { steps: string[]; mediaUrl: string; id: string } {
  return {
    id: item.id,
    name: item.title,
    calories: 0,
    notes: stripMealAudience(item.subtitle) || item.cue || '',
    steps: item.steps || [],
    mediaUrl: item.mediaUrl || '',
  };
}

export default function TodaysMealsScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const { hasAccess, ready: purchasesReady } = usePurchases();
  const { data: adminPlan, isLoading } = useDailyPlan();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const todayDay = Math.min(30, Math.max(1, Number(profile.journeyDay) || 1));
  const [detail, setDetail] = useState<MealDetail | null>(null);

  useEffect(() => {
    // Wait until access is known, or a premium member opening this screen directly gets bounced.
    if (!purchasesReady || hasAccess) return;
    router.replace({ pathname: '/plan-gate', params: { mode: 'resume' } } as never);
  }, [purchasesReady, hasAccess]);

  const adminFoodBySlot = useMemo(
    () =>
      foodBySlotForProfile(adminPlan, todayDay, {
        foodPreference: profile.foodPreference,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        fitnessLevel: profile.fitnessLevel,
      }),
    [adminPlan, todayDay, profile.fitnessLevel, profile.foodPreference, profile.heightCm, profile.weightKg]
  );

  const fallbackMeals = useMemo(() => {
    const days = build30DayDietPlan({
      goal: profile.goal,
      fitnessLevel: profile.fitnessLevel,
      foodPreference: profile.foodPreference,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      isPregnant: profile.isPregnant,
    });
    const day = days[todayDay - 1] || days[0];
    return day;
  }, [profile, todayDay]);

  const display = useMemo(() => {
    const pick = (slot: MealKey) => {
      const list = adminFoodBySlot[slot];
      if (list.length) return itemToMeal(list[0]);
      const meal = fallbackMeals[slot];
      return { ...meal, id: `fallback-${slot}`, steps: [] as string[], mediaUrl: '' };
    };
    return {
      breakfast: pick('breakfast'),
      lunch: pick('lunch'),
      dinner: pick('dinner'),
      fromAdmin: Boolean(
        adminFoodBySlot.breakfast.length || adminFoodBySlot.lunch.length || adminFoodBySlot.dinner.length
      ),
    };
  }, [adminFoodBySlot, fallbackMeals]);

  const openMealDetail = (slot: MealKey) => {
    Haptics.selectionAsync();
    const meal = display[slot];
    setDetail({
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      steps: meal.steps || [],
      mediaUrl: meal.mediaUrl || '',
      slotLabel: MEAL_LABELS[slot],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Food</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: botPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabsWrap}>
          <View style={[styles.segment, { backgroundColor: colors.muted }]}>
            {(
              [
                ['suggested', 'Recipes'],
                ['ai', 'AI Recipes'],
              ] as const
            ).map(([id, label]) => (
              <TouchableOpacity
                key={id}
                style={[styles.segmentBtn, id === 'suggested' ? { backgroundColor: colors.pink } : null]}
                onPress={() => {
                  if (id === 'ai') {
                    Haptics.selectionAsync();
                    router.push('/ai-recipes' as never);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: id === 'suggested' ? '#FFFFFF' : colors.mutedForeground, fontSize: 12 },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.cardElevated, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardEyebrow, { color: colors.pink }]}>DAILY PLAN</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today’s meals</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                {display.fromAdmin
                  ? `Matched · ${profile.foodPreference || 'Eat everything'}`
                  : 'Built from your preferences'}
              </Text>
            </View>
            <View style={[styles.dayBadge, { backgroundColor: colors.pink + '14' }]}>
              <Text style={[styles.dayBadgeText, { color: colors.pink }]}>Day {todayDay}</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 28 }} color={colors.pink} />
          ) : (
            <View style={styles.mealList}>
              {(['breakfast', 'lunch', 'dinner'] as MealKey[]).map((slot, index) => {
                const meal = display[slot];
                const image = meal.mediaUrl ? { uri: meal.mediaUrl } : FALLBACK_IMAGES[slot];
                const stepCount = meal.steps?.length || 0;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.mealItem,
                      { backgroundColor: colors.muted },
                      index === 2 ? { marginBottom: 0 } : null,
                    ]}
                    onPress={() => openMealDetail(slot)}
                    activeOpacity={0.88}
                  >
                    <Image source={image} style={styles.mealThumb} contentFit="cover" />
                    <View style={styles.mealCopy}>
                      <View style={styles.mealMetaRow}>
                        <View style={[styles.slotPill, { backgroundColor: colors.pink + '18' }]}>
                          <Text style={[styles.slotPillText, { color: colors.pink }]}>
                            {MEAL_LABELS[slot].toUpperCase()}
                          </Text>
                        </View>
                        {stepCount > 0 ? (
                          <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>
                            {stepCount} steps
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.mealName, { color: colors.foreground }]} numberOfLines={2}>
                        {meal.name}
                      </Text>
                    </View>
                    <View style={[styles.chevronWrap, { backgroundColor: colors.card }]}>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={Boolean(detail)} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {detail ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                <Image
                  source={detail.mediaUrl ? { uri: detail.mediaUrl } : FALLBACK_IMAGES.lunch}
                  style={styles.detailHero}
                  contentFit="cover"
                />
                {detail.slotLabel ? (
                  <Text style={[styles.modalSlot, { color: colors.pink }]}>{detail.slotLabel}</Text>
                ) : null}
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{detail.name}</Text>
                {detail.notes ? (
                  <Text style={[styles.modalNotes, { color: colors.mutedForeground }]}>{detail.notes}</Text>
                ) : null}
                {detail.steps?.length ? (
                  <View style={styles.stepsBox}>
                    <Text style={[styles.stepsHeading, { color: colors.foreground }]}>How to make it</Text>
                    {detail.steps.map((step, i) => (
                      <Text key={`${i}-${step}`} style={[styles.stepLine, { color: colors.mutedForeground }]}>
                        {i + 1}. {step}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.modalNotes, { color: colors.mutedForeground }]}>
                    No cook steps yet. Ask admin to add steps on this meal.
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.pink }]}
                  onPress={() => setDetail(null)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  tabsWrap: { paddingHorizontal: 20, marginBottom: 12 },
  segment: { flexDirection: 'row', borderRadius: 100, padding: 4 },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  card: { marginHorizontal: 20, borderRadius: 24, borderWidth: 1, padding: 18 },
  cardElevated: {
    shadowColor: '#17181C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  cardEyebrow: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardTitle: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  cardSub: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  dayBadgeText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  mealList: { gap: 10 },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 18,
  },
  mealThumb: { width: 64, height: 64, borderRadius: 16 },
  mealCopy: { flex: 1, gap: 6, minWidth: 0 },
  mealMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  slotPillText: { fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.6 },
  stepHint: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  mealName: { fontSize: 16, fontFamily: 'Manrope_700Bold', lineHeight: 21 },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 20, padding: 16, maxHeight: '82%' },
  detailHero: { width: '100%', height: 180, borderRadius: 16 },
  modalSlot: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  modalTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  modalNotes: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  stepsBox: { marginTop: 4, gap: 6 },
  stepsHeading: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  stepLine: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  closeBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_700Bold' },
});
