import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { usePurchases } from '@/context/PurchaseContext';
import { generateAiRecipes } from '@/lib/recipeAi';
import type { Recipe } from '@/data/recipes';
import RecipeImage from '@/components/RecipeImage';

const GENERATE_TIMEOUT_MS = 45_000;

class RecipeTimeoutError extends Error {}
class RecipeCancelledError extends Error {}

const MEAL_TYPES = [
  { id: 'Breakfast', icon: 'sunny-outline' as const, hint: 'Morning fuel' },
  { id: 'Lunch', icon: 'restaurant-outline' as const, hint: 'Midday plate' },
  { id: 'Dinner', icon: 'moon-outline' as const, hint: 'Evening meal' },
  { id: 'Snack', icon: 'nutrition-outline' as const, hint: 'Light bite' },
] as const;

export default function AiRecipesScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const { hasAccess, ready: purchasesReady } = usePurchases();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 16);

  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]['id']>('Lunch');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Recipe[]>([]);
  /** Aborted on timeout, cancel, or unmount; late results from an aborted run are ignored. */
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  React.useEffect(() => {
    // Wait until access is known, or a premium member opening this screen directly gets bounced.
    if (!purchasesReady || hasAccess) return;
    router.replace({ pathname: '/plan-gate', params: { mode: 'resume' } } as never);
  }, [purchasesReady, hasAccess]);

  const profileChips = useMemo(() => {
    const chips: string[] = [];
    if (profile.goal) chips.push(profile.goal);
    if (profile.fitnessLevel) chips.push(profile.fitnessLevel);
    if (profile.foodPreference) chips.push(profile.foodPreference);
    if (profile.heightCm) chips.push(`${Math.round(profile.heightCm)} cm`);
    if (profile.weightKg) chips.push(`${Math.round(profile.weightKg)} kg`);
    return chips.slice(0, 5);
  }, [profile]);

  const createRecipes = async () => {
    if (generating) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setResults([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // The signal aborts the fetch; the race also rejects immediately on
      // abort (timeout / cancel / unmount) and drops any late result.
      const aborted = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new RecipeTimeoutError('Recipe generation is taking too long. Please try again.'));
        }, GENERATE_TIMEOUT_MS);
        controller.signal.addEventListener('abort', () => reject(new RecipeCancelledError('cancelled')));
      });
      const created = await Promise.race([
        generateAiRecipes(profile, {
          mealType,
          foodPreference: profile.foodPreference || 'Eat everything',
          signal: controller.signal,
        }),
        aborted,
      ]);
      if (controller.signal.aborted) return;
      setResults(created);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (error instanceof RecipeCancelledError) return;
      const message = error instanceof Error ? error.message : 'Could not generate recipes.';
      Alert.alert('AI Recipes failed', message);
    } finally {
      if (timer) clearTimeout(timer);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setGenerating(false);
      }
    }
  };

  const cancelGeneration = () => {
    const controller = abortRef.current;
    if (!controller) return;
    abortRef.current = null;
    controller.abort();
    setGenerating(false);
  };

  const goBack = () => {
    cancelGeneration();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={goBack}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Recipes</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/recipe' as never)}
          hitSlop={12}
        >
          <Feather name="book-open" size={18} color={colors.pink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 28 }}
      >
        <Animated.View entering={FadeInDown.duration(420)} style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.deepPink, colors.lavender]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Cook with your profile</Text>
            <Text style={styles.heroSub}>
              We already know your plan, body metrics, and food style. Pick only the meal time — ChatGPT builds the recipes.
            </Text>
          </LinearGradient>
        </Animated.View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR PROFILE</Text>
        <View style={styles.chipRow}>
          {profileChips.length ? (
            profileChips.map((chip) => (
              <View key={chip} style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.foreground }]}>{chip}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Complete onboarding for better matches.
            </Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 22 }]}>
          WHAT MEAL DO YOU NEED?
        </Text>
        <View style={styles.mealGrid}>
          {MEAL_TYPES.map((item, index) => {
            const active = mealType === item.id;
            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(80 + index * 40).duration(360)}
                style={styles.mealGridItem}
              >
                <TouchableOpacity
                  style={[
                    styles.mealCard,
                    {
                      backgroundColor: active ? colors.pink + '14' : colors.card,
                      borderColor: active ? colors.pink : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMealType(item.id);
                    setResults([]);
                  }}
                  disabled={generating}
                  activeOpacity={0.88}
                >
                  <View
                    style={[
                      styles.mealIconWrap,
                      { backgroundColor: active ? colors.pink : colors.muted },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? '#FFFFFF' : colors.mutedForeground}
                    />
                  </View>
                  <Text style={[styles.mealTitle, { color: colors.foreground }]}>{item.id}</Text>
                  <Text style={[styles.mealHint, { color: colors.mutedForeground }]}>{item.hint}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {!results.length ? (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.pink, opacity: generating ? 0.75 : 1 }]}
            onPress={() => void createRecipes()}
            disabled={generating}
            activeOpacity={0.9}
          >
            {generating ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.ctaText}>Creating {mealType.toLowerCase()} recipes…</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>Generate {mealType.toLowerCase()} recipes</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {generating ? (
          <TouchableOpacity onPress={cancelGeneration} hitSlop={10} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        ) : null}

        {results.length ? (
          <View style={styles.results}>
            <View style={styles.resultsHead}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
                Your {mealType.toLowerCase()} recipes
              </Text>
              <TouchableOpacity onPress={() => router.push('/recipe' as never)}>
                <Text style={[styles.resultsLink, { color: colors.pink }]}>All recipes</Text>
              </TouchableOpacity>
            </View>
            {results.map((recipe, i) => (
              <Animated.View key={recipe.id} entering={FadeInDown.delay(i * 50).duration(320)}>
                <TouchableOpacity
                  style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/recipe/${recipe.id}` as never)}
                  activeOpacity={0.88}
                >
                  <RecipeImage recipe={recipe} style={styles.resultImage} rounded={14} contentFit="cover" />
                  <View style={styles.resultCopy}>
                    <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
                      {mealType.toUpperCase()} · {recipe.time}
                    </Text>
                    <Text style={[styles.resultTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {recipe.title}
                    </Text>
                    <Text style={[styles.resultMacros, { color: colors.mutedForeground }]}>
                      {recipe.calories} kcal · {recipe.protein}g protein
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cancelBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  cancelText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  heroWrap: { paddingHorizontal: 20, marginTop: 6, marginBottom: 22 },
  hero: {
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 21,
  },
  sectionLabel: {
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.9,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  emptyHint: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  mealGridItem: { width: '47.5%', flexGrow: 1 },
  mealCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 118,
  },
  mealIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mealTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  mealHint: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  cta: {
    marginHorizontal: 20,
    marginTop: 22,
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  results: { marginTop: 28, paddingHorizontal: 20, gap: 10 },
  resultsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultsTitle: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold' },
  resultsLink: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultImage: { width: 72, height: 72 },
  resultCopy: { flex: 1, gap: 3 },
  resultMeta: { fontSize: 10, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 },
  resultTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', lineHeight: 20 },
  resultMacros: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
});
