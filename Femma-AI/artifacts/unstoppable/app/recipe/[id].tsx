import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

const INGREDIENTS = [
  '2 chicken breasts', '1 cup quinoa', '1 cup cherry tomatoes', '1/2 cucumber', '100g feta cheese',
  '2 tbsp olive oil', '1 lemon, juiced', '1 tsp dried oregano', 'Fresh parsley', 'Salt & pepper',
];

const STEPS = [
  'Cook quinoa in 2 cups of water for 15 minutes until fluffy.',
  'Season chicken with oregano, salt, and pepper. Cook in olive oil over medium heat, 6 min each side.',
  'Halve cherry tomatoes and dice cucumber.',
  'Slice cooked chicken and assemble over quinoa.',
  'Top with tomatoes, cucumber, crumbled feta and fresh parsley.',
  'Drizzle with lemon juice and serve immediately.',
];

export default function RecipeDetailScreen() {
  const colors = useColors();
  const { completeMission } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [cookMode, setCookMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  if (cookMode) {
    return (
      <View style={[styles.cookContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.cookHeader, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => setCookMode(false)}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.cookTitle, { color: colors.foreground }]}>Cooking Mode</Text>
          <Text style={[styles.cookStep, { color: colors.mutedForeground }]}>{currentStep + 1}/{STEPS.length}</Text>
        </View>
        <View style={styles.cookCenter}>
          <View style={[styles.stepNumCircle, { backgroundColor: colors.warmYellow + '20', borderColor: colors.warmYellow }]}>
            <Text style={[styles.stepNumBig, { color: colors.warmYellow }]}>{currentStep + 1}</Text>
          </View>
          <Text style={[styles.cookStepText, { color: colors.foreground }]}>{STEPS[currentStep]}</Text>
        </View>
        <View style={[styles.cookControls, { paddingBottom: botPad + 24 }]}>
          <TouchableOpacity style={[styles.cookNavBtn, { backgroundColor: colors.muted }]} disabled={currentStep === 0} onPress={() => setCurrentStep(s => s - 1)}>
            <Feather name="arrow-left" size={22} color={currentStep === 0 ? colors.border : colors.foreground} />
          </TouchableOpacity>
          {currentStep < STEPS.length - 1
            ? <TouchableOpacity style={[styles.cookNextBtn, { backgroundColor: colors.warmYellow }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCurrentStep(s => s + 1); }}>
                <Text style={styles.cookNextText}>Next Step</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            : <TouchableOpacity style={[styles.cookNextBtn, { backgroundColor: colors.mint }]} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); completeMission('5'); router.replace('/(tabs)'); }}>
                <Text style={styles.cookNextText}>Done!</Text>
                <Feather name="check" size={18} color="#FFFFFF" />
              </TouchableOpacity>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        <LinearGradient colors={['#F26BB5', '#B9A7F2']} style={[styles.hero, { paddingTop: topPad + 12 }]}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Feather name="bookmark" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="book-open" size={40} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.heroTitle}>Greek Chicken Power Bowl</Text>
          <View style={styles.heroMeta}>
            {[{ icon: 'clock', val: '20 min' }, { icon: 'users', val: '2 servings' }, { icon: 'zap', val: '480 kcal' }].map(m => (
              <View key={m.val} style={styles.heroMetaItem}>
                <Feather name={m.icon as any} size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroMetaText}>{m.val}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={[styles.macroRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[{ label: 'Protein', val: '42g', color: colors.skyBlue }, { label: 'Carbs', val: '36g', color: colors.warmYellow }, { label: 'Fat', val: '18g', color: colors.lavender }, { label: 'Fiber', val: '6g', color: colors.mint }].map(m => (
              <View key={m.label} style={styles.macroItem}>
                <Text style={[styles.macroVal, { color: m.color }]}>{m.val}</Text>
                <Text style={[styles.macroLbl, { color: colors.mutedForeground }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ingredients</Text>
          <View style={[styles.ingredientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {INGREDIENTS.map((ing, i) => (
              <View key={ing} style={[styles.ingredientRow, i < INGREDIENTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                <Text style={[styles.ingredientText, { color: colors.foreground }]}>{ing}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Instructions</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.stepCircle, { backgroundColor: colors.warmYellow + '20', borderColor: colors.warmYellow + '40' }]}>
                <Text style={[styles.stepCircleText, { color: colors.warmYellow }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity style={[styles.cookBtn, { backgroundColor: colors.warmYellow }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCookMode(true); }} activeOpacity={0.85}>
          <Feather name="play" size={20} color="#FFFFFF" />
          <Text style={styles.cookBtnText}>Start Cooking Mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cookContainer: { flex: 1 },
  cookHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 12 },
  cookTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  cookStep: { fontSize: 14, fontFamily: 'Manrope_400Regular' },
  cookCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 24 },
  stepNumCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  stepNumBig: { fontSize: 36, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  cookStepText: { fontSize: 20, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', textAlign: 'center', lineHeight: 30 },
  cookControls: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 12 },
  cookNavBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  cookNextBtn: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  cookNextText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  hero: { paddingHorizontal: 22, paddingBottom: 28 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  heroIcon: { justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', marginBottom: 12 },
  heroMeta: { flexDirection: 'row', gap: 16 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  body: { padding: 22, gap: 16 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, borderRadius: 16, borderWidth: 1 },
  macroItem: { alignItems: 'center', gap: 4 },
  macroVal: { fontSize: 18, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  macroLbl: { fontSize: 11, fontFamily: 'Manrope_400Regular' },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  ingredientCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  ingredientText: { fontSize: 14, fontFamily: 'Manrope_400Regular' },
  stepRow: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  stepCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  stepCircleText: { fontSize: 14, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 22 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 12 },
  cookBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  cookBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
