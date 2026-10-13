import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { hydrateGeneratedRecipes, recipesForProfile } from '@/data/recipes';
import { CUISINES, MEAL_TYPES, toProtocol, type Cuisine, type MealType } from '@/data/recipeProtocol';
import RecipeImage from '@/components/RecipeImage';

type MealKey = MealSlotKey;
type TabId = 'suggested' | 'mine';

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

const CARD = '#F5F5F8';
const MUTED = '#747985';
const INK = '#17181C';
const SURFACE = '#F5F5F8';

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
  const accent = colors.primary;
  const lavender = colors.lavender;
  const { profile } = useApp();
  const { hasAccess, ready: purchasesReady } = usePurchases();
  const { data: adminPlan, isLoading } = useDailyPlan();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const todayDay = Math.min(30, Math.max(1, Number(profile.journeyDay) || 1));
  const [tab, setTab] = useState<TabId>('suggested');
  const [detail, setDetail] = useState<MealDetail | null>(null);

  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<MealType>('Dinner');
  const [cuisine, setCuisine] = useState<Cuisine>('Any Cuisine');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Wait until access is known, or a premium member opening this screen directly gets bounced.
    if (!purchasesReady || hasAccess) return;
    router.replace({ pathname: '/plan-gate', params: { mode: 'resume' } } as never);
  }, [purchasesReady, hasAccess]);

  useEffect(() => {
    void hydrateGeneratedRecipes().then(() => setVersion((n) => n + 1));
  }, []);

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

  const protocols = useMemo(() => {
    const base = recipesForProfile(profile, 'All').map(toProtocol);
    const q = search.trim().toLowerCase();
    return base.filter((recipe) => {
      if (recipe.mealType !== mealType) return false;
      if (cuisine !== 'Any Cuisine' && recipe.cuisine !== cuisine) return false;
      if (!q) return true;
      const hay = `${recipe.title} ${recipe.ingredients.join(' ')} ${recipe.blueprint}`.toLowerCase();
      return hay.includes(q);
    });
  }, [profile, mealType, cuisine, search, version]);

  const quick = protocols.slice(0, 12);

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
                ['suggested', 'Today diet'],
                ['mine', 'Recipes'],
              ] as const
            ).map(([id, label]) => (
              <TouchableOpacity
                key={id}
                style={[styles.segmentBtn, tab === id ? { backgroundColor: colors.pink } : null]}
                onPress={() => setTab(id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segmentText, { color: tab === id ? '#FFFFFF' : colors.mutedForeground }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {tab === 'suggested' ? (
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
        ) : (
          <View>
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Feather name="search" size={16} color={MUTED} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="SEARCH MOLECULAR INGREDIENTS..."
                  placeholderTextColor="#A0A4B0"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealTypeRow}>
              {MEAL_TYPES.map((type) => {
                const active = mealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealPill, active && { backgroundColor: INK }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMealType(type);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.mealPillText, active && { color: '#FFFFFF' }]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.cuisineBlock}>
              <Text style={styles.cuisineLabel}>CUISINE:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineRow}>
                {CUISINES.map((item) => {
                  const active = cuisine === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.cuisinePill,
                        active && { borderColor: accent, backgroundColor: `${accent}18` },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCuisine(item);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.cuisineText, active && { color: accent }]}>
                        {item.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.sectionHead}>
              <Feather name="star" size={12} color={accent} />
              <Text style={[styles.sectionLabel, { color: accent }]}>QUICK PROTOCOLS</Text>
            </View>

            {quick.length === 0 ? (
              <Text style={styles.empty}>No protocols match these filters. Try another meal or cuisine.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                {quick.map((recipe, i) => (
                  <Animated.View key={recipe.id} entering={FadeInDown.delay(i * 40).duration(320)}>
                    <TouchableOpacity
                      style={styles.protocolCard}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/recipe/${recipe.id}` as never);
                      }}
                      activeOpacity={0.88}
                    >
                      <RecipeImage
                        recipe={recipe}
                        style={styles.protocolImage}
                        rounded={0}
                        contentFit="cover"
                        iconSize={20}
                      />
                      <Text style={styles.protocolMeal}>{recipe.mealType.toUpperCase()}</Text>
                      <Text style={[styles.protocolTitle, i % 3 === 2 && { color: accent }]} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
            )}

            <View style={[styles.sectionHead, { marginTop: 22 }]}>
              <Feather name="grid" size={12} color={lavender} />
              <Text style={styles.sectionLabel}>ALL {mealType.toUpperCase()} PROTOCOLS</Text>
            </View>

            <View style={styles.list}>
              {protocols.map((recipe, i) => (
                <Animated.View key={recipe.id} entering={FadeInDown.delay(Math.min(i, 8) * 35).duration(320)}>
                  <TouchableOpacity
                    style={styles.listCard}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/recipe/${recipe.id}` as never);
                    }}
                    activeOpacity={0.88}
                  >
                    <RecipeImage
                      recipe={recipe}
                      style={styles.listImage}
                      rounded={14}
                      contentFit="cover"
                      iconSize={22}
                    />
                    <View style={styles.listCopy}>
                      <Text style={styles.listMeal}>
                        {recipe.mealType.toUpperCase()} · {recipe.cuisine.toUpperCase()}
                      </Text>
                      <Text style={styles.listTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                      <Text style={styles.listMeta}>
                        {recipe.calories} kcal · {recipe.protein}g protein · {recipe.netCarbs}g net carbs
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={MUTED} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        )}
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
  segmentBtn: { flex: 1, height: 36, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
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
  searchRow: { paddingHorizontal: 16, marginTop: 4 },
  searchBar: {
    height: 52,
    borderRadius: 26,
    backgroundColor: SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: INK,
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  mealTypeRow: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  mealPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: SURFACE,
  },
  mealPillText: { color: MUTED, fontSize: 12, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 },
  cuisineBlock: { marginTop: 16, paddingLeft: 16, gap: 8 },
  cuisineLabel: { color: MUTED, fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.8 },
  cuisineRow: { gap: 8, paddingRight: 16 },
  cuisinePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cuisineText: { color: MUTED, fontSize: 11, fontFamily: 'Manrope_600SemiBold', letterSpacing: 0.4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionLabel: { color: MUTED, fontSize: 12, fontFamily: 'Manrope_700Bold', letterSpacing: 0.8 },
  quickRow: { paddingHorizontal: 16, gap: 10 },
  protocolCard: {
    width: 148,
    borderRadius: 16,
    backgroundColor: CARD,
    overflow: 'hidden',
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E7ED',
  },
  protocolImage: { width: '100%', height: 96 },
  protocolMeal: {
    color: MUTED,
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  protocolTitle: {
    color: INK,
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  empty: {
    color: MUTED,
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  list: { paddingHorizontal: 16, gap: 10 },
  listCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E4E7ED',
  },
  listImage: { width: 72, height: 72 },
  listCopy: { flex: 1, gap: 4 },
  listMeal: { color: MUTED, fontSize: 10, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 },
  listTitle: { color: INK, fontSize: 15, fontFamily: 'Manrope_700Bold', lineHeight: 20 },
  listMeta: { color: MUTED, fontSize: 12, fontFamily: 'Manrope_400Regular' },
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
