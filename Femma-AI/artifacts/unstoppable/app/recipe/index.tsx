import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import FilterChip from '@/components/FilterChip';
import RecipeImage from '@/components/RecipeImage';
import { useApp } from '@/context/AppContext';
import {
  hydrateGeneratedRecipes,
  profileGoalIds,
  recipesForProfile,
} from '@/data/recipes';
import { CUISINES, MEAL_TYPES, toProtocol, type Cuisine, type MealType } from '@/data/recipeProtocol';
import { generateAiRecipes } from '@/lib/recipeAi';
import { ONBOARDING_GOALS } from '@/lib/nutritionPlan';

const FOOD_STYLES = ['Eat everything', 'Vegetarian', 'Carnivore', 'Gluten-free', 'Dairy-free', 'High protein', 'Low carb'];
const BG = '#FFFFFF';
const CARD = '#F5F5F8';
const MUTED = '#747985';
const INK = '#17181C';
const SURFACE = '#F5F5F8';

export default function RecipeBrowse() {
  const colors = useColors();
  const accent = colors.primary;
  const accentDeep = colors.deepPink;
  const lavender = colors.lavender;
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const defaultGoal = profileGoalIds(profile)[0] || 'boxing';

  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<MealType>('Dinner');
  const [cuisine, setCuisine] = useState<Cuisine>('Any Cuisine');
  const [version, setVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [askAi, setAskAi] = useState(false);
  const [goalId, setGoalId] = useState(defaultGoal);
  const [food, setFood] = useState(profile.foodPreference || 'Eat everything');

  useEffect(() => {
    void hydrateGeneratedRecipes().then(() => setVersion((n) => n + 1));
  }, []);

  useEffect(() => {
    setGoalId(profileGoalIds(profile)[0] || 'boxing');
    setFood(profile.foodPreference || 'Eat everything');
  }, [profile.goal, profile.foodPreference, profile.isPregnant]);

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

  const runGenerate = async (closeModal: boolean) => {
    if (generating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);
    try {
      const created = await generateAiRecipes(profile, { goalId, foodPreference: food });
      if (closeModal) setAskAi(false);
      setVersion((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const label = ONBOARDING_GOALS.find((item) => item.id === goalId)?.label || 'your plan';
      Alert.alert(
        closeModal ? 'Protocols ready' : 'Synced',
        created.length
          ? `Added ${created.length} ${label.toLowerCase()} recipe${created.length === 1 ? '' : 's'}.`
          : 'Library refreshed.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate recipes.';
      Alert.alert(closeModal ? 'AI Generate failed' : 'Sync failed', message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.title}>Protocols</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAskAi(true);
          }}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <Feather name="zap" size={18} color={accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 28 }}>
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
            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: accent }, generating && { opacity: 0.7 }]}
              onPress={() => void runGenerate(false)}
              disabled={generating}
              activeOpacity={0.88}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.syncText}>SYNC</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealRow}>
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
      </ScrollView>

      <Modal visible={askAi} animationType="slide" transparent onRequestClose={() => !generating && setAskAi(false)}>
        <View style={styles.modalShade}>
          <View style={[styles.modalCard, { backgroundColor: '#FFFFFF', paddingBottom: botPad + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>What should AI cook?</Text>
            <Text style={styles.modalSub}>Pick a plan and food style. AI will build new protocols.</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Training</Text>
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
                    color={accent}
                  />
                ))}
              </View>
              <Text style={styles.modalLabel}>What you can eat</Text>
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
                    color={lavender}
                  />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: accentDeep, opacity: generating ? 0.75 : 1 }]}
              onPress={() => void runGenerate(true)}
              disabled={generating}
              activeOpacity={0.9}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="zap" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.modalBtnText}>{generating ? 'Cooking…' : 'Create protocols'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={generating} onPress={() => setAskAi(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    color: INK,
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  searchRow: { paddingHorizontal: 16, marginTop: 4 },
  searchBar: {
    height: 52,
    borderRadius: 26,
    backgroundColor: SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: INK,
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  syncBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  syncText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.6 },
  mealRow: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
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
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '88%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D5D0',
    marginBottom: 14,
  },
  modalTitle: { color: INK, fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  modalSub: {
    color: MUTED,
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  modalScroll: { maxHeight: 360 },
  modalLabel: { color: INK, fontSize: 13, fontFamily: 'Manrope_700Bold', marginBottom: 8 },
  filtersWrapInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
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
  modalCancelText: { color: MUTED, fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
});
