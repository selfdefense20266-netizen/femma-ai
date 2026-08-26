import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { getLastMealScan } from '@/lib/mealScan';

export default function NutritionResultScreen() {
  const colors = useColors();
  const { completeMission } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [serving, setServing] = useState(1);

  const scan = getLastMealScan();

  const macros = useMemo(() => {
    const calories = Number(scan?.calories) || 0;
    const protein = Number(scan?.protein_g) || 0;
    const carbs = Number(scan?.carbs_g) || 0;
    const fat = Number(scan?.fat_g) || 0;
    const fiber = Number(scan?.fiber_g) || 0;
    const sugar = Number(scan?.sugar_g) || 0;
    return [
      { label: 'Calories', value: calories, unit: 'kcal', color: '#F26BB5', max: Math.max(calories * 1.4, 600) },
      { label: 'Protein', value: protein, unit: 'g', color: '#77CDED', max: Math.max(protein * 1.6, 50) },
      { label: 'Carbs', value: carbs, unit: 'g', color: '#FFD88A', max: Math.max(carbs * 1.5, 80) },
      { label: 'Fat', value: fat, unit: 'g', color: '#B9A7F2', max: Math.max(fat * 1.6, 30) },
      { label: 'Fiber', value: fiber, unit: 'g', color: '#A9E4D2', max: Math.max(fiber * 1.8, 10) },
      { label: 'Sugar', value: sugar, unit: 'g', color: '#FF928F', max: Math.max(sugar * 1.8, 25) },
    ];
  }, [scan]);

  const ingredients = scan?.ingredients?.length
    ? scan.ingredients
    : (scan?.tags || []).map((tag) => ({ name: tag, concern: false, detail: '' }));

  const alternatives = scan?.alternatives || [];
  const score = Number(scan?.score) || 0;
  const scoreColor = score >= 80 ? colors.mint : score >= 60 ? colors.warmYellow : colors.coral;

  if (!scan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Scan Result</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ padding: 22, gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Manrope_600SemiBold' }}>
            No scan yet
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Manrope_400Regular' }}>
            Take or upload a food photo to get AI nutrition insights.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 8, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => router.replace('/scan-food' as any)}
          >
            <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>Open Food Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Scan Result</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scoreTop}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.foodName, { color: colors.foreground }]}>{scan.name}</Text>
                  <Text style={[styles.foodSub, { color: colors.mutedForeground }]}>
                    {scan.summary || 'AI nutrition estimate · 1 serving'}
                  </Text>
                </View>
                <View style={[styles.scoreCircle, { backgroundColor: scoreColor + '20', borderColor: scoreColor + '60' }]}>
                  <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
                  <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>score</Text>
                </View>
              </View>

              <View style={[styles.servingRow, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                <Text style={[styles.servingLabel, { color: colors.mutedForeground }]}>Portion</Text>
                <View style={styles.servingControls}>
                  <TouchableOpacity
                    style={[styles.servingBtn, { backgroundColor: colors.card }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setServing((s) => Math.max(0.5, s - 0.5));
                    }}
                  >
                    <Feather name="minus" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[styles.servingValue, { color: colors.foreground }]}>{serving}x</Text>
                  <TouchableOpacity
                    style={[styles.servingBtn, { backgroundColor: colors.card }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setServing((s) => s + 0.5);
                    }}
                  >
                    <Feather name="plus" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          {(scan.tips?.length || 0) > 0 && (
            <Animated.View entering={FadeInDown.delay(120).duration(500)}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Coach Tips</Text>
              <View style={[styles.macroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {scan.tips!.map((tip) => (
                  <Text key={tip} style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Manrope_400Regular', marginBottom: 6 }}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nutrition Breakdown</Text>
            <View style={[styles.macroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {macros.map((m) => {
                const width = Math.min(1, (m.value * serving) / (m.max || 1));
                return (
                  <View key={m.label} style={styles.macroRow}>
                    <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                    <View style={[styles.macroTrack, { backgroundColor: colors.muted }]}>
                      <View style={[styles.macroFill, { backgroundColor: m.color, width: `${width * 100}%` as any }]} />
                    </View>
                    <Text style={[styles.macroValue, { color: colors.foreground }]}>
                      {Math.round(m.value * serving)}
                      {m.unit}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {ingredients.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ingredients</Text>
              <View style={[styles.ingredientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {ingredients.map((ing, i) => (
                  <View
                    key={`${ing.name}-${i}`}
                    style={[styles.ingredientRow, i < ingredients.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <Feather
                      name={ing.concern ? 'alert-circle' : 'check-circle'}
                      size={16}
                      color={ing.concern ? colors.warmYellow : colors.mint}
                    />
                    <View style={styles.ingredientInfo}>
                      <Text style={[styles.ingredientName, { color: colors.foreground }]}>{ing.name}</Text>
                      {!!ing.detail && (
                        <Text style={[styles.ingredientDetail, { color: colors.warmYellow }]}>{ing.detail}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {alternatives.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).duration(500)}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Healthier Alternatives</Text>
              {alternatives.map((alt) => (
                <View key={alt.name} style={[styles.altCard, { backgroundColor: colors.mint + '12', borderColor: colors.mint + '40' }]}>
                  <View style={[styles.altScore, { backgroundColor: colors.mint + '25', borderColor: colors.mint + '60' }]}>
                    <Text style={[styles.altScoreNum, { color: '#2d8a6b' }]}>{alt.score}</Text>
                  </View>
                  <View style={styles.altInfo}>
                    <Text style={[styles.altName, { color: colors.foreground }]}>{alt.name}</Text>
                    <Text style={[styles.altWhy, { color: colors.mutedForeground }]}>{alt.why}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          <View style={styles.mealButtons}>
            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[styles.mealBtn, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  completeMission('4');
                  router.replace('/(tabs)');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.mealBtnText}>+ {meal}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  body: { paddingHorizontal: 22, gap: 16 },
  scoreCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  foodName: { fontSize: 20, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  foodSub: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 3 },
  scoreCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  scoreNum: { fontSize: 22, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  scoreLabel: { fontSize: 10, fontFamily: 'Manrope_400Regular' },
  servingRow: { flexDirection: 'row', alignItems: 'center', padding: 12, justifyContent: 'space-between' },
  servingLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  servingControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  servingBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  servingValue: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold', minWidth: 32, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  macroCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroLabel: { width: 60, fontSize: 12, fontFamily: 'Manrope_400Regular' },
  macroTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: 6, borderRadius: 3 },
  macroValue: { width: 52, fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', textAlign: 'right' },
  ingredientCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  ingredientDetail: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  altCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  altScore: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  altScoreNum: { fontSize: 18, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  altInfo: { flex: 1 },
  altName: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  altWhy: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  mealButtons: { flexDirection: 'row', gap: 8 },
  mealBtn: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mealBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
