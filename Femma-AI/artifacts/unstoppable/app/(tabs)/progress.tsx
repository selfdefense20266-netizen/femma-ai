import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_COLORS, LEVEL_NAMES } from '@/context/AppContext';
import BellButton from '@/components/BellButton';
import { useAuth } from '@/context/AuthContext';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import BadgeCard from '@/components/BadgeCard';
import { useCatalog } from '@/hooks/useCatalog';
import { loadMealScans, type SavedMealScan } from '@/lib/mealScanHistory';
import {
  buildProgressStatCards,
  buildProgressSummary,
  displayPlanName,
  levelProgress,
  planProgressPercent,
  planWeekNumber,
  progressPlanQuote,
} from '@/lib/progressInsights';
import type { CatalogBundle } from '@/lib/catalog';
import { LEVEL_THRESHOLDS } from '@/lib/levels';
import { isTrainingPlanComplete, snapshotPerformance, planTotalDays } from '@/lib/trainingPlan';
import { missionsFromPlanDay, sortTodayMissions } from '@/lib/buildCoursePlan';
import type { Mission } from '@/context/AppContext';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=85';

const EMPTY_CATALOG: CatalogBundle = { categories: [], courses: [] };

type Palette = ReturnType<typeof useColors>;

function calendarWeekday(planDay: number, journeyDay: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + (planDay - Math.max(1, journeyDay)));
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function HeroDecor({ topPad, colors }: { topPad: number; colors: Palette }) {
  return (
    <>
      <View style={[styles.heroBlob, styles.heroBlobPink, { top: topPad + 24, right: -18, backgroundColor: colors.pink + '28' }]} />
      <View style={[styles.heroBlob, styles.heroBlobLavender, { top: topPad + 98, right: 52, backgroundColor: colors.lavender + '30' }]} />
      <View style={[styles.heroBlob, styles.heroBlobMint, { top: topPad + 48, left: -24, backgroundColor: colors.mint + '35' }]} />
      <View style={[styles.heroLeaf, { top: topPad + 72, right: 18 }]}>
        <Feather name="feather" size={42} color={colors.lavender + '55'} />
      </View>
    </>
  );
}

