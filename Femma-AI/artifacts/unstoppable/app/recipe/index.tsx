import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import FilterChip from '@/components/FilterChip';
import SectionHeader from '@/components/SectionHeader';

const FILTERS = ['All', 'High Protein', 'Quick', 'Vegan', 'Weight Loss', 'Pregnancy', 'Recovery'];

const RECIPES = [
  { id: 'r1', title: 'Greek Chicken Power Bowl', time: '20 min', calories: 480, protein: 42, rating: 4.9, tags: ['High Protein', 'Meal Prep'], gradient: ['#F26BB5', '#B9A7F2'] as [string, string] },
  { id: 'r2', title: 'Green Goddess Smoothie', time: '5 min', calories: 220, protein: 18, rating: 4.7, tags: ['Quick', 'Vegan'], gradient: ['#A9E4D2', '#77CDED'] as [string, string] },
  { id: 'r3', title: 'Salmon & Quinoa', time: '25 min', calories: 520, protein: 38, rating: 4.8, tags: ['Recovery', 'Omega-3'], gradient: ['#77CDED', '#B9A7F2'] as [string, string] },
  { id: 'r4', title: 'Pregnancy Oat Bowl', time: '10 min', calories: 380, protein: 14, rating: 4.9, tags: ['Pregnancy', 'Iron-rich'], gradient: ['#FFD88A', '#FF928F'] as [string, string] },
  { id: 'r5', title: 'Anti-Inflammatory Turmeric Soup', time: '30 min', calories: 290, protein: 12, rating: 4.6, tags: ['Recovery', 'Vegan'], gradient: ['#FF928F', '#FFD88A'] as [string, string] },
];

export default function RecipeBrowse() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Recipes</Text>
        <TouchableOpacity style={[styles.aiBtn, { backgroundColor: colors.primary }]}>
          <Feather name="zap" size={16} color="#FFFFFF" />
          <Text style={styles.aiBtnText}>AI Generate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 32 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map(f => (
            <FilterChip key={f} label={f} selected={activeFilter === f} onPress={() => { Haptics.selectionAsync(); setActiveFilter(f); }} color={colors.warmYellow} />
          ))}
        </ScrollView>

        <View style={styles.body}>
          <SectionHeader title="Recommended for You" />
          {RECIPES.map((r, i) => (
            <Animated.View key={r.id} entering={FadeInDown.delay(i * 70).duration(400)}>
              <TouchableOpacity
                style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/recipe/${r.id}` as any); }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={r.gradient} style={styles.recipeImg}>
                  <Feather name="book-open" size={28} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
                <View style={styles.recipeInfo}>
                  <Text style={[styles.recipeTitle, { color: colors.foreground }]} numberOfLines={2}>{r.title}</Text>
                  <View style={styles.recipeMeta}>
                    <Feather name="clock" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.time}</Text>
                    <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.calories} kcal</Text>
                    <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{r.protein}g protein</Text>
                  </View>
                  <View style={styles.recipeTags}>
                    {r.tags.slice(0, 2).map(t => (
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
          ))}
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
  filtersRow: { paddingHorizontal: 22, paddingVertical: 12, gap: 8 },
  body: { paddingHorizontal: 22, gap: 10 },
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
