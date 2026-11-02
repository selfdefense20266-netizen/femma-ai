import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { getLastMealScan, getLastMealScanPhotoUri } from '@/lib/mealScan';
import { applyScanVerdict } from '@/lib/nutritionPlan';
import NutritionIcon from '@/components/NutritionIcon';

const DAILY_VALUES: Record<string, number> = {
  protein_g: 50,
  carbs_g: 275,
  fat_g: 78,
  fiber_g: 28,
  cholesterol_mg: 300,
  sodium_mg: 2300,
  calcium_mg: 1300,
  iron_mg: 18,
  potassium_mg: 4700,
};

const MACRO_GOALS = {
  carbs: 200,
  fat: 60,
  protein: 120,
};

type Palette = ReturnType<typeof useColors>;

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
  serving,
  unit,
  dvKey,
  colors,
  indent,
}: {
  label: string;
  value: number | undefined;
  serving: number;
  unit: string;
  dvKey?: string;
  colors: Palette;
  indent?: boolean;
}) {
  if (value === undefined || value === null) return null;
  const amount = Number(value) * serving;
  const dv = dvKey ? DAILY_VALUES[dvKey] : undefined;
  const pct = dv ? Math.round((amount / dv) * 100) : null;
  const barPct = pct != null ? Math.min(100, pct) : 0;
  const showIcon = /^(fat|protein|carbohydrates|carbs)$/i.test(label);
  return (
    <View style={[styles.nutrientRow, indent && { paddingLeft: 12 }]}>
      <View style={styles.nutrientTop}>
        <View style={styles.nutrientLabelRow}>
          {showIcon ? <NutritionIcon label={label === 'Carbohydrates' ? 'Carbs' : label} size={22} /> : null}
          <Text style={[styles.nutrientLabel, { color: colors.mutedForeground }]}>{label}</Text>
        </View>
        <View style={styles.nutrientRight}>
          <Text style={[styles.nutrientAmount, { color: colors.foreground }]}>
            {formatAmount(amount, unit)}
          </Text>
          {pct !== null ? (
            <View style={[styles.dvBadge, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.dvBadgeText, { color: colors.primary }]}>{pct}%*</Text>
            </View>
          ) : null}
        </View>
      </View>
      {pct !== null ? (
        <View style={[styles.nutrientTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.nutrientFill,
              { width: `${barPct}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function DietaryChip({
  label,
  value,
  colors,
}: {
  label: string;
  value: boolean | undefined;
  colors: Palette;
}) {
  const yes = value === true;
  return (
    <View
      style={[
        styles.dietChip,
        {
          backgroundColor: yes ? colors.primary + '14' : colors.muted,
          borderColor: yes ? colors.primary + '40' : colors.border,
        },
      ]}
    >
      <Feather
        name={yes ? 'check' : 'minus'}
        size={12}
        color={yes ? colors.primary : colors.mutedForeground}
      />
      <Text
        style={[
          styles.dietChipText,
          { color: yes ? colors.primary : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  colors,
  children,
}: {
  title: string;
  colors: Palette;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function InsightCard({
  label,
  value,
  colors,
}: {
  label: string;
  value?: string;
  colors: Palette;
}) {
  if (!value) return null;
  return (
    <View style={[styles.insightCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
      <Text style={[styles.insightLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.insightLine, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function GlassCircle({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
      style={styles.glassCircle}
    >
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.glassCircleInner}>{children}</View>
    </TouchableOpacity>
  );
}

function MacroCard({
  label,
  value,
  goal,
  unit,
  color,
  colors,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  colors: Palette;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <View style={[styles.macroCard, { backgroundColor: colors.muted }]}>
      <View style={styles.macroCardHead}>
        <NutritionIcon label={label} size={28} />
        <Text style={[styles.macroCardLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: color + '28' }]}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.macroCardValue, { color: colors.foreground }]}>
        {Math.round(value * 10) / 10}/{goal}
        {unit}
      </Text>
    </View>
  );
}

export default function NutritionResultScreen() {
  const colors = useColors();
  const { completeMission, profile } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [serving, setServing] = useState(1);
  const [showDetails, setShowDetails] = useState(true);

  const scan = getLastMealScan() ? applyScanVerdict(getLastMealScan()!, profile) : null;
  const photoUri = getLastMealScanPhotoUri();

  const ingredients = scan?.ingredients?.length
    ? scan.ingredients
    : (scan?.tags || []).map((tag) => ({ name: tag, concern: false, detail: '' }));

  const alternatives = scan?.alternatives || [];
  const score = Number(scan?.score) || 0;
  const calories = Math.round((Number(scan?.calories) || 0) * serving);

  const carbs = (Number(scan?.carbs_g) || 0) * serving;
  const fat = (Number(scan?.fat_g) || 0) * serving;
  const protein = (Number(scan?.protein_g) || 0) * serving;

  const scoreLeft = useMemo(() => {
    const trackWidth = Math.max(120, width - 88);
    return Math.max(0, Math.min(trackWidth - 14, (score / 100) * trackWidth - 7));
  }, [score, width]);

  if (!scan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyHeader, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Food Details</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ padding: 22, gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Manrope_600SemiBold' }}>
            No scan yet
          </Text>
          <TouchableOpacity
            style={{
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.replace('/scan-food' as never)}
          >
            <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>Open Food Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const shareResults = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: `${scan.name} · ${calories} calories on Fema AI Meal Scanner.`,
    }).catch(() => undefined);
  };

  const saveMeal = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeMission('nutrition');
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.charcoal }]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.bgPhoto} blurRadius={18} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[colors.softLavender, colors.lavender, colors.primary]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.bgDim} />

      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <GlassCircle onPress={() => router.back()} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={18} color={colors.charcoal} />
        </GlassCircle>
        <Text style={styles.topTitle}>Food Details</Text>
        <GlassCircle onPress={() => router.back()} accessibilityLabel="Close">
          <Feather name="x" size={18} color={colors.charcoal} />
        </GlassCircle>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 96 }}
      >
        <Animated.View entering={FadeInDown.duration(420)} style={styles.heroWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.heroPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPhoto, { backgroundColor: '#FFFFFF' }]}>
              <NutritionIcon name="bowlLight" size={96} />
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(450)}
          style={[styles.sheet, { backgroundColor: 'rgba(255,255,255,0.94)' }]}
        >
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.sheetInner}>
            <Text style={[styles.mealName, { color: colors.foreground }]}>{scan.name}</Text>

            <View style={[styles.calorieBar, { backgroundColor: colors.muted }]}>
              <Text style={[styles.calorieBarText, { color: colors.foreground }]}>
                Total {calories} kcal
              </Text>
              <View style={[styles.flameBtn, { backgroundColor: '#FFFFFF' }]}>
                <NutritionIcon name="calories" size={32} />
              </View>
            </View>

            <View style={styles.macroRow}>
              <MacroCard
                label="Carbs"
                value={carbs}
                goal={MACRO_GOALS.carbs}
                unit="g"
                color={colors.warmYellow}
                colors={colors}
              />
              <MacroCard
                label="Fat"
                value={fat}
                goal={MACRO_GOALS.fat}
                unit="g"
                color={colors.skyBlue}
                colors={colors}
              />
              <MacroCard
                label="Protein"
                value={protein}
                goal={MACRO_GOALS.protein}
                unit="g"
                color={colors.mint}
                colors={colors}
              />
            </View>

            <View style={styles.scoreBlock}>
              <View style={styles.scoreHead}>
                <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Healthy Score</Text>
                <Text style={[styles.scoreValue, { color: colors.primary }]}>{score}/100</Text>
              </View>
              <View style={styles.scoreTrack}>
                <LinearGradient
                  colors={[colors.coral, colors.skyBlue, colors.mint]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scoreGradient}
                />
                <View style={[styles.scoreKnob, { left: scoreLeft, borderColor: colors.primary }]} />
              </View>
              {scan.verdict_label ? (
                <Text style={[styles.verdictText, { color: colors.mutedForeground }]}>
                  {scan.verdict_label}
                  {scan.calories_note ? ` · ${scan.calories_note}` : ''}
                </Text>
              ) : null}
            </View>

            <View style={styles.portionRow}>
              <Text style={[styles.portionLabel, { color: colors.mutedForeground }]}>Portion</Text>
              <View style={styles.portionControls}>
                <TouchableOpacity
                  style={[styles.portionBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setServing((s) => Math.max(0.5, s - 0.5));
                  }}
                >
                  <Feather name="minus" size={14} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.portionValue, { color: colors.foreground }]}>{serving}x</Text>
                <TouchableOpacity
                  style={[styles.portionBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setServing((s) => s + 0.5);
                  }}
                >
                  <Feather name="plus" size={14} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setShowDetails((v) => !v);
              }}
              style={styles.detailsToggle}
              activeOpacity={0.8}
            >
              <Text style={[styles.detailsToggleText, { color: colors.primary }]}>
                {showDetails ? 'Hide full nutrition' : 'Show full nutrition & insights'}
              </Text>
              <Feather
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>

            {showDetails ? (
              <View style={styles.detailsBlock}>
                <SectionCard title="Nutrition & Insights" colors={colors}>
                  <View style={styles.nutrientList}>
                    <NutrientRow label="Fat" value={scan.fat_g} serving={serving} unit="g" dvKey="fat_g" colors={colors} />
                    <NutrientRow label="Cholesterol" value={scan.cholesterol_mg} serving={serving} unit="mg" dvKey="cholesterol_mg" colors={colors} />
                    <NutrientRow label="Sodium" value={scan.sodium_mg} serving={serving} unit="mg" dvKey="sodium_mg" colors={colors} />
                    <NutrientRow label="Carbohydrates" value={scan.carbs_g} serving={serving} unit="g" dvKey="carbs_g" colors={colors} />
                    <NutrientRow label="Sugars" value={scan.sugar_g} serving={serving} unit="g" colors={colors} />
                    <NutrientRow label="Added Sugars" value={scan.added_sugar_g} serving={serving} unit="g" colors={colors} indent />
                    <NutrientRow label="Protein" value={scan.protein_g} serving={serving} unit="g" dvKey="protein_g" colors={colors} />
                    <NutrientRow label="Fiber" value={scan.fiber_g} serving={serving} unit="g" dvKey="fiber_g" colors={colors} />
                    <NutrientRow label="Calcium" value={scan.calcium_mg} serving={serving} unit="mg" dvKey="calcium_mg" colors={colors} />
                    <NutrientRow label="Iron" value={scan.iron_mg} serving={serving} unit="mg" dvKey="iron_mg" colors={colors} />
                    <NutrientRow label="Potassium" value={scan.potassium_mg} serving={serving} unit="mg" dvKey="potassium_mg" colors={colors} />
                    <NutrientRow label="Vitamin A" value={scan.vitamin_a_iu ?? scan.vitamin_a_mcg} serving={serving} unit={scan.vitamin_a_iu != null ? 'IU' : 'mcg'} colors={colors} />
                    <NutrientRow label="Vitamin D" value={scan.vitamin_d_mcg} serving={serving} unit="mcg" colors={colors} />
                  </View>
                </SectionCard>

                <SectionCard title="Dietary Information" colors={colors}>
                  <View style={styles.dietWrap}>
                    <DietaryChip label="Vegetarian" value={scan.dietary?.vegetarian} colors={colors} />
                    <DietaryChip label="Vegan" value={scan.dietary?.vegan} colors={colors} />
                    <DietaryChip label="Gluten Free" value={scan.dietary?.gluten_free} colors={colors} />
                    <DietaryChip label="Keto" value={scan.dietary?.keto} colors={colors} />
                    <DietaryChip label="Paleo" value={scan.dietary?.paleo} colors={colors} />
                    <DietaryChip label="Organic" value={scan.dietary?.organic} colors={colors} />
                    <DietaryChip label="Kosher" value={scan.dietary?.kosher} colors={colors} />
                    <DietaryChip label="Halal" value={scan.dietary?.halal} colors={colors} />
                    <DietaryChip label="Low Carb" value={scan.dietary?.low_carb} colors={colors} />
                    <DietaryChip label="Low Fodmap" value={scan.dietary?.low_fodmap} colors={colors} />
                  </View>
                </SectionCard>

                <SectionCard title="Preparation" colors={colors}>
                  <View style={[styles.methodRow, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <Text style={[styles.methodLabel, { color: colors.mutedForeground }]}>Method</Text>
                    <Text style={[styles.methodValue, { color: colors.foreground }]}>
                      {scan.preparation?.method || '—'}
                    </Text>
                  </View>
                  <View style={styles.dietWrap}>
                    <DietaryChip label="Cooked" value={scan.preparation?.cooked} colors={colors} />
                    <DietaryChip label="Processed" value={scan.preparation?.processed} colors={colors} />
                    <DietaryChip label="Raw" value={scan.preparation?.raw} colors={colors} />
                  </View>
                  <View style={[styles.ingredientsBox, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <Text style={[styles.ingredientsLabel, { color: colors.primary }]}>Ingredients</Text>
                    <Text style={[styles.ingredientsText, { color: colors.foreground }]}>
                      {scan.preparation?.ingredients_text ||
                        (ingredients.length
                          ? ingredients.map((ing) => ing.name).join(', ')
                          : 'Not detected')}
                    </Text>
                  </View>
                </SectionCard>

                <SectionCard title="Allergen & Insights" colors={colors}>
                  <View style={[styles.allergenRow, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <Text style={[styles.allergenLabel, { color: colors.mutedForeground }]}>Contains</Text>
                    <Text
                      style={[
                        styles.allergenValue,
                        { color: scan.allergens?.contains?.length ? colors.foreground : colors.coral },
                      ]}
                    >
                      {scan.allergens?.contains?.length ? scan.allergens.contains.join(', ') : 'None'}
                    </Text>
                  </View>
                  <View style={[styles.allergenRow, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <Text style={[styles.allergenLabel, { color: colors.mutedForeground }]}>May contain</Text>
                    <Text style={[styles.allergenValue, { color: colors.foreground }]}>
                      {scan.allergens?.may_contain?.length
                        ? scan.allergens.may_contain.join(', ')
                        : 'None'}
                    </Text>
                  </View>
                  <InsightCard label="Meal Timing" value={scan.allergens?.meal_timing} colors={colors} />
                  <InsightCard label="Satiety Score" value={scan.allergens?.satiety_score} colors={colors} />
                  <InsightCard label="Digestibility" value={scan.allergens?.digestibility} colors={colors} />
                  <InsightCard label="Nutrient Density" value={scan.allergens?.nutrient_density} colors={colors} />
                  <InsightCard label="Absorption Tips" value={scan.allergens?.absorption_tips} colors={colors} />
                </SectionCard>

                <SectionCard title="Enhanced Nutrition" colors={colors}>
                  <InsightCard
                    label="Impact"
                    value={scan.enhanced_insight?.impact || scan.fit_reason || scan.summary}
                    colors={colors}
                  />
                  <InsightCard label="Inflammation" value={scan.enhanced_insight?.inflammation} colors={colors} />
                  <InsightCard label="Sensitivity" value={scan.enhanced_insight?.sensitivity} colors={colors} />
                </SectionCard>

                {alternatives.length > 0 ? (
                  <SectionCard title="Healthier Alternatives" colors={colors}>
                    {alternatives.map((alt) => (
                      <View
                        key={alt.name}
                        style={[styles.altCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}
                      >
                        <View style={styles.altHead}>
                          <Text style={[styles.altName, { color: colors.foreground }]}>{alt.name}</Text>
                          <View style={[styles.altScore, { backgroundColor: colors.primary + '14' }]}>
                            <Text style={[styles.altScoreText, { color: colors.primary }]}>{alt.score}</Text>
                          </View>
                        </View>
                        <Text style={[styles.altWhy, { color: colors.mutedForeground }]}>{alt.why}</Text>
                      </View>
                    ))}
                  </SectionCard>
                ) : null}

                <Text style={[styles.dvFootnote, { color: colors.mutedForeground }]}>
                  * % Daily Value (DV) based on a 2,000 calorie diet. Score {score}/100 for your plan.
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 10 }]}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!showDetails) {
                setShowDetails(true);
                return;
              }
              shareResults();
            }}
            activeOpacity={0.88}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              {showDetails ? 'Share Results' : 'Update Details'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={saveMeal}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Add Meal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,24,28,0.28)' },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  glassCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  glassCircleInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -36,
    zIndex: 2,
  },
  heroPhoto: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  sheet: {
    marginTop: 16,
    marginHorizontal: 12,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  sheetInner: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 22,
    gap: 16,
  },
  mealName: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  calorieBar: {
    height: 48,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieBarText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  flameBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  macroCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroCardLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  macroTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 2 },
  macroCardValue: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  scoreBlock: { gap: 10 },
  scoreHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  scoreValue: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  scoreTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'visible',
    justifyContent: 'center',
  },
  scoreGradient: { height: 10, borderRadius: 999 },
  scoreKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    top: -3,
  },
  verdictText: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portionLabel: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
  portionControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  portionBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionValue: { fontSize: 15, fontFamily: 'Manrope_700Bold', minWidth: 28, textAlign: 'center' },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  detailsToggleText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  detailsBlock: { gap: 12, paddingTop: 4 },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.2,
  },
  nutrientList: { gap: 10 },
  nutrientRow: { gap: 6 },
  nutrientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nutrientLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  nutrientLabel: { fontSize: 13, fontFamily: 'Manrope_500Medium', flexShrink: 1 },
  nutrientRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nutrientAmount: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  dvBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dvBadgeText: { fontSize: 11, fontFamily: 'Manrope_700Bold' },
  nutrientTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  nutrientFill: { height: '100%', borderRadius: 2 },
  dietWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  dietChipText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  methodLabel: { fontSize: 12, fontFamily: 'Manrope_500Medium' },
  methodValue: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  ingredientsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  ingredientsLabel: { fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.3 },
  ingredientsText: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  allergenRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  allergenLabel: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  allergenValue: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', lineHeight: 18 },
  insightCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  insightLabel: { fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.2 },
  insightLine: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  altCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  altHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  altName: { fontSize: 14, fontFamily: 'Manrope_700Bold', flex: 1 },
  altScore: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
  },
  altScoreText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  altWhy: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 17 },
  dvFootnote: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 16,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_700Bold' },
});
