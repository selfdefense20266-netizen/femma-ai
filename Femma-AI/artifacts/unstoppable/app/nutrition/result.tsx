import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Share } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { getLastMealScan, getLastMealScanPhotoUri } from '@/lib/mealScan';
import { applyScanVerdict } from '@/lib/nutritionPlan';

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

type Palette = ReturnType<typeof useColors>;

const reportTitle = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

function formatAmount(value: number, unit: string) {
  const rounded = unit === 'g' || unit === 'mg' || unit === 'mcg' || unit === 'IU'
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
  return (
    <View style={[styles.pairRow, indent && { paddingLeft: 10 }]}>
      <Text style={[styles.pairLabel, { color: colors.mutedForeground }]}>{label}:</Text>
      <Text style={[styles.pairValue, { color: colors.foreground }]}>
        {formatAmount(amount, unit)}
        {pct !== null ? <Text style={[styles.pairPct, { color: colors.mutedForeground }]}>  {pct}%*</Text> : null}
      </Text>
    </View>
  );
}

function DietaryRow({ label, value, colors }: { label: string; value: boolean | undefined; colors: Palette }) {
  const yes = value === true;
  return (
    <View style={styles.pairRow}>
      <Text style={[styles.pairLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.pairValue, { color: yes ? colors.foreground : colors.mutedForeground, marginLeft: 'auto' }]}>
        {yes ? 'Yes' : 'No'}
      </Text>
    </View>
  );
}

function SectionTitle({ children, color }: { children: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color, fontFamily: reportTitle }]}>{children}</Text>;
}

function InsightLine({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value?: string;
  colors: Palette;
  accent?: string;
}) {
  if (!value) return null;
  return (
    <Text style={[styles.insightLine, { color: colors.foreground }]}>
      <Text style={{ color: accent || colors.foreground, fontFamily: 'Manrope_700Bold' }}>{label}: </Text>
      {value}
    </Text>
  );
}

