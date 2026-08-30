import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, CYCLE_PHASE_INFO, LEVEL_COLORS } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/hooks/useCatalog';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import MissionCard from '@/components/MissionCard';
import { formatStreakLabel, formatStreakValue, getTodayMotivational } from '@/lib/todayCopy';
import { resolveMissionHref } from '@/lib/missionHref';
import { sortTodayMissions } from '@/lib/buildCoursePlan';
import { FOOD_MEALS, FOOD_RECIPES } from '@/lib/exerciseRoadmapData';
import { planTotalDays } from '@/lib/trainingPlan';
import BellButton from '@/components/BellButton';

type Palette = ReturnType<typeof useColors>;

function polishMission<T extends { slot?: string; category: string; label?: string; cue?: string; title: string }>(
  mission: T,
  foodPreference?: string,
  journeyDay = 1
): T {
  const diet = foodPreference && foodPreference !== 'Eat everything' ? foodPreference : '';
  const key =
    Object.keys(FOOD_RECIPES).find((item) => item.toLowerCase() === (foodPreference || '').toLowerCase()) ||
    'Eat everything';
  const index = Math.max(0, (journeyDay - 1) % 7);
  if (mission.slot === 'course' || mission.label === 'Watch') {
    return { ...mission, label: 'Course' };
  }
  if (mission.slot === 'recipe' || mission.category === 'recipe') {
    return {
      ...mission,
      title: FOOD_RECIPES[key]?.[index] || mission.title,
      label: 'Recipe',
      cue: diet
        ? `Fits your ${diet.toLowerCase()} meals — only what you can eat.`
        : 'A balanced recipe for your training plan.',
    };
  }
  if (mission.slot === 'meal' || mission.category === 'nutrition') {
    return {
      ...mission,
      title: FOOD_MEALS[key]?.[index] || mission.title,
      label: 'Scan',
      cue: diet
        ? `Scan to check calories and whether it fits ${diet.toLowerCase()}.`
        : 'Scan your plate for calories and plan fit.',
    };
  }
  return mission;
}

