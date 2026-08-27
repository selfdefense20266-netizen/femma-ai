import React, { useEffect, useMemo, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import FilterChip from '@/components/FilterChip';
import SectionHeader from '@/components/SectionHeader';
import { useApp } from '@/context/AppContext';
import {
  RECIPE_FILTERS,
  hydrateGeneratedRecipes,
  recommendedRecipeFilter,
  recipesForProfile,
} from '@/data/recipes';
import { generateAiRecipes } from '@/lib/recipeAi';

export default function RecipeBrowse() {
  const colors = useColors();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const defaultFilter = recommendedRecipeFilter(profile);
  const [activeFilter, setActiveFilter] = useState(defaultFilter);
  const [filterTouched, setFilterTouched] = useState(false);
  const [version, setVersion] = useState(0);
  const [generating, setGenerating] = useState(false);

  const recipes = useMemo(
    () => recipesForProfile(profile, activeFilter),
    [profile, activeFilter, version]
  );

  useEffect(() => {
    void hydrateGeneratedRecipes().then(() => setVersion((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!filterTouched) setActiveFilter(defaultFilter);
  }, [defaultFilter, filterTouched]);

  const onGenerate = async () => {
    if (generating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);
    try {
      const created = await generateAiRecipes(profile);
      setVersion((n) => n + 1);
      setActiveFilter('All');
      setFilterTouched(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Recipes ready',
        created.length === 1
          ? `Added ${created[0].title}.`
          : `Added ${created.length} recipes tailored to your goal.`
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Recipes</Text>
        <TouchableOpacity
          style={[styles.aiBtn, { backgroundColor: colors.primary, opacity: generating ? 0.7 : 1 }]}
          onPress={() => void onGenerate()}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="zap" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.aiBtnText}>{generating ? 'Generating' : 'AI Generate'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 32 }}
        nestedScrollEnabled
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          nestedScrollEnabled
        >
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
        </ScrollView>

        <View style={styles.body}>
          <SectionHeader title={activeFilter === 'All' ? 'Recommended for You' : `${activeFilter} recipes`} />
          {recipes.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No recipes in this category yet. Try All, or tap AI Generate for meals matched to your goal.
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
                  <LinearGradient colors={r.gradient} style={styles.recipeImg}>
                    <Feather name="book-open" size={28} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                  <View style={styles.recipeInfo}>
                    <Text style={[styles.recipeTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <View style={styles.recipeMeta}>
                      <Feather name="clock" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.time}</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>·</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.calories} kcal</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>·</Text>
                      <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.protein}g protein</Text>
                    </View>
                    <View style={styles.recipeTags}>
                      {(r.source === 'ai' ? ['AI', ...r.tags] : r.tags).slice(0, 2).map((t) => (
                        <View key={t} style={[styles.recipeTag, { backgroundColor: colors.muted }]}>
                          <Text style={[styles.recipeTagText, { color: colors.mutedForeground }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.ratingCol}>
                    <Feather name="star" size={12} color={colors.warmYellow} />
                    <Text style={[styles.ratingText, { color: colors.foreground }]}>{r.rating}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  aiBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  scroll: { flex: 1 },
  filtersRow: { paddingHorizontal: 22, paddingVertical: 12, gap: 8 },
  body: { paddingHorizontal: 22, gap: 10 },
  empty: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20, paddingVertical: 12 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden', gap: 12 },
  recipeImg: { width: 88, height: 88, justifyContent: 'center', alignItems: 'center' },
  recipeInfo: { flex: 1, paddingVertical: 12, gap: 5 },
  recipeTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold', lineHeight: 21 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  recipeMetaText: { fontSize: 11, fontFamily: 'Manrope_400Regular' },
  recipeTags: { flexDirection: 'row', gap: 5 },
  recipeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  recipeTagText: { fontSize: 10, fontFamily: 'Manrope_600SemiBold' },
  ratingCol: { alignItems: 'center', gap: 2, paddingRight: 14 },
  ratingText: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