function StatCard({
  icon,
  ionIcon,
  label,
  value,
  sub,
  trend,
  trendUp,
  bg,
  accent,
  width,
  palette,
}: {
  icon?: keyof typeof Feather.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendUp: boolean;
  bg: string;
  accent: string;
  width: number;
  palette: Palette;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, width }]}>
      <View style={[styles.statIconWrap, { backgroundColor: palette.card }]}>
        {ionIcon ? (
          <Ionicons name={ionIcon} size={15} color={accent} />
        ) : (
          <Feather name={icon!} size={15} color={accent} />
        )}
      </View>
      <Text style={[styles.statLabel, { color: palette.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statSub, { color: palette.mutedForeground }]} numberOfLines={1}>
        {sub}
      </Text>
      <View style={styles.statTrendRow}>
        <Feather name={trendUp ? 'arrow-up-right' : 'minus'} size={11} color={accent} />
        <Text style={[styles.statTrend, { color: accent }]} numberOfLines={1}>
          {trend}
        </Text>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { profile, missions, completedLessonIds, lessonWatchProgress, coachChatHistory, activityLog, startNewPlan } = useApp();
  const { data: catalog } = useCatalog();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const topPad = insets.top + 4;
  const botPad = Math.max(insets.bottom, 12);
  const statCardW = Math.floor((screenW - 40 - 16) / 3);

  const [mealScans, setMealScans] = useState<SavedMealScan[]>([]);
  const [selectedDay, setSelectedDay] = useState(profile.journeyDay || 1);

  useEffect(() => {
    setSelectedDay(profile.journeyDay || 1);
  }, [profile.journeyDay]);

  useFocusEffect(
    React.useCallback(() => {
      loadMealScans(user?.email).then(setMealScans);
    }, [user?.email])
  );

  const summary = useMemo(
    () =>
      buildProgressSummary({
        profile,
        missions,
        completedLessonIds,
        lessonWatchProgress,
        catalog: catalog ?? EMPTY_CATALOG,
        mealScanCount: mealScans.length,
        coachMessageCount: coachChatHistory.filter((m) => m.role === 'user').length,
      }),
    [catalog, profile, missions, completedLessonIds, lessonWatchProgress, mealScans.length, coachChatHistory]
  );

  const level = levelProgress(profile);
  const totalWeeks = profile.planDurationWeeks || profile.trainingPlan?.durationWeeks || 8;
  const totalDays = planTotalDays(totalWeeks);
  const planWeek = planWeekNumber(profile.journeyDay, totalWeeks);
  const currentDay = profile.journeyDay || 1;
  const planDays = profile.trainingPlan?.days || [];
  const upcomingDays = (planDays.length
    ? planDays.filter((row) => row.day >= currentDay)
    : Array.from({ length: Math.max(1, totalDays - currentDay + 1) }, (_, index) => {
        const day = currentDay + index;
        const date = new Date();
        date.setDate(date.getDate() + index);
        return {
          day,
          week: Math.ceil(day / 7),
          weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
          items: [],
        };
      })
  ).slice(0, totalDays);
  const selectedMissions = useMemo(() => {
    if (profile.trainingPlan?.days?.length) {
      return sortTodayMissions(missionsFromPlanDay(profile.trainingPlan, selectedDay));
    }
    return selectedDay === (profile.journeyDay || 1) ? sortTodayMissions(missions) : [];
  }, [profile.trainingPlan, profile.journeyDay, missions, selectedDay]);
  const planPercent = planProgressPercent({
    journeyDay: profile.journeyDay,
    missions,
    trainingPlan: profile.trainingPlan,
    durationWeeks: totalWeeks,
  });
  const planName = displayPlanName(profile);
  const planDone = isTrainingPlanComplete(profile);
  const performance = snapshotPerformance({
    profile,
    activityLog,
    completedLessonIds,
    mealScanCount: mealScans.length,
  });

  const statCards = useMemo(
    () =>
      buildProgressStatCards({
        journeyDay: profile.journeyDay,
        activityLog,
        mealScans,
        streak: profile.streak,
        trainingPlan: profile.trainingPlan,
        durationWeeks: totalWeeks,
        missions,
      }),
    [activityLog, mealScans, profile.journeyDay, profile.streak, profile.trainingPlan, totalWeeks, missions]
  );

  const planQuote = progressPlanQuote(summary.missionPercent, planPercent, profile.journeyDay);

  const earnedBadges = summary.badges.filter((b) => b.earned).length;
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : profile.name;
  const avatarInitial = (displayName || 'U')[0]?.toUpperCase() ?? 'U';
  const avatarColor = LEVEL_COLORS[profile.level];

  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.foreground,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    android: { elevation: 3 },
    default: {},
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 96 }}>
        {/* Hero */}
        <View style={[styles.heroWrap, { backgroundColor: colors.softLavender }]}>
          <Image
            source={{ uri: HERO_IMAGE }}
            style={styles.heroImage}
            contentFit="cover"
            contentPosition="right center"
            cachePolicy="memory-disk"
            transition={240}
          />
          {/* Dark overlay on photo */}
          <View style={styles.heroDarkLayer} />
          <LinearGradient
            colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.42)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Soft bottom fade into page background */}
          <LinearGradient
            colors={['transparent', colors.background + 'CC', colors.background]}
            locations={[0.42, 0.82, 1]}
            style={styles.heroFadeBottom}
          />
          <LinearGradient
            colors={[colors.softLavender + 'E6', colors.softLavender + '66', 'transparent']}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0.78, y: 0.65 }}
            style={StyleSheet.absoluteFill}
          />
          <HeroDecor topPad={topPad} colors={colors} />

          <View style={[styles.heroContent, { paddingTop: topPad }]}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                style={styles.heroAvatarBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/(tabs)/profile');
                }}
                accessibilityLabel="Open profile"
              >
                <View style={[styles.heroAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.heroAvatarText}>{avatarInitial}</Text>
                </View>
              </TouchableOpacity>
              <BellButton size={40} />
            </View>

            <View style={styles.heroTitleBlock}>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>Your Progress</Text>
              <View style={styles.heroPlanRow}>
                <Feather name="feather" size={13} color={colors.primary} />
                <Text style={[styles.heroPlanText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {planName}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Plan progress — overlaps hero like reference */}
          <Animated.View entering={FadeInDown.duration(420)} style={[styles.planCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.planRow}>
              <ProgressRing
                progress={planPercent / 100}
                size={116}
                strokeWidth={12}
                color={colors.primary}
                trackColor={colors.primary + '22'}
                label={`${planPercent}%`}
                sublabel="Complete"
                labelColor={colors.foreground}
                sublabelColor={colors.mutedForeground}
              />
              <View style={styles.planCopy}>
                <Text style={[styles.planTitle, { color: colors.foreground }]}>Plan Progress</Text>
                <Text style={[styles.planQuote, { color: colors.mutedForeground }]}>{planQuote}</Text>
                <View style={styles.weekRow}>
                  <Feather name="calendar" size={12} color={colors.primary} />
                  <Text style={[styles.weekText, { color: colors.foreground }]}>
                    Day {profile.journeyDay} of {totalDays} · Week {planWeek} of {totalWeeks}
                  </Text>
                </View>
                <ProgressBar progress={planPercent} color={colors.primary} trackColor={colors.muted} height={5} />
              </View>
            </View>
          </Animated.View>

          {upcomingDays.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(30).duration(420)} style={[styles.planCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.planTitle, { color: colors.foreground }]}>Upcoming days</Text>
              <Text style={[styles.planQuote, { color: colors.mutedForeground }]}>
                Tap a day to see tomorrow’s exercises, the day after, and the rest of your plan.
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayStrip}
              >
                {upcomingDays.map((row) => {
                  const active = row.day === selectedDay;
                  const offset = row.day - currentDay;
                  const caption = offset === 0 ? 'Today' : offset === 1 ? 'Tmrw' : `Day ${row.day}`;
                  const weekday = calendarWeekday(row.day, currentDay);
                  return (
                    <TouchableOpacity
                      key={row.day}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: active ? colors.primary : colors.muted,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedDay(row.day);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayChipCaption, { color: active ? '#FFFFFF' : colors.mutedForeground }]}>
                        {caption}
                      </Text>
                      <Text style={[styles.dayChipWeekday, { color: active ? 'rgba(255,255,255,0.85)' : colors.foreground }]}>
                        {weekday}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.scheduleHeading, { color: colors.foreground }]}>
                {selectedDay === currentDay
                  ? 'Today'
                  : selectedDay === currentDay + 1
                    ? 'Tomorrow'
                    : `Day ${selectedDay}`}
                {` · ${calendarWeekday(selectedDay, currentDay)}`}
              </Text>
              {selectedMissions.length === 0 ? (
                <Text style={[styles.planQuote, { color: colors.mutedForeground }]}>No tasks saved for this day yet.</Text>
              ) : (
                selectedMissions.map((item: Mission) => {
                  const icon = (Feather.glyphMap as Record<string, number>)[item.icon] ? item.icon : 'circle';
                  return (
                    <View key={item.id} style={[styles.scheduleRow, { borderColor: colors.border }]}>
                      <View style={[styles.scheduleIcon, { backgroundColor: (item.accentColor || colors.primary) + '18' }]}>
                        <Feather name={icon as never} size={16} color={item.accentColor || colors.primary} />
                      </View>
                      <View style={styles.scheduleCopy}>
                        <Text style={[styles.scheduleLabel, { color: item.accentColor || colors.primary }]}>
                          {item.label || (item.slot === 'exercise' ? 'Exercise' : item.category)}
                        </Text>
                        <Text style={[styles.scheduleTitle, { color: colors.foreground }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                      {item.duration > 0 ? (
                        <Text style={[styles.scheduleMins, { color: colors.mutedForeground }]}>{item.duration} min</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </Animated.View>
          ) : null}

          {planDone ? (
            <Animated.View entering={FadeInDown.delay(40).duration(420)} style={[styles.planCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Text style={[styles.planTitle, { color: colors.foreground }]}>Course complete</Text>
              <Text style={[styles.planQuote, { color: colors.mutedForeground }]}>
                You finished your {totalWeeks}-week {planName.toLowerCase()}. Here’s how you did — pick a new focus whenever you’re ready.
              </Text>
              <View style={styles.statRow}>
                {[
                  { label: 'Workouts', value: String(performance.workouts) },
                  { label: 'Lessons', value: String(performance.lessons) },
                  { label: 'Scans', value: String(performance.scans) },
                ].map((item) => (
                  <View key={item.label} style={{ flex: 1 }}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{item.value}</Text>
                    <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={{ height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startNewPlan();
                  router.push('/onboarding');
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' }}>Start a new plan</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          {/* Stat cards — fixed equal widths */}
          <Animated.View entering={FadeInDown.delay(60).duration(420)} style={styles.statRow}>
            <StatCard
              ionIcon="flame-outline"
              label="Workouts"
              value={statCards.workouts.value}
              sub={statCards.workouts.sub}
              trend={statCards.workouts.trend}
              trendUp={statCards.workouts.trendUp}
              bg={colors.mint + '40'}
              accent={LEVEL_COLORS[1]}
              width={statCardW}
              palette={colors}
            />
            <StatCard
              icon="activity"
              label="Strength"
              value={statCards.strength.value}
              sub={statCards.strength.sub}
              trend={statCards.strength.trend}
              trendUp={statCards.strength.trendUp}
              bg={colors.skyBlue + '30'}
              accent={colors.skyBlue}
              width={statCardW}
              palette={colors}
            />
            <StatCard
              icon="coffee"
              label="Nutrition"
              value={statCards.nutrition.value}
              sub={statCards.nutrition.sub}
              trend={statCards.nutrition.trend}
              trendUp={statCards.nutrition.trendUp}
              bg={colors.coral + '28'}
              accent={colors.coral}
              width={statCardW}
              palette={colors}
            />
          </Animated.View>

          {/* Compact level row */}
          <Animated.View entering={FadeInDown.delay(160).duration(420)} style={[styles.levelRow, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.levelIcon, { backgroundColor: LEVEL_COLORS[profile.level] + '22' }]}>
              <Feather name="award" size={16} color={LEVEL_COLORS[profile.level]} />
            </View>
            <View style={styles.levelCopy}>
              <Text style={[styles.levelTitle, { color: colors.foreground }]}>
                Level {profile.level} · {level.levelName}
              </Text>
              <Text style={[styles.levelSub, { color: colors.mutedForeground }]}>
                {profile.points.toLocaleString()} points
                {profile.level < 5 ? ` · ${level.pointsToNext.toLocaleString()} to ${level.nextLevelName}` : ''}
              </Text>
            </View>
            <Text style={[styles.levelPct, { color: colors.primary }]}>
              {profile.level >= 5 ? 'MAX' : `${Math.round(level.percent * 100)}%`}
            </Text>
          </Animated.View>

          {/* Learning paths */}
          {summary.categories.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(420)}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Learning paths</Text>
              <View style={styles.pathList}>
                {summary.categories.map((cat) => (
                  <View key={cat.id} style={[styles.pathCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.pathTop}>
                      <View style={[styles.pathIcon, { backgroundColor: cat.color + '18' }]}>
                        <Feather name={cat.icon as keyof typeof Feather.glyphMap} size={16} color={cat.color} />
                      </View>
                      <View style={styles.pathCopy}>
                        <Text style={[styles.pathName, { color: colors.foreground }]}>{cat.label}</Text>
                        <Text style={[styles.pathMeta, { color: colors.mutedForeground }]}>
                          {cat.completed}/{cat.total} lessons
                        </Text>
                      </View>
                      <Text style={[styles.pathPct, { color: cat.color }]}>{cat.percent}%</Text>
                    </View>
                    <ProgressBar progress={cat.percent} color={cat.color} trackColor={colors.muted} height={4} />
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Achievements */}
          <Animated.View entering={FadeInDown.delay(240).duration(420)}>
            <View style={styles.badgesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
              <Text style={[styles.badgesCount, { color: colors.mutedForeground }]}>{earnedBadges} earned</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.badgesRow}
            >
              {summary.badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Level journey */}
          <Animated.View entering={FadeInDown.delay(280).duration(420)} style={[styles.journeyCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.journeyHeader}>
              <View style={styles.journeyHeaderCopy}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Level journey</Text>
                <Text style={[styles.journeyCurrent, { color: colors.foreground }]}>
                  Level {profile.level} · {LEVEL_NAMES[profile.level]}
                </Text>
              </View>
              <View style={[styles.journeyPointsPill, { backgroundColor: LEVEL_COLORS[profile.level] + '18' }]}>
                <Feather name="star" size={13} color={LEVEL_COLORS[profile.level]} />
                <Text style={[styles.journeyPointsValue, { color: LEVEL_COLORS[profile.level] }]}>
                  {(profile.points || 0).toLocaleString()}
                </Text>
                <Text style={[styles.journeyPointsUnit, { color: LEVEL_COLORS[profile.level] }]}>pts</Text>
              </View>
            </View>
            <View style={styles.journeyProgress}>
              <ProgressBar
                progress={profile.level >= 5 ? 100 : Math.round(level.percent * 100)}
                color={LEVEL_COLORS[profile.level]}
                trackColor={colors.muted}
                height={6}
              />
              <Text style={[styles.journeyNext, { color: colors.mutedForeground }]}>
                {profile.level >= 5
                  ? 'Max level reached'
                  : `${level.pointsToNext.toLocaleString()} more to ${level.nextLevelName}`}
              </Text>
            </View>
            <View style={styles.journeyTrack}>
              {([1, 2, 3, 4, 5] as const).map((lvl) => {
                const active = lvl <= profile.level;
                const current = lvl === profile.level;
                return (
                  <View key={lvl} style={styles.journeyStep}>
                    <View
                      style={[
                        styles.journeyDot,
                        {
                          backgroundColor: active ? LEVEL_COLORS[lvl] : colors.muted,
                          borderWidth: current ? 2 : 0,
                          borderColor: LEVEL_COLORS[lvl],
                        },
                      ]}
                    >
                      {active && lvl < profile.level ? (
                        <Feather name="check" size={11} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.journeyNum, { color: active ? '#FFFFFF' : colors.mutedForeground }]}>{lvl}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.journeyLabel,
                        { color: current ? colors.foreground : active ? colors.foreground : colors.mutedForeground },
                        current ? styles.journeyLabelCurrent : null,
                      ]}
                      numberOfLines={1}
                    >
                      {LEVEL_NAMES[lvl]}
                    </Text>
                    <Text style={[styles.journeyPts, { color: current ? LEVEL_COLORS[lvl] : colors.mutedForeground }]}>
                      {lvl === 1 ? '0' : `${LEVEL_THRESHOLDS[lvl].toLocaleString()}+`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroWrap: {
    height: 286,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  heroFadeBottom: {
    ...StyleSheet.absoluteFillObject,
  },
  heroDarkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  heroBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroBlobPink: {
    width: 118,
    height: 118,
  },
  heroBlobLavender: {
    width: 76,
    height: 76,
  },
  heroBlobMint: {
    width: 62,
    height: 62,
  },
  heroLeaf: {
    position: 'absolute',
    transform: [{ rotate: '18deg' }],
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 36,
    zIndex: 2,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroAvatarBtn: {
    ...Platform.select({
      ios: {
        shadowColor: '#17181C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  heroAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  heroAvatarText: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#17181C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  heroNotifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroTitleBlock: { gap: 6, zIndex: 3, marginBottom: 10 },
  heroTitle: {
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 38,
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
  },
  heroPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroPlanText: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium' },
  body: { paddingHorizontal: 20, gap: 14, marginTop: -22 },
  planCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planCopy: { flex: 1, minWidth: 0, gap: 7 },
  planTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
  planQuote: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 17 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  weekText: { fontSize: 11.5, fontFamily: 'Manrope_600SemiBold' },
  dayStrip: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  dayChip: {
    minWidth: 62,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayChipCaption: { fontSize: 11, fontFamily: 'Manrope_700Bold' },
  dayChipWeekday: { fontSize: 10, fontFamily: 'Manrope_500Medium' },
  scheduleHeading: { fontSize: 14, fontFamily: 'Manrope_700Bold', marginTop: 6 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  scheduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleCopy: { flex: 1, minWidth: 0, gap: 2 },
  scheduleLabel: { fontSize: 10, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  scheduleTitle: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  scheduleMins: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  statRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  statCard: {
    borderRadius: 16,
    padding: 10,
    minHeight: 118,
    gap: 2,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: { fontSize: 10.5, fontFamily: 'Manrope_500Medium' },
  statValue: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', lineHeight: 22 },
  statSub: { fontSize: 10, fontFamily: 'Manrope_500Medium' },
  statTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 'auto', paddingTop: 4 },
  statTrend: { fontSize: 9.5, fontFamily: 'Manrope_700Bold', flex: 1 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  levelIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelCopy: { flex: 1, minWidth: 0 },
  levelTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  levelSub: { fontSize: 11, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  levelPct: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', marginBottom: 10 },
  pathList: { gap: 8 },
  pathCard: { borderRadius: 16, padding: 12, gap: 8, borderWidth: 1 },
  pathTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pathIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pathCopy: { flex: 1, minWidth: 0 },
  pathName: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  pathMeta: { fontSize: 10.5, fontFamily: 'Manrope_400Regular', marginTop: 1 },
  pathPct: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgesCount: { fontSize: 11.5, fontFamily: 'Manrope_500Medium' },
  badgesRow: { gap: 10, paddingBottom: 4 },
  journeyCard: { borderRadius: 20, padding: 16, gap: 14, borderWidth: 1 },
  journeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  journeyHeaderCopy: { flex: 1, minWidth: 0, gap: 2 },
  journeyCurrent: { fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: 2 },
  journeyPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  journeyPointsValue: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  journeyPointsUnit: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  journeyProgress: { gap: 6 },
  journeyNext: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  journeyTrack: { flexDirection: 'row', justifyContent: 'space-between' },
  journeyStep: { alignItems: 'center', gap: 4, flex: 1 },
  journeyDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNum: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  journeyLabel: { fontSize: 8.5, fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
  journeyLabelCurrent: { fontFamily: 'Manrope_800ExtraBold' },
  journeyPts: { fontSize: 8, fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
});