function DashboardStat({
  icon,
  ionIcon,
  value,
  label,
  accent,
  colors,
}: {
  icon?: keyof typeof Feather.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  accent: string;
  colors: Palette;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: accent + '18' }]}>
        {ionIcon ? (
          <Ionicons name={ionIcon} size={17} color={accent} />
        ) : (
          <Feather name={icon!} size={17} color={accent} />
        )}
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TodayScreen() {
  const colors = useColors();
  const {
    profile,
    missions,
    completeMission,
    skipMission,
    missionsCompleted,
    totalMissions,
    onboardingCompleted,
    syncMissions,
    advanceTestDay,
    startNewPlan,
  } = useApp();
  const { user } = useAuth();
  const { data: catalog } = useCatalog();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  useEffect(() => {
    if (!onboardingCompleted) return;
    if (profile.trainingPlan?.status === 'completed') return;
    syncMissions(catalog);
  }, [
    catalog,
    onboardingCompleted,
    profile.goal,
    profile.fitnessLevel,
    profile.dailyTime,
    profile.foodPreference,
    profile.journeyDay,
    profile.cyclePhase,
    profile.isPregnant,
    profile.trainingPlan?.status,
    syncMissions,
  ]);

  const progress = totalMissions > 0 ? missionsCompleted / totalMissions : 0;
  const levelName = LEVEL_NAMES[profile.level];
  const levelColor = LEVEL_COLORS[profile.level];
  const phaseInfo = CYCLE_PHASE_INFO[profile.cyclePhase] || CYCLE_PHASE_INFO.none;
  const motivational = getTodayMotivational(profile, missionsCompleted, totalMissions);
  const orderedMissions = sortTodayMissions(missions).map((mission) =>
    polishMission(mission, profile.foodPreference, profile.journeyDay)
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 12 ? 'sun' : hour < 17 ? 'sun' : 'moon';
  const greetingColor = hour < 17 ? colors.warmYellow : colors.lavender;
  const headlineName = user?.firstName?.trim() || profile.name.split(' ')[0] || profile.name || 'there';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const progressPct = Math.round(progress * 100);
  const totalDays = planTotalDays(profile.planDurationWeeks || profile.trainingPlan?.durationWeeks);
  const todayDone = missionsCompleted === totalMissions && totalMissions > 0;
  const planFinished =
    profile.trainingPlan?.status === 'completed' ||
    (todayDone && (profile.journeyDay || 1) >= totalDays);
  const missionsLabel =
    totalMissions === 0
      ? 'No missions yet'
      : missionsCompleted === totalMissions
        ? 'All missions complete'
        : `${totalMissions - missionsCompleted} left today`;

  const handleMissionPress = (mission: (typeof missions)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mission.slot === 'exercise' || mission.animation) {
      router.push({
        pathname: '/exercise-guide',
        params: {
          title: mission.title,
          animation: mission.animation || 'flow',
          cue: mission.cue || '',
          duration: String(mission.duration || 10),
          steps: (mission.steps || []).join('|'),
          missionId: mission.id,
        },
      } as never);
      return;
    }
    const href = resolveMissionHref(mission, profile.trainingPlan, catalog);
    router.push(href as never);
  };

  if (planFinished) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.softLavender, colors.background, colors.primary + '18']}
          style={[styles.congratsScreen, { paddingTop: topPad, paddingBottom: botPad + 88 }]}
        >
          <Text style={[styles.congratsKicker, { color: colors.primary }]}>PLAN COMPLETE</Text>
          <View style={[styles.congratsIcon, { backgroundColor: colors.primary }]}>
            <Feather name="award" size={42} color="#FFFFFF" />
          </View>
          <Text style={[styles.congratsTitle, { color: colors.foreground }]}>Congratulations</Text>
          <Text style={[styles.congratsLead, { color: colors.foreground }]}>
            You finished your {profile.planName || 'plan'}.
          </Text>
          <Text style={[styles.congratsBody, { color: colors.mutedForeground }]}>
            Your streak, points, and level stay with you. Start a new plan whenever you’re ready.
          </Text>

          <View style={styles.congratsStats}>
            <View style={[styles.congratsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.congratsStatValue, { color: colors.foreground }]}>{profile.streak}</Text>
              <Text style={[styles.congratsStatLabel, { color: colors.mutedForeground }]}>Streak</Text>
            </View>
            <View style={[styles.congratsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.congratsStatValue, { color: colors.foreground }]}>{profile.points.toLocaleString()}</Text>
              <Text style={[styles.congratsStatLabel, { color: colors.mutedForeground }]}>Points</Text>
            </View>
            <View style={[styles.congratsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.congratsStatValue, { color: colors.foreground }]}>{levelName}</Text>
              <Text style={[styles.congratsStatLabel, { color: colors.mutedForeground }]}>Level {profile.level}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.congratsBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              startNewPlan();
              router.replace('/onboarding');
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.congratsBtnText}>Start a new plan</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
      >
        {/* Header + daily dashboard */}
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.headerGradient, { paddingTop: topPad }]}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCopy}>
            <View style={styles.nameRow}>
              <Text style={[styles.heroName, { color: colors.foreground }]} numberOfLines={1}>
                {headlineName}
              </Text>
              <BellButton />
            </View>
            <View style={styles.heroMetaRow}>
              <Text style={[styles.heroPlan, { color: colors.foreground }]} numberOfLines={1}>
                {profile.planName}
              </Text>
              <View style={[styles.dayPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' }]}>
                <Text style={[styles.dayPillText, { color: colors.primary }]}>Day {profile.journeyDay}</Text>
              </View>
            </View>
            <View style={styles.contextRow}>
              <View style={[styles.greetingIconWrap, { backgroundColor: greetingColor + '20' }]}>
                <Feather name={greetingIcon} size={11} color={greetingColor} />
              </View>
              <Text style={[styles.contextText, { color: colors.mutedForeground }]}>
                {greeting} · {dateLabel}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(130).duration(480)}
            style={[
              styles.dashboardCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...Platform.select({
                  ios: {
                    shadowColor: '#17181C',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.07,
                    shadowRadius: 24,
                  },
                  android: { elevation: 4 },
                  default: {},
                }),
              },
            ]}
          >
            <View style={styles.dashboardTop}>
              <Text style={[styles.dashboardEyebrow, { color: colors.mutedForeground }]}>Today</Text>
              <Text style={[styles.missionCountText, { color: colors.mutedForeground }]}>
                {missionsCompleted}/{totalMissions || 0} complete
              </Text>
            </View>

            <View style={styles.dashboardMain}>
              <ProgressRing
                progress={progress}
                size={112}
                strokeWidth={10}
                color={colors.primary}
                label={`${progressPct}%`}
                sublabel="done"
              />
              <View style={styles.dashboardProgressCopy}>
                <Text style={[styles.dashboardTitle, { color: colors.foreground }]}>
                  {totalMissions > 0 ? `${missionsCompleted} of ${totalMissions} missions` : 'Your day is ready'}
                </Text>
                <Text style={[styles.dashboardSub, { color: colors.mutedForeground }]}>{missionsLabel}</Text>
                <ProgressBar
                  progress={progressPct}
                  color={colors.primary}
                  trackColor={colors.muted}
                  height={6}
                  style={styles.dashboardBar}
                />
              </View>
            </View>

            <View style={[styles.dashboardDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statsGrid}>
              <DashboardStat
                ionIcon="flame"
                value={formatStreakValue(profile.streak)}
                label={formatStreakLabel(profile.streak)}
                accent={colors.warmYellow}
                colors={colors}
              />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <DashboardStat
                icon="award"
                value={levelName}
                label={`Level ${profile.level}`}
                accent={levelColor}
                colors={colors}
              />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <DashboardStat
                icon="star"
                value={(profile.points || 0).toLocaleString()}
                label="Points"
                accent={colors.primary}
                colors={colors}
              />
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.bodyPad}>
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={[styles.quoteRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.quoteMark, { backgroundColor: colors.primary + '14' }]}>
                <Feather name="message-circle" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.quoteText, { color: colors.foreground }]}>{motivational}</Text>
            </View>
          </Animated.View>

          {profile.cyclePhase !== 'none' && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <TouchableOpacity
                style={[styles.cycleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/cycle')}
                activeOpacity={0.8}
              >
                <View style={[styles.cycleIcon, { backgroundColor: phaseInfo.color + '18' }]}>
                  <Feather name="heart" size={14} color={phaseInfo.color} />
                </View>
                <View style={styles.cycleText}>
                  <Text style={[styles.cyclePhase, { color: phaseInfo.color }]}>
                    {phaseInfo.name} · Day {profile.cycleDay}
                  </Text>
                  <Text style={[styles.cycleInsight, { color: colors.mutedForeground }]}>{phaseInfo.insight}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={styles.missionsSection}>
            <View style={styles.missionsSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Missions</Text>
              <View style={[styles.completedBadge, { backgroundColor: missionsCompleted === totalMissions ? colors.mint + '30' : colors.muted }]}>
                <Text style={[styles.completedText, { color: missionsCompleted === totalMissions ? '#2d8a6b' : colors.mutedForeground }]}>
                  {missionsCompleted === totalMissions ? 'Done for today' : `${missionsCompleted}/${totalMissions} done`}
                </Text>
              </View>
            </View>

            {!planFinished ? (
            <TouchableOpacity
              style={[styles.nextDayBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}
              onPress={() => {
                const totalDays = planTotalDays(profile.planDurationWeeks || profile.trainingPlan?.durationWeeks);
                if ((profile.journeyDay || 1) >= totalDays) {
                  Alert.alert('Last day', 'This is the last day of your plan.');
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                advanceTestDay();
              }}
              accessibilityLabel="Next day, testing"
              activeOpacity={0.8}
            >
              <Feather name="fast-forward" size={14} color={colors.primary} />
              <Text style={[styles.nextDayBtnText, { color: colors.primary }]}>Next day · testing</Text>
            </TouchableOpacity>
            ) : null}

            {todayDone ? (
              <View style={[styles.doneCard, { backgroundColor: colors.mint + '18', borderColor: colors.mint + '50' }]}>
                <View style={[styles.doneIcon, { backgroundColor: colors.mint }]}>
                  <Feather name="check" size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.doneTitle, { color: colors.foreground }]}>You did it. Done for today.</Text>
                <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
                  {profile.journeyDay <= 1 && profile.streak <= 1
                    ? `All ${totalMissions} missions complete. Great first day — come back tomorrow to keep building your streak.`
                    : `All ${totalMissions} missions complete. That consistency is how unstoppable confidence is built. Rest well — tomorrow's plan is waiting.`}
                </Text>
              </View>
            ) : null}

            {orderedMissions.map((mission, i) => (
              <Animated.View key={mission.id} entering={FadeInDown.delay(200 + i * 80).duration(400)}>
                <MissionCard
                  mission={mission}
                  onPress={() => handleMissionPress(mission)}
                  onComplete={() => completeMission(mission.id)}
                  onSkip={() => skipMission(mission.id)}
                />
              </Animated.View>
            ))}
          </View>

          {/* AI Coach shortcut */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/coach'); }}
            >
            <LinearGradient
              colors={[colors.deepPink, colors.lavender]}
              style={styles.aiCoachCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.aiCoachContent}>
                <View>
                  <Text style={styles.aiCoachLabel}>AI Coach</Text>
                  <Text style={styles.aiCoachTitle}>Ask me anything</Text>
                  <Text style={styles.aiCoachSub}>Personalized advice, motivation & tips</Text>
                </View>
                <View style={[styles.aiCoachBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Feather name="message-circle" size={22} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  heroCopy: { marginBottom: 10, gap: 8 },
  heroName: {
    flex: 1,
    minWidth: 0,
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  greetingIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroPlan: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  dashboardCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 8,
  },
  dashboardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dashboardEyebrow: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.1,
  },
  missionCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  missionCountText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  dashboardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dashboardProgressCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  dashboardTitle: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 23,
  },
  dashboardSub: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  dashboardBar: { marginTop: 4 },
  dashboardDivider: {
    height: 1,
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  bodyPad: { paddingHorizontal: 22, paddingTop: 16, gap: 12 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  quoteMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quoteText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', lineHeight: 20 },
  cycleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  cycleIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cycleText: { flex: 1, gap: 2 },
  cyclePhase: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.2 },
  cycleInsight: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  missionsSection: { gap: 0, marginTop: 4 },
  missionsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  completedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  nextDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  nextDayBtnText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  completedText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  doneCard: { borderRadius: 18, borderWidth: 1, padding: 18, alignItems: 'center', gap: 8, marginBottom: 14 },
  doneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  doneTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  doneText: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 20, textAlign: 'center' },
  restartBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  restartBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  congratsScreen: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  congratsKicker: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  congratsIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  congratsTitle: {
    fontSize: 34,
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  congratsLead: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
    marginTop: 4,
  },
  congratsBody: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  congratsStats: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginVertical: 8,
  },
  congratsStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  congratsStatValue: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  congratsStatLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  congratsBtn: {
    marginTop: 12,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  congratsBtnText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Manrope_700Bold' },
  aiCoachCard: { borderRadius: 20, padding: 20, marginTop: 4 },
  aiCoachContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiCoachLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Manrope_600SemiBold', marginBottom: 4, letterSpacing: 0.5 },
  aiCoachTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  aiCoachSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  aiCoachBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
});
