import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import FilterChip from '@/components/FilterChip';
import SectionHeader from '@/components/SectionHeader';
import { useApp } from '@/context/AppContext';
import {
  RECIPE_FILTERS,
  hydrateGeneratedRecipes,
  profileGoalIds,
  recommendedRecipeFilter,
  recipesForProfile,
  recipesListTitle,
} from '@/data/recipes';
import RecipeImage from '@/components/RecipeImage';
import { generateAiRecipes } from '@/lib/recipeAi';
import { goalLabels, ONBOARDING_GOALS } from '@/lib/nutritionPlan';

const FOOD_STYLES = ['Eat everything', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'High protein', 'Low carb'];

export default function RecipeBrowse() {
  const colors = useColors();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const defaultFilter = recommendedRecipeFilter(profile);
  const defaultGoal = profileGoalIds(profile)[0] || 'boxing';
  const [activeFilter, setActiveFilter] = useState(defaultFilter);
  const [filterTouched, setFilterTouched] = useState(false);
  const [version, setVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [askAi, setAskAi] = useState(false);
  const [goalId, setGoalId] = useState(defaultGoal);
  const [food, setFood] = useState(profile.foodPreference || 'Eat everything');

  const recipes = useMemo(
    () => recipesForProfile(profile, activeFilter),
    [profile, activeFilter, version]
  );
  const imageSize = compact ? 76 : 92;

  useEffect(() => {
    void hydrateGeneratedRecipes().then(() => setVersion((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!filterTouched) setActiveFilter(defaultFilter);
  }, [defaultFilter, filterTouched]);

  useEffect(() => {
    setGoalId(profileGoalIds(profile)[0] || 'boxing');
    setFood(profile.foodPreference || 'Eat everything');
  }, [profile.goal, profile.foodPreference, profile.isPregnant]);

  const onGenerate = async () => {
    if (generating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);
    try {
      const created = await generateAiRecipes(profile, { goalId, foodPreference: food });
      setAskAi(false);
      setVersion((n) => n + 1);
      setActiveFilter('All');
      setFilterTouched(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const label = ONBOARDING_GOALS.find((item) => item.id === goalId)?.label || 'your plan';
      Alert.alert(
        'Recipes ready',
        created.length === 1
          ? `Added ${created[0].title} for ${label}.`
          : `Added ${created.length} ${label.toLowerCase()} recipes you can eat.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate recipes.';
      Alert.alert('AI Generate failed', message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          Recipes
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 32 }}
        nestedScrollEnabled
      >
        <TouchableOpacity
          style={[styles.aiBanner, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAskAi(true);
          }}
          activeOpacity={0.9}
        >
          <View style={styles.aiIcon}>
            <Feather name="zap" size={20} color={colors.primary} />
          </View>
          <View style={styles.aiCopy}>
            <Text style={styles.aiTitle}>AI Generate</Text>
            <Text style={styles.aiSub} numberOfLines={2}>
              Tell AI boxing, weight loss, pregnancy… it cooks recipes for you
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.filtersWrap}>
          {RECIPE_FILTERS.map((f) => (
            <FilterChip
              key={f}
              label={f}
              selected={activeFilter === f}
              onPress={() => {
                Haptics.selectionAsync();
                setFilterTouched(true);
                setActiveFilter(f);
              }}
              color={colors.warmYellow}
            />
          ))}
        </View>

        <View style={styles.body}>
          <SectionHeader title={recipesListTitle(profile, activeFilter)} />
          {recipes.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No meals match your {goalLabels(profile.goal).join(' + ') || 'plan'}
              {profile.foodPreference && profile.foodPreference !== 'Eat everything'
                ? ` and ${profile.foodPreference}`
                : ''}
              . Tap AI Generate to cook new ones.
            </Text>
          ) : (
            recipes.map((r, i) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(i * 70).duration(400)}>
                <TouchableOpacity
                  style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/recipe/${r.id}` as never);
                  }}
                  activeOpacity={0.85}
                >
                  <RecipeImage recipe={r} style={{ width: imageSize, height: imageSize }} iconSize={28} />
                  <View style={styles.recipeInfo}>
                    <Text style={[styles.recipeTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <View style={styles.recipeMeta}>
                      <View style={styles.metaItem}>
                        <Feather name="clock" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.time}</Text>
                      </View>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>·</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.calories} kcal</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>·</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.protein}g protein</Text>
                      <View style={styles.ratingInline}>
                        <Feather name="star" size={11} color={colors.warmYellow} />
                        <Text style={[styles.ratingText, { color: colors.foreground }]}>{r.rating}</Text>
                      </View>
                    </View>
                    <View style={styles.recipeTags}>
                      {(r.source === 'ai' ? ['AI', ...r.tags] : r.tags).slice(0, 2).map((t) => (
                        <View key={t} style={[styles.recipeTag, { backgroundColor: colors.muted }]}>
                          <Text style={[styles.recipeTagText, { color: colors.mutedForeground }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={askAi} animationType="slide" transparent onRequestClose={() => !generating && setAskAi(false)}>
        <View style={styles.modalShade}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, paddingBottom: botPad + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>What should AI cook?</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Pick boxing, weight loss, pregnancy, or any plan. AI will build recipes for that.
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: colors.foreground }]}>Training</Text>
              <View style={styles.filtersWrapInner}>
                {ONBOARDING_GOALS.map((goal) => (
                  <FilterChip
                    key={goal.id}
                    label={goal.label}
                    selected={goalId === goal.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setGoalId(goal.id);
                    }}
                    color={colors.primary}
                  />
                ))}
              </View>
              <Text style={[styles.modalLabel, { color: colors.foreground }]}>What you can eat</Text>
              <View style={styles.filtersWrapInner}>
                {FOOD_STYLES.map((item) => (
                  <FilterChip
                    key={item}
                    label={item}
                    selected={food === item}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFood(item);
                    }}
                    color={colors.warmYellow}
                  />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: generating ? 0.75 : 1 }]}
              onPress={() => void onGenerate()}
              disabled={generating}
              activeOpacity={0.9}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="zap" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.modalBtnText}>{generating ? 'Cooking recipes…' : 'Create recipes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={generating} onPress={() => setAskAi(false)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, fontSize: 20, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  scroll: { flex: 1, width: '100%' },
  aiBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCopy: { flex: 1, minWidth: 0, gap: 2 },
  aiTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  aiSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontFamily: 'Manrope_500Medium', lineHeight: 16 },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filtersWrapInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  body: { paddingHorizontal: 16, gap: 10, width: '100%' },
  empty: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20, paddingVertical: 12 },
  recipeCard: { flexDirection: 'row', alignItems: 'stretch', borderRadius: 16, borderWidth: 1, overflow: 'hidden', width: '100%' },
  recipeInfo: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 12, gap: 6, justifyContent: 'center' },
  recipeTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold', lineHeight: 21 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recipeMetaText: { fontSize: 11, fontFamily: 'Manrope_400Regular' },
  recipeTags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  recipeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  recipeTagText: { fontSize: 10, fontFamily: 'Manrope_600SemiBold' },
  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, maxHeight: '88%' },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D8D5D0', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  modalSub: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18, marginTop: 6, marginBottom: 16 },
  modalScroll: { maxHeight: 360 },
  modalLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold', marginBottom: 8 },
  modalBtn: {
    marginTop: 8,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
});
