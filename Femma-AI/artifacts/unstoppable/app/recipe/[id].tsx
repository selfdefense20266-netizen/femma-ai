import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import RecipeImage from '@/components/RecipeImage';
import NutritionIcon from '@/components/NutritionIcon';
import { getRecipe, hydrateGeneratedRecipes } from '@/data/recipes';
import { toProtocol, type RecipeProtocol } from '@/data/recipeProtocol';

const BG = '#FFFFFF';
const CARD = '#F5F5F8';
const MUTED = '#747985';
const ACCENT = '#F26BB5';
const SHEET = '#FAFAFC';
const CARD_SHADOW = {
  shadowColor: '#17181C',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const DAILY_VALUES: Record<string, number> = {
  fat_g: 78,
  cholesterol_mg: 300,
  sodium_mg: 2300,
  carbs_g: 275,
  calcium_mg: 1300,
  iron_mg: 18,
  potassium_mg: 4700,
};

function formatAmount(value: number, unit: string) {
  const rounded =
    unit === 'g' || unit === 'mg' || unit === 'mcg' || unit === 'IU'
      ? Math.abs(value - Math.round(value)) < 0.05
        ? Math.round(value)
        : Math.round(value * 10) / 10
      : Math.round(value);
  return `${rounded}${unit}`;
}

function NutrientRow({
  label,
  value,
  unit,
  dvKey,
  indent,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  dvKey?: string;
  indent?: boolean;
}) {
  if (value === undefined || value === null) return null;
  const dv = dvKey ? DAILY_VALUES[dvKey] : undefined;
  const pct = dv ? Math.round((Number(value) / dv) * 100) : null;
  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientTop}>
        <Text style={[styles.nutrientLabel, indent && styles.nutrientLabelIndent]}>{label}</Text>
        <Text style={styles.nutrientValue}>{formatAmount(Number(value), unit)}</Text>
        <Text style={styles.nutrientPct}>{pct !== null ? `${pct}%` : ''}</Text>
      </View>
      {pct !== null ? (
        <View style={styles.dvTrack}>
          <View style={[styles.dvFill, { width: `${Math.min(100, Math.max(2, pct))}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function DietChip({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={[styles.dietChip, value ? styles.dietChipYes : styles.dietChipNo]}>
      <Feather name={value ? 'check' : 'x'} size={13} color={value ? '#2E8A6E' : '#9A9EA8'} />
      <Text style={[styles.dietChipText, { color: value ? '#1F6450' : '#9A9EA8' }]}>{label}</Text>
    </View>
  );
}

function FactRow({
  label,
  value,
  valueColor,
  stacked,
}: {
  label: string;
  value?: string;
  valueColor?: string;
  stacked?: boolean;
}) {
  if (!value) return null;
  if (stacked) {
    return (
      <View style={styles.factStacked}>
        <Text style={styles.factStackedLabel}>{label}</Text>
        <Text style={styles.factStackedValue}>{value}</Text>
      </View>
    );
  }
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function FactsHeading({ children }: { children: string }) {
  return <Text style={styles.factsHeading}>{children}</Text>;
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={16} color={iconColor} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}


const UNIT_RE =
  /^((?:\d+\s+)?\d*[.,]?\d+(?:\s*\/\s*\d+)?|[½¼¾⅓⅔])\s*(kg|g|mg|ml|l|cups?|tbsp|tsp|oz|lbs?|pinch(?:es)?|cloves?|slices?|scoops?|handfuls?|cans?|pieces?)?\.?\s+(?:of\s+)?(.+)$/i;
const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const METRIC_UNITS = new Set(['kg', 'g', 'mg', 'ml', 'l']);

function parseQuantity(raw: string) {
  const q = raw.trim();
  if (UNICODE_FRACTIONS[q] !== undefined) return UNICODE_FRACTIONS[q];
  const mixed = q.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = q.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(q.replace(',', '.'));
}

const FRACTION_GLYPHS: [number, string][] = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
];

function formatQuantity(n: number) {
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  const whole = Math.floor(n);
  const glyph = FRACTION_GLYPHS.find(([v]) => Math.abs(n - whole - v) < 0.04);
  if (glyph) return `${whole || ''}${glyph[1]}`;
  return String(Math.round(n * 10) / 10);
}

/** "200g fresh blueberries" -> { name: "Fresh blueberries", amount: "200g" }, scaled by servings. */
function splitIngredient(line: string, scale: number) {
  const m = line.trim().match(UNIT_RE);
  if (!m) return { name: line.trim(), amount: '' };
  const qty = parseQuantity(m[1]);
  const unit = m[2] ? m[2].toLowerCase() : '';
  const name = m[3].trim();
  let amount = m[1];
  if (Number.isFinite(qty)) {
    const value = formatQuantity(qty * scale);
    const scaled = qty * scale;
    // "1 cup" -> "1½ cups"; only for plain-word units (not tbsp/tsp/oz or metric).
    const word = unit === 'cup' && scaled > 1.05 ? 'cups' : unit === 'cups' && scaled <= 1.05 ? 'cup' : unit;
    amount = !unit ? value : METRIC_UNITS.has(unit) ? `${value}${unit}` : `${value} ${word}`;
  }
  return { name: name.charAt(0).toUpperCase() + name.slice(1), amount };
}

function MacroCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroCard}>
      <NutritionIcon label={label} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function RecipeDetailScreen() {
  const colors = useColors();
  const { completeMission } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [protocol, setProtocol] = useState<RecipeProtocol | null>(() => {
    const found = getRecipe(recipeId);
    return found ? toProtocol(found) : null;
  });
  const [ready, setReady] = useState(Boolean(getRecipe(recipeId)));
  const [cookMode, setCookMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // null = the recipe's own serving count (ingredient amounts are written for that many).
  const [servingsOverride, setServingsOverride] = useState<number | null>(null);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [factsOpen, setFactsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateGeneratedRecipes().then(() => {
      if (cancelled) return;
      const found = getRecipe(recipeId);
      setProtocol(found ? toProtocol(found) : null);
      setReady(true);
      setCookMode(false);
      setCurrentStep(0);
      setServingsOverride(null);
    });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (!ready) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  if (!protocol) {
    return (
      <View style={[styles.container, { backgroundColor: BG }]}>
        <View style={[styles.topBar, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color="#17181C" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Protocol</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.missing}>That recipe is no longer available.</Text>
        </View>
      </View>
    );
  }

  const steps = protocol.steps;
  const ingredients = protocol.ingredients;

  if (cookMode) {
    return (
      <View style={[styles.container, { backgroundColor: BG }]}>
        <View style={[styles.topBar, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => setCookMode(false)}>
            <Feather name="x" size={22} color="#17181C" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Kinetic Mode</Text>
          <Text style={styles.stepCount}>
            {currentStep + 1}/{steps.length}
          </Text>
        </View>
        <View style={styles.cookCenter}>
          <View style={styles.stepNumCircle}>
            <Text style={styles.stepNumBig}>{currentStep + 1}</Text>
          </View>
          <Text style={styles.cookStepText}>{steps[currentStep]}</Text>
        </View>
        <View style={[styles.cookControls, { paddingBottom: botPad + 24 }]}>
          <TouchableOpacity
            style={styles.cookNavBtn}
            disabled={currentStep === 0}
            onPress={() => setCurrentStep((s) => s - 1)}
          >
            <Feather name="arrow-left" size={22} color={currentStep === 0 ? '#C8CAD0' : '#17181C'} />
          </TouchableOpacity>
          {currentStep < steps.length - 1 ? (
            <TouchableOpacity
              style={styles.cookNextBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCurrentStep((s) => s + 1);
              }}
            >
              <Text style={styles.cookNextText}>Next Step</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.cookNextBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                completeMission('recipe');
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.cookNextText}>Done!</Text>
              <Feather name="check" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const baseServings = Math.max(1, Number(protocol.servings) || 1);
  const servings = servingsOverride ?? baseServings;
  const scale = servings / baseServings;
  const totalMin = (Number(protocol.prepMin) || 0) + (Number(protocol.cookMin) || 0);

  return (
    <View style={[styles.container, { backgroundColor: SHEET }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        <View style={[styles.heroWrap, { height: 320 + insets.top }]}>
          <RecipeImage recipe={protocol} style={styles.heroImage} iconSize={48} rounded={0} contentFit="cover" />
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.heroBack, { top: topPad }]}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color="#17181C" />
          </TouchableOpacity>
        </View>

        <View style={styles.sheet}>
          <View style={styles.pillRow}>
            <View style={styles.timePill}>
              <Feather name="clock" size={15} color={colors.deepPink} />
              <Text style={[styles.timePillText, { color: colors.deepPink }]}>{totalMin || protocol.prepMin} Min</Text>
            </View>
            {protocol.mealType ? (
              <View style={styles.softPill}>
                <Text style={styles.softPillText}>{String(protocol.mealType)}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{protocol.title}</Text>
          {protocol.blueprint ? <Text style={styles.blueprint}>{protocol.blueprint}</Text> : null}

          <Text style={styles.perServing}>Per serving</Text>
          <View style={styles.macroGrid}>
            <MacroCard label="Calories" value={`${Math.round(protocol.calories)}`} />
            <MacroCard label="Carbs" value={`${Math.round(protocol.carbs)}g`} />
            <MacroCard label="Protein" value={`${Math.round(protocol.protein)}g`} />
            <MacroCard label="Fat" value={`${Math.round(protocol.fat)}g`} />
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.cardHead} onPress={() => setIngredientsOpen((v) => !v)} activeOpacity={0.8}>
              <Feather name="feather" size={20} color="#17181C" />
              <Text style={styles.cardTitle}>Ingredients</Text>
              <Feather name={ingredientsOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#17181C" />
            </TouchableOpacity>
            {ingredientsOpen ? (
              <>
                <View style={styles.servingsRow}>
                  <Text style={styles.servingsLabel}>Servings</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: '#E4E7ED' }]}
                      disabled={servings <= 1}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setServingsOverride(Math.max(1, servings - 1));
                      }}
                      accessibilityLabel="Fewer servings"
                    >
                      <Feather name="minus" size={16} color={servings <= 1 ? '#B5B9C2' : '#17181C'} />
                    </TouchableOpacity>
                    <Text style={styles.servingsValue}>{servings}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: ACCENT }]}
                      disabled={servings >= 12}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setServingsOverride(Math.min(12, servings + 1));
                      }}
                      accessibilityLabel="More servings"
                    >
                      <Feather name="plus" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                {ingredients.map((ing, i) => {
                  const { name, amount } = splitIngredient(ing, scale);
                  return (
                    <View key={`${ing}-${i}`} style={styles.ingredientRow}>
                      <Text style={styles.ingredientName}>{name}</Text>
                      {amount ? <Text style={styles.ingredientAmount}>{amount}</Text> : null}
                    </View>
                  );
                })}
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Feather name="list" size={20} color="#17181C" />
              <Text style={styles.cardTitle}>Instructions</Text>
              <Text style={styles.cardMeta}>{steps.length} steps</Text>
            </View>
            {steps.map((step, i) => (
              <View key={`${i}-${step.slice(0, 12)}`} style={styles.stepRow}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.cardHead} onPress={() => setFactsOpen((v) => !v)} activeOpacity={0.8}>
              <Feather name="bar-chart-2" size={20} color="#17181C" />
              <Text style={styles.cardTitle}>Nutrition facts</Text>
              <Feather name={factsOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#17181C" />
            </TouchableOpacity>
            {factsOpen ? (
              <View style={{ marginTop: 14 }}>
                <View style={styles.calorieHero}>
                  <Text style={[styles.calorieNum, { color: colors.deepPink }]}>{protocol.calories}</Text>
                  <Text style={styles.calorieUnit}>calories per serving</Text>
                </View>

                <FactsHeading>Nutrients</FactsHeading>
                <View style={styles.dvHeader}>
                  <Text style={styles.dvHeaderText}>Amount</Text>
                  <Text style={[styles.dvHeaderText, { width: 44, textAlign: 'right' }]}>% DV*</Text>
                </View>
                <NutrientRow label="Fat" value={protocol.fat} unit="g" dvKey="fat_g" />
                <NutrientRow label="Cholesterol" value={protocol.cholesterol_mg} unit="mg" dvKey="cholesterol_mg" />
                <NutrientRow label="Sodium" value={protocol.sodium_mg} unit="mg" dvKey="sodium_mg" />
                <NutrientRow label="Carbohydrates" value={protocol.carbs} unit="g" dvKey="carbs_g" />
                <NutrientRow label="Sugars" value={protocol.sugar_g} unit="g" indent />
                <NutrientRow label="Added sugars" value={protocol.added_sugar_g} unit="g" indent />
                <NutrientRow label="Protein" value={protocol.protein} unit="g" />
                <NutrientRow label="Calcium" value={protocol.calcium_mg} unit="mg" dvKey="calcium_mg" />
                <NutrientRow label="Iron" value={protocol.iron_mg} unit="mg" dvKey="iron_mg" />
                <NutrientRow label="Potassium" value={protocol.potassium_mg} unit="mg" dvKey="potassium_mg" />
                <NutrientRow label="Vitamin A" value={protocol.vitamin_a_iu} unit="IU" />
                <NutrientRow label="Vitamin D" value={protocol.vitamin_d_mcg} unit="mcg" />

                <FactsHeading>Dietary information</FactsHeading>
                <View style={styles.dietWrap}>
                  <DietChip label="Vegetarian" value={protocol.dietary.vegetarian} />
                  <DietChip label="Vegan" value={protocol.dietary.vegan} />
                  <DietChip label="Gluten free" value={protocol.dietary.gluten_free} />
                  <DietChip label="Keto" value={protocol.dietary.keto} />
                  <DietChip label="Paleo" value={protocol.dietary.paleo} />
                  <DietChip label="Low FODMAP" value={protocol.dietary.low_fodmap} />
                  <DietChip label="Organic" value={protocol.dietary.organic} />
                  <DietChip label="Halal" value={protocol.dietary.halal} />
                  <DietChip label="Kosher" value={protocol.dietary.kosher} />
                  <DietChip label="Low carb" value={protocol.dietary.low_carb} />
                </View>

                <FactsHeading>Preparation</FactsHeading>
                <FactRow label="Method" value={protocol.method} />
                <View style={[styles.dietWrap, { marginTop: 10 }]}>
                  <DietChip label="Cooked" value={protocol.cooked} />
                  <DietChip label="Raw" value={protocol.raw} />
                  <DietChip label="Processed" value={protocol.processed} />
                </View>

                <FactsHeading>Allergens</FactsHeading>
                <FactRow
                  label="Contains"
                  value={protocol.allergens.contains.length ? protocol.allergens.contains.join(', ') : 'None'}
                  valueColor={protocol.allergens.contains.length ? colors.coral : '#2E8A6E'}
                />
                <FactRow
                  label="May contain"
                  value={protocol.allergens.may_contain.length ? protocol.allergens.may_contain.join(', ') : 'None'}
                />

                <FactsHeading>Insights</FactsHeading>
                <FactRow stacked label="Meal timing" value={protocol.allergens.meal_timing} />
                <FactRow stacked label="Satiety" value={protocol.allergens.satiety_score} />
                <FactRow stacked label="Digestibility" value={protocol.allergens.digestibility} />
                <FactRow stacked label="Nutrient density" value={protocol.allergens.nutrient_density} />
                <FactRow stacked label="Absorption tips" value={protocol.allergens.absorption_tips} />
                <FactRow stacked label="Impact" value={protocol.enhanced.impact} />
                {protocol.enhanced.inflammation ? <Text style={styles.insightNote}>{protocol.enhanced.inflammation}</Text> : null}
                {protocol.enhanced.sensitivity ? <Text style={styles.insightNote}>{protocol.enhanced.sensitivity}</Text> : null}

                <Text style={styles.dvFootnote}>
                  * % Daily Value shows how much a nutrient in one serving adds to a daily diet, based on 2,000 calories a day.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={styles.cookBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCurrentStep(0);
            setCookMode(true);
          }}
          activeOpacity={0.88}
        >
          <Feather name="play" size={18} color="#FFFFFF" />
          <Text style={styles.cookBtnText}>Start Kinetic Mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  missing: { color: MUTED, fontSize: 15, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#17181C',
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    marginHorizontal: 8,
  },
  stepCount: { color: MUTED, fontSize: 13, fontFamily: 'Manrope_400Regular' },
  heroWrap: { width: '100%', backgroundColor: '#111' },
  heroImage: { width: '100%', height: '100%' },
  heroBack: {
    position: 'absolute',
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -32,
    backgroundColor: SHEET,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FDEDF6',
  },
  timePillText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  softPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F4F0FE' },
  softPillText: { color: '#6A52B8', fontSize: 13, fontFamily: 'Manrope_700Bold', textTransform: 'capitalize' },
  title: {
    color: '#17181C',
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Manrope_800ExtraBold',
    marginTop: 16,
    letterSpacing: -0.4,
  },
  perServing: { color: MUTED, fontSize: 12, fontFamily: 'Manrope_700Bold', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 20 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  macroCard: {
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...CARD_SHADOW,
  },
  macroEmoji: { fontSize: 30 },
  macroLabel: { color: '#17181C', fontSize: 14, fontFamily: 'Manrope_500Medium' },
  macroValue: { color: '#17181C', fontSize: 24, fontFamily: 'Manrope_800ExtraBold', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 16,
    ...CARD_SHADOW,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { flex: 1, color: '#17181C', fontSize: 17, fontFamily: 'Manrope_800ExtraBold' },
  cardMeta: { color: MUTED, fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  servingsLabel: { color: MUTED, fontSize: 15, fontFamily: 'Manrope_500Medium' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  servingsValue: { color: '#17181C', fontSize: 16, fontFamily: 'Manrope_700Bold', minWidth: 14, textAlign: 'center' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E7ED',
  },
  ingredientName: { flex: 1, color: '#3A3D45', fontSize: 15, fontFamily: 'Manrope_500Medium', lineHeight: 21 },
  ingredientAmount: { color: '#17181C', fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  stepRow: { flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'flex-start' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FDEDF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: { color: '#D94A9A', fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  stepText: { flex: 1, color: '#17181C', fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 22 },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: { color: MUTED, fontSize: 9, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 },
  statValue: {
    color: '#17181C',
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  section: { paddingHorizontal: 18, marginTop: 22 },
  sectionTitle: {
    color: '#17181C',
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 12,
  },
  blueprint: {
    color: MUTED,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 21,
    marginTop: 8,
  },
  kineticRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  kineticNum: {
    width: 22,
    color: ACCENT,
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  kineticText: { flex: 1, color: '#17181C', fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21 },
  resourceLine: {
    color: '#17181C',
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 24,
    marginBottom: 2,
  },
  calorieHero: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  calorieNum: { fontSize: 40, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -1 },
  calorieUnit: { color: MUTED, fontSize: 15, fontFamily: 'Manrope_500Medium' },
  factsHeading: {
    color: '#17181C',
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  dvHeader: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 2 },
  dvHeaderText: { color: MUTED, fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  nutrientRow: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E7ED' },
  nutrientTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nutrientLabel: { flex: 1, color: '#3A3D45', fontSize: 14, fontFamily: 'Manrope_500Medium' },
  nutrientLabelIndent: { paddingLeft: 14, color: MUTED, fontSize: 13 },
  nutrientValue: { color: '#17181C', fontSize: 14, fontFamily: 'Manrope_700Bold' },
  nutrientPct: { width: 44, textAlign: 'right', color: MUTED, fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  dvTrack: { height: 4, borderRadius: 999, backgroundColor: '#F1F2F5', marginTop: 7, overflow: 'hidden' },
  dvFill: { height: 4, borderRadius: 999, backgroundColor: '#F590C7' },
  dietWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dietChipYes: { backgroundColor: '#EAF8F3' },
  dietChipNo: { backgroundColor: '#F4F5F7' },
  dietChipText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E7ED',
  },
  factLabel: { width: 112, color: MUTED, fontSize: 14, fontFamily: 'Manrope_500Medium' },
  factValue: { flex: 1, color: '#17181C', fontSize: 14, fontFamily: 'Manrope_600SemiBold', lineHeight: 20, textAlign: 'right' },
  factStacked: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E7ED' },
  factStackedLabel: { color: MUTED, fontSize: 12, fontFamily: 'Manrope_700Bold', letterSpacing: 0.3, marginBottom: 3 },
  factStackedValue: { color: '#17181C', fontSize: 14, fontFamily: 'Manrope_500Medium', lineHeight: 21 },
  insightNote: { color: '#3A3D45', fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21, marginTop: 10 },
  dvFootnote: { color: MUTED, fontSize: 11, fontFamily: 'Manrope_400Regular', lineHeight: 16, marginTop: 18 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'rgba(250,250,252,0.96)',
  },
  cookBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cookBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  cookCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 22 },
  stepNumCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: ACCENT,
    backgroundColor: 'rgba(242,107,181,0.12)',
  },
  stepNumBig: { color: ACCENT, fontSize: 36, fontFamily: 'Manrope_800ExtraBold' },
  cookStepText: {
    color: '#17181C',
    fontSize: 20,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
    lineHeight: 30,
  },
  cookControls: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 12 },
  cookNavBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cookNextBtn: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cookNextText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
