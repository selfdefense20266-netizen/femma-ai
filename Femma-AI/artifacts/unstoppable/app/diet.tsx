import React, { useCallback, useEffect, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { usePurchases } from '@/context/PurchaseContext';
import { type DietDay, type DietMeal } from '@/lib/dietPlan';
import { ensureAiDietPlan, type StoredDietPlan } from '@/lib/dietPlanAi';

function MealRow({
  label,
  meal,
  colors,
}: {
  label: string;
  meal: DietMeal;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.mealRow}>
      <View style={styles.mealLeft}>
        <Text style={[styles.mealLabel, { color: colors.primary }]}>{label}</Text>
        <Text style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
        <Text style={[styles.mealNotes, { color: colors.mutedForeground }]}>{meal.notes}</Text>
      </View>
      <Text style={[styles.mealCal, { color: colors.mutedForeground }]}>{meal.calories} kcal</Text>
    </View>
  );
}

function DayCard({
  day,
  selected,
  isToday,
  colors,
  onPress,
}: {
  day: DietDay;
  selected: boolean;
  isToday: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const total = day.breakfast.calories + day.lunch.calories + day.dinner.calories;
  return (
    <TouchableOpacity
      style={[
        styles.dayChip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: isToday ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.dayChipNum, { color: selected ? '#FFFFFF' : colors.foreground }]}>Day {day.day}</Text>
      <Text style={[styles.dayChipCal, { color: selected ? 'rgba(255,255,255,0.85)' : colors.mutedForeground }]}>
        {total} kcal
      </Text>
    </TouchableOpacity>
  );
}

export default function DietPlanScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const { user } = useAuth();
  const { hasAccess } = usePurchases();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const todayDay = Math.min(30, Math.max(1, Number(profile.journeyDay) || 1));
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [plan, setPlan] = useState<StoredDietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (hasAccess) return;
    router.replace({ pathname: '/plan-gate', params: { mode: 'resume' } } as never);
  }, [hasAccess]);

  const load = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await ensureAiDietPlan(profile, { email: user?.email, force });
        setPlan(next);
        setSelectedDay((prev) => Math.min(30, Math.max(1, prev || todayDay)));
      } catch (error) {
        Alert.alert('Diet plan', error instanceof Error ? error.message : 'Could not load diet plan.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile, user?.email, todayDay]
  );

  useEffect(() => {
    void load(false);
  }, [
    profile.heightCm,
    profile.weightKg,
    profile.goal,
    profile.fitnessLevel,
    profile.foodPreference,
    profile.isPregnant,
    user?.email,
  ]);

  const days = plan?.days || [];
  const active = days[selectedDay - 1] || days[0];
  const dayTotal =
    (active?.breakfast.calories || 0) + (active?.lunch.calories || 0) + (active?.dinner.calories || 0);

  const goalLabel = profile.goal || 'Your plan';
  const levelLabel = profile.fitnessLevel || 'Beginner';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>Diet plan</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {goalLabel} · {levelLabel}
            {plan?.bmi ? ` · BMI ${plan.bmi}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void load(true);
          }}
          disabled={loading || refreshing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.refreshBtn}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={18} color={colors.foreground} />
          )}
        </TouchableOpacity>
      </View>

      {loading && !plan ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingTitle, { color: colors.foreground }]}>AI is creating your diet plan…</Text>
          <Text style={[styles.loadingMeta, { color: colors.mutedForeground }]}>
            Using your height, weight, and {goalLabel.toLowerCase()} plan
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryTop}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Daily calorie target</Text>
              <View
                style={[
                  styles.sourceBadge,
                  { backgroundColor: plan?.source === 'ai' ? colors.primary + '22' : colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.sourceBadgeText,
                    { color: plan?.source === 'ai' ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {plan?.source === 'ai' ? 'AI plan' : 'Local plan'}
                </Text>
              </View>
            </View>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {plan?.calorieTarget || 0} kcal
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]}>
              Built from your height, weight, activity, and food preference
              {profile.heightCm && profile.weightKg
                ? ` · ${profile.heightCm} cm · ${profile.weightKg} kg`
                : ''}
            </Text>
            {profile.foodPreference ? (
              <View style={[styles.foodChip, { backgroundColor: colors.mint + '33', borderColor: colors.mint }]}>
                <Text style={[styles.foodChipText, { color: colors.foreground }]}>{profile.foodPreference}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your meals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
            {days.map((day) => (
              <DayCard
                key={day.day}
                day={day}
                selected={day.day === selectedDay}
                isToday={day.day === todayDay}
                colors={colors}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDay(day.day);
                }}
              />
            ))}
          </ScrollView>

          {active ? (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailTitle, { color: colors.foreground }]}>Day {active.day}</Text>
                {active.day === todayDay ? (
                  <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.todayBadgeText}>TODAY</Text>
                  </View>
                ) : null}
                <Text style={[styles.detailTotal, { color: colors.mutedForeground }]}>{dayTotal} kcal</Text>
              </View>
              <MealRow label="BREAKFAST" meal={active.breakfast} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <MealRow label="LUNCH" meal={active.lunch} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <MealRow label="DINNER" meal={active.dinner} colors={colors} />
            </View>
          ) : null}

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            AI builds this from OpenAI using your onboarding answers and saves it to your account. Tap refresh to
            regenerate.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4, width: 28, alignItems: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold' },
  subtitle: { fontSize: 13, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  loadingTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', textAlign: 'center', marginTop: 8 },
  loadingMeta: { fontSize: 13, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  sourceBadge: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  sourceBadgeText: { fontSize: 11, fontFamily: 'Manrope_700Bold' },
  summaryValue: { fontSize: 32, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5 },
  summaryMeta: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18, marginTop: 4 },
  foodChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  foodChipText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', marginTop: 4 },
  dayRow: { gap: 8, paddingVertical: 4 },
  dayChip: {
    width: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  dayChipNum: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  dayChipCal: { fontSize: 10, fontFamily: 'Manrope_500Medium' },
  detailCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  detailTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', flex: 1 },
  todayBadge: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  todayBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 },
  detailTotal: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  mealRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  mealLeft: { flex: 1, gap: 2 },
  mealLabel: { fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.6 },
  mealName: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  mealNotes: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
  mealCal: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  hint: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 18, marginTop: 4 },
});