export default function NutritionResultScreen() {
  const colors = useColors();
  const { completeMission, profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [serving, setServing] = useState(1);

  const scan = getLastMealScan() ? applyScanVerdict(getLastMealScan()!, profile) : null;
  const photoUri = getLastMealScanPhotoUri();

  const ingredients = scan?.ingredients?.length
    ? scan.ingredients
    : (scan?.tags || []).map((tag) => ({ name: tag, concern: false, detail: '' }));

  const alternatives = scan?.alternatives || [];
  const score = Number(scan?.score) || 0;
  const heading = colors.deepPink;
  const calories = Math.round((Number(scan?.calories) || 0) * serving);

  if (!scan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Scan Result</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ padding: 22, gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Manrope_600SemiBold' }}>No scan yet</Text>
          <TouchableOpacity
            style={{ height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.charcoal }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{scan.name}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 24 }}>
        {photoUri ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(80).duration(450)} style={[styles.reportCard, { backgroundColor: '#FFFFFF' }]}>
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

          <SectionTitle color={heading}>Nutrition & Insights</SectionTitle>
          <View style={styles.calorieHero}>
            <Text style={[styles.calorieNum, { color: heading, fontFamily: reportTitle }]}>{calories}</Text>
            <Text style={[styles.calorieUnit, { color: colors.mutedForeground, fontFamily: reportTitle }]}>calories</Text>
          </View>
          <View style={[styles.hairline, { backgroundColor: colors.border }]} />

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <NutrientRow label="Fat" value={scan.fat_g} serving={serving} unit="g" dvKey="fat_g" colors={colors} />
              <NutrientRow label="Cholesterol" value={scan.cholesterol_mg} serving={serving} unit="mg" dvKey="cholesterol_mg" colors={colors} />
              <NutrientRow label="Sodium" value={scan.sodium_mg} serving={serving} unit="mg" dvKey="sodium_mg" colors={colors} />
              <NutrientRow label="Carbohydrates" value={scan.carbs_g} serving={serving} unit="g" dvKey="carbs_g" colors={colors} />
              <NutrientRow label="Sugars" value={scan.sugar_g} serving={serving} unit="g" colors={colors} />
              <NutrientRow label="Added Sugars" value={scan.added_sugar_g} serving={serving} unit="g" colors={colors} indent />
            </View>
            <View style={styles.col}>
              <NutrientRow label="Protein" value={scan.protein_g} serving={serving} unit="g" dvKey="protein_g" colors={colors} />
              <NutrientRow label="Fiber" value={scan.fiber_g} serving={serving} unit="g" dvKey="fiber_g" colors={colors} />
              <NutrientRow label="Calcium" value={scan.calcium_mg} serving={serving} unit="mg" dvKey="calcium_mg" colors={colors} />
              <NutrientRow label="Iron" value={scan.iron_mg} serving={serving} unit="mg" dvKey="iron_mg" colors={colors} />
              <NutrientRow label="Potassium" value={scan.potassium_mg} serving={serving} unit="mg" dvKey="potassium_mg" colors={colors} />
              <NutrientRow label="Vitamin A" value={scan.vitamin_a_iu ?? scan.vitamin_a_mcg} serving={serving} unit={scan.vitamin_a_iu != null ? 'IU' : 'mcg'} colors={colors} />
              <NutrientRow label="Vitamin D" value={scan.vitamin_d_mcg} serving={serving} unit="mcg" colors={colors} />
            </View>
          </View>

          <>
            <View style={[styles.hairline, { backgroundColor: colors.border, marginTop: 18 }]} />
            <SectionTitle color={heading}>Dietary Information</SectionTitle>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <DietaryRow label="Vegetarian" value={scan.dietary?.vegetarian} colors={colors} />
                <DietaryRow label="Gluten Free" value={scan.dietary?.gluten_free} colors={colors} />
                <DietaryRow label="Paleo" value={scan.dietary?.paleo} colors={colors} />
                <DietaryRow label="Organic" value={scan.dietary?.organic} colors={colors} />
                <DietaryRow label="Kosher" value={scan.dietary?.kosher} colors={colors} />
              </View>
              <View style={styles.col}>
                <DietaryRow label="Vegan" value={scan.dietary?.vegan} colors={colors} />
                <DietaryRow label="Keto" value={scan.dietary?.keto} colors={colors} />
                <DietaryRow label="Low Fodmap" value={scan.dietary?.low_fodmap} colors={colors} />
                <DietaryRow label="Halal" value={scan.dietary?.halal} colors={colors} />
                <DietaryRow label="Low Carb" value={scan.dietary?.low_carb} colors={colors} />
              </View>
            </View>
          </>

          <>
            <View style={[styles.hairline, { backgroundColor: colors.border, marginTop: 18 }]} />
            <SectionTitle color={heading}>Preparation</SectionTitle>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <View style={styles.pairRow}>
                  <Text style={[styles.pairLabel, { color: colors.mutedForeground }]}>Method:</Text>
                  <Text style={[styles.pairValue, { color: colors.foreground }]}>
                    {scan.preparation?.method || '—'}
                  </Text>
                </View>
                <DietaryRow label="Cooked" value={scan.preparation?.cooked} colors={colors} />
              </View>
              <View style={styles.col}>
                <DietaryRow label="Processed" value={scan.preparation?.processed} colors={colors} />
                <DietaryRow label="Raw" value={scan.preparation?.raw} colors={colors} />
              </View>
            </View>
            <Text style={[styles.ingredientsText, { color: colors.mutedForeground }]}>
              <Text style={{ color: colors.foreground, fontFamily: 'Manrope_700Bold' }}>Ingredients: </Text>
              {scan.preparation?.ingredients_text ||
                (ingredients.length ? ingredients.map((ing) => ing.name).join(', ') : 'Not detected')}
            </Text>
          </>

          <>
            <View style={[styles.hairline, { backgroundColor: colors.border, marginTop: 18 }]} />
            <SectionTitle color={heading}>Allergen Nutrition Insights</SectionTitle>
            <View style={{ gap: 10 }}>
              <View style={styles.pairRow}>
                <Text style={[styles.pairLabelStrong, { color: colors.foreground }]}>Contains: </Text>
                <Text
                  style={[
                    styles.pairValue,
                    {
                      color: scan.allergens?.contains?.length ? colors.foreground : colors.coral,
                      flex: 1,
                    },
                  ]}
                >
                  {scan.allergens?.contains?.length ? scan.allergens.contains.join(', ') : 'None'}
                </Text>
              </View>
              <View style={styles.pairRow}>
                <Text style={[styles.pairLabelStrong, { color: colors.foreground }]}>May contain: </Text>
                <Text style={[styles.pairValue, { color: colors.mutedForeground, flex: 1 }]}>
                  {scan.allergens?.may_contain?.length ? scan.allergens.may_contain.join(', ') : 'None'}
                </Text>
              </View>
              <InsightLine label="Meal Timing" value={scan.allergens?.meal_timing} colors={colors} />
              <InsightLine label="Satiety Score" value={scan.allergens?.satiety_score} colors={colors} />
              <InsightLine label="Digestibility" value={scan.allergens?.digestibility} colors={colors} />
              <InsightLine label="Nutrient Density" value={scan.allergens?.nutrient_density} colors={colors} />
              <InsightLine label="Absorption Tips" value={scan.allergens?.absorption_tips} colors={colors} />
            </View>
          </>

          <>
            <View style={[styles.hairline, { backgroundColor: colors.border, marginTop: 18 }]} />
            <SectionTitle color={heading}>Enhanced Nutrition</SectionTitle>
            <View style={{ gap: 10 }}>
              <InsightLine
                label="Impact"
                value={scan.enhanced_insight?.impact || scan.fit_reason || scan.summary}
                colors={colors}
                accent={colors.coral}
              />
              {scan.enhanced_insight?.inflammation ? (
                <Text style={[styles.insightLine, { color: colors.foreground }]}>
                  {scan.enhanced_insight.inflammation}
                </Text>
              ) : null}
              {scan.enhanced_insight?.sensitivity ? (
                <Text style={[styles.insightLine, { color: colors.foreground }]}>
                  {scan.enhanced_insight.sensitivity}
                </Text>
              ) : null}
            </View>
          </>

          {alternatives.length > 0 ? (
            <>
              <View style={[styles.hairline, { backgroundColor: colors.border, marginTop: 18 }]} />
              <SectionTitle color={heading}>Healthier Alternatives</SectionTitle>
              {alternatives.map((alt) => (
                <Text key={alt.name} style={[styles.insightLine, { color: colors.mutedForeground }]}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Manrope_700Bold' }}>{alt.name}: </Text>
                  {alt.why} (score {alt.score})
                </Text>
              ))}
            </>
          ) : null}

          <View style={[styles.hairline, { backgroundColor: colors.border, marginTop: 20 }]} />
          <Text style={[styles.dvFootnote, { color: colors.mutedForeground }]}>
            * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000
            calories a day is used for general nutrition advice. Score {score}/100 for your plan.
          </Text>
        </Animated.View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.deepPink }]}
            onPress={shareResults}
            activeOpacity={0.88}
          >
            <Feather name="share-2" size={16} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>SHARE RESULTS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { borderColor: 'rgba(255,255,255,0.35)' }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              completeMission('nutrition');
              router.replace('/(tabs)');
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.saveBtnText}>Save to log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', maxWidth: '70%', textAlign: 'center' },
  photoWrap: { marginHorizontal: 16, marginBottom: 0, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111' },
  photo: { width: '100%', height: 200 },
  reportCard: {
    marginHorizontal: 0,
    marginTop: -8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
  },
  portionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  portionLabel: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
  portionControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  portionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionValue: { fontSize: 15, fontFamily: 'Manrope_700Bold', minWidth: 28, textAlign: 'center' },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  calorieHero: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  calorieNum: { fontSize: 44, fontWeight: '700', letterSpacing: -1 },
  calorieUnit: { fontSize: 18, fontWeight: '500' },
  hairline: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  twoCol: { flexDirection: 'row', gap: 18 },
  col: { flex: 1, gap: 9 },
  pairRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  pairLabel: { fontSize: 13, fontFamily: 'Manrope_500Medium', flexShrink: 0 },
  pairLabelStrong: { fontSize: 13, fontFamily: 'Manrope_700Bold', flexShrink: 0 },
  pairValue: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', flexShrink: 1 },
  pairPct: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  ingredientsText: { fontSize: 13, fontFamily: 'Manrope_400Regular', fontStyle: 'italic', lineHeight: 19, marginTop: 8 },
  insightLine: { fontSize: 13.5, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  tipLine: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19, marginBottom: 4 },
  dvFootnote: { fontSize: 11, fontFamily: 'Manrope_400Regular', fontStyle: 'italic', lineHeight: 16 },
  footerActions: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  shareBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.8 },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
