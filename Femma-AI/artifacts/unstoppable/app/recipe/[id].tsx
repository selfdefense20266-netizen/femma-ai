import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import RecipeImage from '@/components/RecipeImage';
import { getRecipe, hydrateGeneratedRecipes } from '@/data/recipes';
import { toProtocol, type RecipeProtocol } from '@/data/recipeProtocol';

const BG = '#FFFFFF';
const CARD = '#F5F5F8';
const MUTED = '#747985';
const ACCENT = '#F26BB5';
const reportTitle = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

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
    <View style={[styles.pairRow, indent && { paddingLeft: 10 }]}>
      <Text style={styles.pairLabel}>{label}:</Text>
      <Text style={styles.pairValue}>
        {formatAmount(Number(value), unit)}
        {pct !== null ? <Text style={styles.pairPct}>  {pct}%*</Text> : null}
      </Text>
    </View>
  );
}

function DietaryRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.pairRow}>
      <Text style={styles.pairLabel}>{label}</Text>
      <Text style={[styles.pairValue, { marginLeft: 'auto', color: value ? '#17181C' : MUTED }]}>
        {value ? 'Yes' : 'No'}
      </Text>
    </View>
  );
}

function InsightLine({ label, value, accent }: { label: string; value?: string; accent?: string }) {
  if (!value) return null;
  return (
    <Text style={styles.insightLine}>
      <Text style={{ color: accent || '#17181C', fontFamily: 'Manrope_700Bold' }}>{label}: </Text>
      {value}
    </Text>
  );
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

  useEffect(() => {
    let cancelled = false;
    void hydrateGeneratedRecipes().then(() => {
      if (cancelled) return;
      const found = getRecipe(recipeId);
      setProtocol(found ? toProtocol(found) : null);
      setReady(true);
      setCookMode(false);
      setCurrentStep(0);
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

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#17181C" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {protocol.title}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        <View style={styles.heroWrap}>
          <RecipeImage recipe={protocol} style={styles.heroImage} iconSize={40} rounded={18} contentFit="cover" />
        </View>

        <View style={styles.statRow}>
          <StatCard icon="clock" iconColor={ACCENT} label="PREP" value={`${protocol.prepMin} minutes`} />
          <StatCard icon="zap" iconColor="#FF6B6B" label="COOK" value={`${protocol.cookMin} minutes`} />
          <StatCard icon="activity" iconColor="#FF9F43" label="ENERGY" value={`${protocol.calories}`} />
          <StatCard icon="info" iconColor="#5B8DEF" label="NET CARBS" value={`${protocol.netCarbs}g`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blueprint</Text>
          <Text style={styles.blueprint}>"{protocol.blueprint}"</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kinetic Sequence</Text>
          {steps.map((step, i) => (
            <View key={`${i}-${step.slice(0, 12)}`} style={styles.kineticRow}>
              <Text style={styles.kineticNum}>{i + 1}</Text>
              <Text style={styles.kineticText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources ({ingredients.length} Units)</Text>
          {ingredients.map((ing, i) => (
            <Text key={`${ing}-${i}`} style={styles.resourceLine}>
              {ing}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Protocol Density Fact</Text>
          <Text style={[styles.reportHeading, { color: colors.deepPink, fontFamily: reportTitle }]}>
            Nutrition & Insights
          </Text>
          <View style={styles.calorieHero}>
            <Text style={[styles.calorieNum, { color: colors.deepPink, fontFamily: reportTitle }]}>
              {protocol.calories}
            </Text>
            <Text style={styles.calorieUnit}>calories</Text>
          </View>
          <View style={styles.hairline} />

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <NutrientRow label="Fat" value={protocol.fat} unit="g" dvKey="fat_g" />
              <NutrientRow label="Cholesterol" value={protocol.cholesterol_mg} unit="mg" dvKey="cholesterol_mg" />
              <NutrientRow label="Sodium" value={protocol.sodium_mg} unit="mg" dvKey="sodium_mg" />
              <NutrientRow label="Carbohydrates" value={protocol.carbs} unit="g" dvKey="carbs_g" />
              <NutrientRow label="Sugars" value={protocol.sugar_g} unit="g" />
              <NutrientRow label="Added Sugars" value={protocol.added_sugar_g} unit="g" indent />
            </View>
            <View style={styles.col}>
              <NutrientRow label="Calcium" value={protocol.calcium_mg} unit="mg" dvKey="calcium_mg" />
              <NutrientRow label="Iron" value={protocol.iron_mg} unit="mg" dvKey="iron_mg" />
              <NutrientRow label="Potassium" value={protocol.potassium_mg} unit="mg" dvKey="potassium_mg" />
              <NutrientRow label="Vitamin A" value={protocol.vitamin_a_iu} unit="IU" />
              <NutrientRow label="Vitamin D" value={protocol.vitamin_d_mcg} unit="mcg" />
            </View>
          </View>

          <View style={styles.hairline} />
          <Text style={[styles.reportHeading, { color: colors.deepPink, fontFamily: reportTitle }]}>
            Dietary Information
          </Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <DietaryRow label="Vegetarian" value={protocol.dietary.vegetarian} />
              <DietaryRow label="Gluten Free" value={protocol.dietary.gluten_free} />
              <DietaryRow label="Paleo" value={protocol.dietary.paleo} />
              <DietaryRow label="Organic" value={protocol.dietary.organic} />
              <DietaryRow label="Kosher" value={protocol.dietary.kosher} />
            </View>
            <View style={styles.col}>
              <DietaryRow label="Vegan" value={protocol.dietary.vegan} />
              <DietaryRow label="Keto" value={protocol.dietary.keto} />
              <DietaryRow label="Low Fodmap" value={protocol.dietary.low_fodmap} />
              <DietaryRow label="Halal" value={protocol.dietary.halal} />
              <DietaryRow label="Low Carb" value={protocol.dietary.low_carb} />
            </View>
          </View>

          <View style={styles.hairline} />
          <Text style={[styles.reportHeading, { color: colors.deepPink, fontFamily: reportTitle }]}>
            Preparation
          </Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <View style={styles.pairRow}>
                <Text style={styles.pairLabel}>Method:</Text>
                <Text style={styles.pairValue}>{protocol.method}</Text>
              </View>
              <DietaryRow label="Cooked" value={protocol.cooked} />
            </View>
            <View style={styles.col}>
              <DietaryRow label="Processed" value={protocol.processed} />
              <DietaryRow label="Raw" value={protocol.raw} />
            </View>
          </View>
          <Text style={styles.ingredientsText}>
            <Text style={{ color: '#17181C', fontFamily: 'Manrope_700Bold' }}>Ingredients: </Text>
            {ingredients.join(', ')}
          </Text>

          <View style={styles.hairline} />
          <Text style={[styles.reportHeading, { color: colors.deepPink, fontFamily: reportTitle }]}>
            Allergen Nutrition Insights
          </Text>
          <View style={{ gap: 10 }}>
            <View style={styles.pairRow}>
              <Text style={styles.pairLabelStrong}>Contains: </Text>
              <Text style={[styles.pairValue, { flex: 1, color: protocol.allergens.contains.length ? '#17181C' : colors.coral }]}>
                {protocol.allergens.contains.length ? protocol.allergens.contains.join(', ') : 'None'}
              </Text>
            </View>
            <View style={styles.pairRow}>
              <Text style={styles.pairLabelStrong}>May contain: </Text>
              <Text style={[styles.pairValue, { flex: 1, color: MUTED }]}>
                {protocol.allergens.may_contain.length ? protocol.allergens.may_contain.join(', ') : 'None'}
              </Text>
            </View>
            <InsightLine label="Meal Timing" value={protocol.allergens.meal_timing} />
            <InsightLine label="Satiety Score" value={protocol.allergens.satiety_score} />
            <InsightLine label="Digestibility" value={protocol.allergens.digestibility} />
            <InsightLine label="Nutrient Density" value={protocol.allergens.nutrient_density} />
            <InsightLine label="Absorption Tips" value={protocol.allergens.absorption_tips} />
          </View>

          <View style={styles.hairline} />
          <Text style={[styles.reportHeading, { color: colors.deepPink, fontFamily: reportTitle }]}>
            Enhanced Nutrition
          </Text>
          <View style={{ gap: 10 }}>
            <InsightLine label="Impact" value={protocol.enhanced.impact} accent={colors.coral} />
            <Text style={styles.insightLine}>{protocol.enhanced.inflammation}</Text>
            <Text style={styles.insightLine}>{protocol.enhanced.sensitivity}</Text>
          </View>

          <View style={styles.hairline} />
          <Text style={styles.dvFootnote}>
            * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000
            calories a day is used for general nutrition advice.
          </Text>
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
  heroWrap: {
    marginHorizontal: 16,
    height: 210,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  heroImage: { width: '100%', height: '100%' },
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
    fontStyle: 'italic',
    lineHeight: 22,
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
  reportHeading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  calorieHero: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  calorieNum: { fontSize: 44, fontWeight: '700', letterSpacing: -1 },
  calorieUnit: { color: MUTED, fontSize: 18, fontFamily: 'Manrope_500Medium' },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: '#E4E7ED', marginVertical: 16 },
  twoCol: { flexDirection: 'row', gap: 16 },
  col: { flex: 1, gap: 9 },
  pairRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  pairLabel: { color: MUTED, fontSize: 13, fontFamily: 'Manrope_500Medium', flexShrink: 0 },
  pairLabelStrong: { color: '#17181C', fontSize: 13, fontFamily: 'Manrope_700Bold', flexShrink: 0 },
  pairValue: { color: '#17181C', fontSize: 13, fontFamily: 'Manrope_600SemiBold', flexShrink: 1 },
  pairPct: { color: MUTED, fontSize: 12, fontFamily: 'Manrope_400Regular' },
  ingredientsText: {
    color: MUTED,
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    fontStyle: 'italic',
    lineHeight: 19,
    marginTop: 10,
  },
  insightLine: { color: '#17181C', fontSize: 13.5, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  dvFootnote: { color: MUTED, fontSize: 11, fontFamily: 'Manrope_400Regular', fontStyle: 'italic', lineHeight: 16 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  cookBtn: {
    height: 54,
    borderRadius: 16,
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
    borderRadius: 28,
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cookNextBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cookNextText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
